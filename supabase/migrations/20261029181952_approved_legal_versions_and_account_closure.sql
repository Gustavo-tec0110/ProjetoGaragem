-- Local preparation only. Owner approved document identifiers on 2026-10-29.
-- The ordinary five-year maximum is a PROPOSED retention policy, subject to legal
-- validation. No legal basis is fabricated: account deletion erases records by
-- default unless a trusted administrator explicitly documents a necessary basis.
begin;
alter table legal_private.document_versions
  add column terms_sha256 text check (terms_sha256 is null or terms_sha256 ~ '^[0-9a-f]{64}$'),
  add column privacy_sha256 text check (privacy_sha256 is null or privacy_sha256 ~ '^[0-9a-f]{64}$');
update legal_private.document_versions set is_current=false where is_current;
insert into legal_private.document_versions(terms_version,privacy_version,is_current,approved,terms_sha256,privacy_sha256)
values('terms-v1','privacy-v1',true,true,
  '5dca42de5535df159ac261e030a5f90c5008bcac940f84b542954f858b8c706e',
  '5ff4de04c16a71120abfb6ba934ca39813c3393431ce5afbd1e54266421f4ab5');

alter table legal_private.terms_acceptances
  add column id uuid not null default gen_random_uuid(),
  add column account_closed_at timestamptz,
  add column retention_until timestamptz,
  add column retention_basis text check (retention_basis in ('legal_obligation','legal_claims')),
  add column legal_hold_until timestamptz,
  add column legal_hold_reason text;
alter table legal_private.terms_acceptances drop constraint terms_acceptances_pkey;
alter table legal_private.terms_acceptances alter column user_id drop not null;
alter table legal_private.terms_acceptances add primary key(id);
alter table legal_private.terms_acceptances add unique(user_id,terms_version,privacy_version);
alter table legal_private.terms_acceptances drop constraint terms_acceptances_user_id_fkey;
alter table legal_private.terms_acceptances add constraint terms_acceptances_user_id_fkey
  foreign key(user_id) references auth.users(id) on delete set null;
alter table legal_private.terms_acceptances add constraint closure_retention_consistent check (
  (user_id is not null and account_closed_at is null and retention_until is null)
  or
  (user_id is null and account_closed_at is not null and retention_until is not null
    and retention_basis is not null and accepted_at <= account_closed_at
    and retention_until >= account_closed_at and retention_until <= account_closed_at + interval '5 years')
);
alter table legal_private.terms_acceptances add constraint documented_legal_hold check (
  (legal_hold_until is null and legal_hold_reason is null)
  or (legal_hold_until is not null and isfinite(legal_hold_until) and legal_hold_reason is not null and length(trim(legal_hold_reason)) between 1 and 500)
);
create index closed_terms_expiry on legal_private.terms_acceptances(retention_until) where user_id is null;

create function legal_private.detach_terms_on_account_delete() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_closed_at timestamptz := clock_timestamp();
begin
  -- No justification recorded by an authorized administrator: erase, do not
  -- automatically keep personal history for five years just because we can.
  delete from legal_private.terms_acceptances where user_id=old.id and retention_basis is null;
  update legal_private.terms_acceptances set user_id=null,
    account_closed_at=v_closed_at, retention_until=v_closed_at + interval '5 years'
    where user_id=old.id and retention_basis is not null;
  return old;
end;
$$;
revoke all on function legal_private.detach_terms_on_account_delete() from public,anon,authenticated;
create trigger detach_terms_on_account_delete before delete on auth.users
  for each row execute function legal_private.detach_terms_on_account_delete();

create function legal_private.purge_expired_terms_acceptances(p_limit integer default 1000) returns integer
language plpgsql security definer set search_path='' as $$
declare v_deleted integer;
begin
  if p_limit is null or p_limit < 1 or p_limit > 10000 then
    raise exception using errcode='22023', message='invalid_purge_limit';
  end if;
  with expired as (
    select id from legal_private.terms_acceptances where user_id is null
      and retention_until <= clock_timestamp()
      and (legal_hold_until is null or legal_hold_until <= clock_timestamp())
    order by retention_until limit p_limit for update skip locked
  ) delete from legal_private.terms_acceptances a using expired e where a.id=e.id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke all on function legal_private.purge_expired_terms_acceptances(integer) from public,anon,authenticated;
grant usage on schema legal_private to service_role;
grant execute on function legal_private.purge_expired_terms_acceptances(integer) to service_role;
-- No client grants on new columns, holds or closure controls. Existing RLS
-- permits only an authenticated user's active records, never detached records.
-- This private schema must remain excluded from PostgREST's exposed schemas.
commit;
