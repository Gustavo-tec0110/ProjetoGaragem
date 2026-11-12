import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers';

// Called only after the disposable bootstrap; each client is an independent PG backend.
export async function testNotificationConcurrency(db, check) {
  const A = 'a1111111-1111-4111-8111-111111111111';
  const B = 'b2222222-2222-4222-8222-222222222222';
  const D = 'd3333333-3333-4333-8333-333333333333';
  const C = 'c4444444-4444-4444-8444-444444444444';
  await db.exec(`reset role;
    insert into auth.users(id,email) values ('${A}','race-a@example.invalid'),('${B}','race-b@example.invalid'),('${D}','race-d@example.invalid');
    insert into legal_private.terms_acceptances(user_id,terms_version,privacy_version)
      select id,'terms-v1','privacy-v1' from auth.users where id in ('${A}','${B}','${D}');
    insert into cars(id,owner_id,slug,name,brand,model,year,category,is_public)
      values ('${C}','${A}','concurrency-fixture','Race fixture','VW','Gol',2000,'Projeto',true);
    insert into project_follows(car_id,user_id) values ('${C}','${B}'),('${C}','${D}');
    insert into car_build_updates(car_id,title) select '${C}','race '||n from generate_series(0,45) n;
  `);
  const clients = await Promise.all(Array.from({ length: 16 }, () => db.connect()));
  const lock = await db.connect();
  try {
    for (const client of clients) {
      await client.query("select set_config('request.jwt.claim.sub',$1,false)", [A]);
      await client.query('set role authenticated');
    }
    const call = async (client, title, recipient = B) => (await client.query(
      "select create_notification($1,'project_update',$2,'Update',$3,false) as id", [recipient,C,title]
    )).rows[0].id;
    await check('native: 16 independent sessions deduplicate the same event', async () => {
      const pids = await Promise.all(clients.map(c => c.query('select pg_backend_pid() as pid')));
      assert.equal(new Set(pids.map(r => r.rows[0].pid)).size, 16);
      const ids = await Promise.all(clients.map(c => call(c,'race 0')));
      assert.ok(ids[0]); assert.equal(new Set(ids).size, 1);
      assert.equal(Number((await db.query('select count(*) n from notifications where actor_id=$1 and user_id=$2',[A,B])).rows[0].n),1);
      return { independentBackends: 16, notifications: 1 };
    });
    await check('native: dismissed inbox entry does not allow replay', async () => {
      const original = await call(clients[0],'race 0');
      await db.query('delete from notifications where id=$1',[original]);
      assert.equal(await call(clients[1],'race 0'),original);
      assert.equal(Number((await db.query('select count(*) n from notifications where id=$1',[original])).rows[0].n),0);
    });
    await check('native: a blocked pair does not block another recipient', async () => {
      await lock.query('begin');
      await lock.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`${A}:${B}`]);
      try { assert.ok(await call(clients[1],'race 0',D)); }
      finally { await lock.query('rollback'); }
    });
    await check('native: authorization is checked after waiting for a transaction lock', async () => {
      await lock.query('begin');
      await lock.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`${A}:${B}`]);
      const pid = (await clients[0].query('select pg_backend_pid() pid')).rows[0].pid;
      const pending = call(clients[0],'race 1').then(id=>({id}),error=>({error}));
      try {
        let blocked = false;
        for (let i=0;i<100;i++) {
          const row = (await db.query('select wait_event from pg_stat_activity where pid=$1',[pid])).rows[0];
          if (row?.wait_event === 'advisory') { blocked=true; break; }
          await new Promise(resolve=>setTimeout(resolve,10));
        }
        assert.ok(blocked,'second connection must really wait for the advisory lock');
        await db.query('update cars set is_public=false where id=$1',[C]);
      } finally { await lock.query('rollback'); }
      const result = await pending;
      await db.query('update cars set is_public=true where id=$1',[C]);
      assert.equal(result.error?.message,'invalid_notification_context', 'privacy revoked during wait must prevent delivery');
    });
    await check('native: insertion failure rolls back receipt and permits retry', async () => {
      await db.exec(`create function public.fixture_notification_failure() returns trigger language plpgsql as $$
        begin if new.body='race 2' then raise exception 'fixture_delivery_failure'; end if; return new; end $$;
        create trigger fixture_delivery_failure before insert on notifications for each row execute function public.fixture_notification_failure();`);
      try { await assert.rejects(call(clients[0],'race 2'),/fixture_delivery_failure/); }
      finally { await db.exec('drop trigger fixture_delivery_failure on notifications; drop function public.fixture_notification_failure()'); }
      assert.equal(Number((await db.query("select count(*) n from notification_event_receipts where actor_id=$1 and event_key like '%race 2:%'",[A])).rows[0].n),0);
      assert.ok(await call(clients[0],'race 2'));
    });
    await check('native: concurrent distinct events enforce the pair quota exactly', async () => {
      // Reset only this test pair's discarded fixtures to give a known quota baseline.
      await db.query('delete from notifications where actor_id=$1 and user_id=$2',[A,B]);
      await db.query('delete from notification_event_receipts where actor_id=$1 and recipient_id=$2',[A,B]);
      const ids=[];
      await Promise.all(clients.map(async (client, worker) => {
        for(let n=worker;n<46;n+=clients.length) ids.push(await call(client,`race ${n}`));
      }));
      assert.equal(ids.filter(Boolean).length,30);
      assert.equal(new Set(ids.filter(Boolean)).size,30);
      assert.equal(Number((await db.query('select count(*) n from notification_event_receipts where actor_id=$1 and recipient_id=$2',[A,B])).rows[0].n),30);
      return { attempted:46, inserted:30, refusedByQuota:16 };
    });
  } finally {
    await lock.query('rollback');
    await Promise.all([...clients,lock].map(c=>c.end()));
  }
}
