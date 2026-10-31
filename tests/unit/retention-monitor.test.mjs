import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { URL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

test('retention monitor preserves receipts, isolates telemetry and limits its own history', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema legal_private;
      create table legal_private.terms_acceptances(user_id uuid, retention_until timestamptz, legal_hold_until timestamptz);
      insert into legal_private.terms_acceptances values
        (null, now()-interval '1 day', null),
        (null, now()-interval '1 day', now()+interval '1 day'),
        (null, now()-interval '1 day', now()-interval '1 hour'),
        (null, now()+interval '1 day', null);
      -- Local stub for the scheduler interface; hosted pg_cron is verified separately.
      create schema cron;
      create table cron.job(jobid bigint generated always as identity primary key,
        jobname text unique, schedule text, command text, active boolean default true);
      create table cron.job_run_details(jobid bigint, status text, start_time timestamptz, end_time timestamptz);
      create function cron.schedule(text,text,text) returns bigint language sql as $$
        insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid;
      $$;
    `);
    const sql = fs.readFileSync(new URL('../../supabase/migrations/20261031023347_retention_operational_monitor.sql', import.meta.url), 'utf8');
    await db.exec(sql.replace('create extension if not exists pg_cron;', ''));
    const read = async q => (await db.query(q)).rows;
    const before = await read('select * from legal_private.terms_acceptances');
    const [health] = await read('select * from operations_private.retention_health');
    assert.equal(Number(health.eligible), 2);
    assert.equal(Number(health.held), 1);
    assert.equal(Number(health.expired_holds), 1);
    assert.equal(health.status, 'attention');
    await db.exec(`
      insert into operations_private.retention_samples values(now()-interval '31 days',0,0,0);
      insert into cron.job(jobname,schedule,command) values('unrelated','0 * * * *','select 1');
      insert into cron.job_run_details select jobid,'succeeded',now()-interval '31 days',now()-interval '31 days' from cron.job;
      select operations_private.capture_retention_health();
    `);
    assert.deepEqual(await read('select * from legal_private.terms_acceptances'), before);
    assert.equal((await read("select * from operations_private.retention_samples where sampled_at<now()-interval '30 days'")).length, 0);
    assert.equal((await read('select * from cron.job_run_details')).length, 1);
    await db.exec("insert into cron.job_run_details select jobid,'failed',now(),now() from cron.job where jobname='garagem-retention-monitor'");
    assert.equal((await read('select status from operations_private.retention_health'))[0].status, 'failed');
    await db.exec("update cron.job set active=false where jobname='garagem-retention-monitor'");
    assert.equal((await read('select status from operations_private.retention_health'))[0].status, 'disabled');
    await db.exec("update operations_private.retention_samples set sampled_at=sampled_at-interval '2 hours'");
    assert.equal((await read('select status from operations_private.retention_health'))[0].status, 'stale');
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from operations_private.retention_samples'), /permission denied/);
      await assert.rejects(db.query('select operations_private.capture_retention_health()'), /permission denied/);
      await db.exec('reset role');
    }
  } finally { await db.close(); }
});
