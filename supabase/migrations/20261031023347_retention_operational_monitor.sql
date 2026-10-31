-- Aggregate operational telemetry only. Never purges legal receipts.
begin;
create extension if not exists pg_cron;
create schema operations_private;
revoke all on schema operations_private from public, anon, authenticated;

create table operations_private.retention_samples (
  sampled_at timestamptz primary key default clock_timestamp(),
  eligible bigint not null check (eligible >= 0),
  held bigint not null check (held >= 0),
  expired_holds bigint not null check (expired_holds >= 0)
);
alter table operations_private.retention_samples enable row level security;
revoke all on operations_private.retention_samples from public, anon, authenticated;

create function operations_private.capture_retention_health() returns void
language plpgsql security invoker set search_path = '' set lock_timeout = '3s' as $$
declare v_eligible bigint; v_held bigint; v_expired bigint;
begin
  select count(*) filter (where retention_until <= now() and
      (legal_hold_until is null or legal_hold_until <= now())),
    count(*) filter (where legal_hold_until > now()),
    count(*) filter (where legal_hold_until <= now())
  into v_eligible, v_held, v_expired
  from legal_private.terms_acceptances where user_id is null;

  insert into operations_private.retention_samples(eligible, held, expired_holds)
    values (v_eligible, v_held, v_expired);
  -- Thirty days applies only to this job's anonymous telemetry, not receipts,
  -- backups, legal bases, or an external deletion ledger.
  delete from operations_private.retention_samples
    where sampled_at < now() - interval '30 days';
  delete from cron.job_run_details where jobid in
    (select jobid from cron.job where jobname = 'garagem-retention-monitor')
    and end_time < now() - interval '30 days';
  if v_eligible > 0 or v_expired > 0 then
    raise warning 'garagem_retention_review_required: eligible=%, expired_holds=%', v_eligible, v_expired;
  end if;
end;
$$;
revoke all on function operations_private.capture_retention_health()
  from public, anon, authenticated;

create view operations_private.retention_health with (security_invoker = true) as
with latest as (
  select * from operations_private.retention_samples order by sampled_at desc limit 1
), last_run as (
  select d.status, d.end_time from cron.job_run_details d
  join cron.job j using (jobid) where j.jobname = 'garagem-retention-monitor'
  order by d.start_time desc limit 1
)
select l.sampled_at, l.eligible, l.held, l.expired_holds,
  case when l.sampled_at is null or l.sampled_at < now() - interval '90 minutes' then 'stale'
    when not exists(select 1 from cron.job where jobname = 'garagem-retention-monitor' and active) then 'disabled'
    when r.status = 'failed' then 'failed'
    when l.eligible > 0 or l.expired_holds > 0 then 'attention'
    else 'healthy' end as status,
  r.status as last_cron_status
from (values (1)) singleton(n)
left join latest l on true left join last_run r on true;
revoke all on operations_private.retention_health from public, anon, authenticated;

select cron.schedule('garagem-retention-monitor', '0 * * * *',
  'set statement_timeout = ''15s''; select operations_private.capture_retention_health();');
select operations_private.capture_retention_health();
commit;
