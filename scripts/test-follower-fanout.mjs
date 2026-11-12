import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

export async function testFollowerFanout(db, check, output) {
  const A='a6000000-0000-4000-8000-000000000000',C='c6000000-0000-4000-8000-000000000000';
  const newDefinition=(await db.query("select pg_get_functiondef('public.save_car_project_atomic(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure) definition")).rows[0].definition;
  await db.exec(`reset role; insert into auth.users(id,email) values ('${A}','fanout-owner@example.invalid');
    insert into legal_private.terms_acceptances(user_id,terms_version,privacy_version) values ('${A}','terms-v1','privacy-v1');
    insert into cars(id,owner_id,slug,name,brand,model,year,category,is_public)
      values ('${C}','${A}','fanout-fixture','Fanout fixture','VW','Gol',2000,'Projeto',true);
    insert into auth.users(id,email)
      select ('b6000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'fanout-'||n||'@example.invalid' from generate_series(1,120) n;
    insert into project_follows(car_id,user_id)
      select '${C}',id from profiles where id::text like 'b6000000-%';`);
  const writer=await db.connect(),readers=await Promise.all(Array.from({length:16},()=>db.connect()));
  const rows=[];let updates=[];let saveRpc='save_car_project_atomic';
  async function save(name,nextUpdates=updates) {
    return writer.query(`select * from ${saveRpc}($1,$2,'[]','[]',$3,'[]')`,[C,{name},JSON.stringify(nextUpdates)]);
  }
  const add=title=>({title,happened_at:'2026-10-31',category:'outro'});
  try {
    for(const client of [writer,...readers]) {
      await client.query("select set_config('request.jwt.claim.sub',$1,false)",[A]);await client.query('set role authenticated');
    }
    await check('PERF-06: compare awaited fan-out with one transactional RPC, 120 followers',async()=>{
      for(const mode of ['before','after']) {
        saveRpc=mode==='before'?'save_car_project_atomic':'save_car_project_with_notifications';
        await db.exec(mode==='before'?db.previousAtomicDefinition:newDefinition);
        for(let run=1;run<=3;run++) {
          const title=`${mode} evolution ${run}`;updates.push(add(title));
          const start=performance.now();
          if(mode==='before') await db.query('select title,happened_at from car_build_updates where car_id=$1',[C]);
          await save(`Fanout ${mode} ${run}`);
          if(mode==='before') {
            const recipients=(await db.query('select user_id from project_follows where car_id=$1 order by user_id',[C])).rows;
            await Promise.all(readers.map(async(client,index)=>{
              for(let i=index;i<recipients.length;i+=readers.length)
                await client.query("select create_notification($1,'project_update',$2,'Evolution',$3,false)",[recipients[i].user_id,C,title]);
            }));
          }
          const durationMs=performance.now()-start;
          const delivered=Number((await db.query('select count(*) n from notifications where car_id=$1 and body=$2',[C,title])).rows[0].n);
          assert.equal(delivered,120);
          rows.push({mode,run,recipients:120,durationMs,applicationRoundTrips:mode==='before'?123:1,delivered});
        }
      }
    });
    await check('PERF-06: receipt deduplication survives re-saving/recreated update IDs',async()=>{
      const before=(await db.query('select count(*) n from notifications where car_id=$1',[C])).rows[0].n;
      await save('Same events');
      assert.equal((await db.query('select count(*) n from notifications where car_id=$1',[C])).rows[0].n,before);
    });
    await check('PERF-06: partial recipient failure rolls back project, updates, receipts and deliveries',async()=>{
      const before=(await db.query('select name from cars where id=$1',[C])).rows[0].name;
      const count=(await db.query('select count(*) n from notification_event_receipts where actor_id=$1',[A])).rows[0].n;
      await db.exec(`create function public.fixture_fanout_failure() returns trigger language plpgsql as $$
        begin if new.body='partial failure' and new.user_id='b6000000-0000-4000-8000-000000000060'::uuid then raise exception 'fixture_partial_failure'; end if; return new; end $$;
        create trigger fixture_fanout_failure before insert on notifications for each row execute function public.fixture_fanout_failure();`);
      const next=[...updates,add('partial failure')];
      try {await assert.rejects(save('Must roll back',next),/fixture_partial_failure/);}
      finally {await db.exec('drop trigger fixture_fanout_failure on notifications; drop function public.fixture_fanout_failure()');}
      assert.equal((await db.query('select name from cars where id=$1',[C])).rows[0].name,before);
      assert.equal((await db.query('select count(*) n from notification_event_receipts where actor_id=$1',[A])).rows[0].n,count);
      assert.equal(Number((await db.query("select count(*) n from car_build_updates where car_id=$1 and title='partial failure'",[C])).rows[0].n),0);
      await save('Retried safely',next);updates=next;
      assert.equal(Number((await db.query("select count(*) n from notifications where car_id=$1 and body='partial failure'",[C])).rows[0].n),120);
    });
    await check('PERF-06: two evolutions saved together both notify followers',async()=>{
      updates.push(add('batch evolution A'),add('batch evolution B'));await save('Two evolutions');
      for(const title of ['batch evolution A','batch evolution B'])assert.equal(Number((await db.query('select count(*) n from notifications where car_id=$1 and body=$2',[C,title])).rows[0].n),120);
    });
    await check('PERF-06: equal titles on different dates remain distinct events',async()=>{
      updates.push({...add('Recurring evolution'),happened_at:'2026-10-29'},add('Recurring evolution'));
      await save('Recurring evolution dates');
      assert.equal(Number((await db.query("select count(*) n from notifications where car_id=$1 and body='Recurring evolution'",[C])).rows[0].n),240);
    });
    await check('PERF-06: private edit creates no notifications',async()=>{
      await db.query('update cars set is_public=false where id=$1',[C]);
      updates.push(add('private evolution'));await save('Private evolution');
      assert.equal(Number((await db.query("select count(*) n from notifications where car_id=$1 and body='private evolution'",[C])).rows[0].n),0);
      await db.query('update cars set is_public=true where id=$1',[C]);
    });
    await check('PERF-06: full fan-out reaches 1005 followers without HTTP result truncation',async()=>{
      await db.exec(`insert into auth.users(id,email)
        select ('b6000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'fanout-'||n||'@example.invalid' from generate_series(121,1005) n;
        insert into project_follows(car_id,user_id)
          select '${C}',id from profiles where id::text like 'b6000000-%' and not exists(
            select 1 from project_follows f where f.car_id='${C}' and f.user_id=profiles.id);`);
      updates.push(add('large fanout'));const start=performance.now();await save('Large fanout');
      const delivered=Number((await db.query("select count(*) n from notifications where car_id=$1 and body='large fanout'",[C])).rows[0].n);
      assert.equal(delivered,1005);rows.push({mode:'after-scale',recipients:1005,durationMs:performance.now()-start,applicationRoundTrips:1,delivered});
      return rows.at(-1);
    });
  } finally {
    await db.exec(newDefinition);
    await Promise.all([writer,...readers].map(c=>c.end()));
    fs.writeFileSync(output+'/notificacoes-fanout.json',JSON.stringify({environment:'native PostgreSQL, UNIX socket, synthetic users; before has 16 concurrent RPC sessions; no simulated WAN latency',rows},null,2)+'\n');
  }
}
