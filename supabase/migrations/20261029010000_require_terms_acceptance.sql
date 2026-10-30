-- LOCAL ONLY. Document versions and retention require owner approval before rollout.
begin;
create schema if not exists legal_private;
revoke all on schema legal_private from public, anon, authenticated;
grant usage on schema legal_private to anon, authenticated;

create table legal_private.document_versions (
  terms_version text not null,
  privacy_version text not null,
  is_current boolean not null default false,
  approved boolean not null default false,
  primary key (terms_version, privacy_version)
);
create unique index one_current_legal_version on legal_private.document_versions (is_current) where is_current;
insert into legal_private.document_versions values ('pending-approval-v1','pending-approval-v1',true,false);

create table legal_private.terms_acceptances (
  user_id uuid not null references auth.users(id) on delete restrict,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default clock_timestamp(),
  context text not null default 'authenticated',
  primary key (user_id, terms_version, privacy_version),
  foreign key (terms_version, privacy_version) references legal_private.document_versions
);
alter table legal_private.document_versions enable row level security;
alter table legal_private.terms_acceptances enable row level security;
revoke all on all tables in schema legal_private from public, anon, authenticated;
grant select on legal_private.terms_acceptances to authenticated;
create policy acceptance_read_own on legal_private.terms_acceptances for select to authenticated using (user_id = (select auth.uid()));

create function legal_private.has_current_terms_acceptance() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from legal_private.terms_acceptances a
    join legal_private.document_versions d using (terms_version,privacy_version)
    where a.user_id = auth.uid() and d.is_current and d.approved
  );
$$;
create function legal_private.accept_current_terms(p_terms_version text, p_privacy_version text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception using errcode='42501', message='not_authenticated'; end if;
  -- Lock the current document row: approval/version cannot change mid-acceptance.
  perform 1 from legal_private.document_versions
    where terms_version=p_terms_version and privacy_version=p_privacy_version and is_current and approved for share;
  if not found then raise exception using errcode='22023', message='documents_not_approved_or_current'; end if;
  insert into legal_private.terms_acceptances(user_id,terms_version,privacy_version)
    values(auth.uid(),p_terms_version,p_privacy_version) on conflict do nothing;
end;
$$;
revoke all on function legal_private.has_current_terms_acceptance() from public, anon, authenticated;
revoke all on function legal_private.accept_current_terms(text,text) from public, anon, authenticated;
grant execute on function legal_private.has_current_terms_acceptance() to anon, authenticated;
grant execute on function legal_private.accept_current_terms(text,text) to authenticated;

create function public.has_current_terms_acceptance() returns boolean
language sql stable security invoker set search_path = '' as $$ select legal_private.has_current_terms_acceptance(); $$;
create function public.accept_current_terms(p_terms_version text,p_privacy_version text) returns void
language sql security invoker set search_path = '' as $$ select legal_private.accept_current_terms(p_terms_version,p_privacy_version); $$;
revoke all on function public.has_current_terms_acceptance() from public, anon, authenticated;
revoke all on function public.accept_current_terms(text,text) from public, anon, authenticated;
grant execute on function public.has_current_terms_acceptance() to anon, authenticated;
grant execute on function public.accept_current_terms(text,text) to authenticated;

-- RLS remains an AND with all existing ownership, privacy and quota policies.
-- Triggers also cover mutations performed inside SECURITY DEFINER RPCs.
-- Auth provisioning/maintenance without an end-user JWT retains existing rights.
create function legal_private.guard_terms_mutation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not legal_private.has_current_terms_acceptance() then
    raise exception using errcode='42501', message='terms_acceptance_required';
  end if;
  return coalesce(new,old);
end;
$$;
revoke all on function legal_private.guard_terms_mutation() from public, anon, authenticated;

do $$ declare t record; begin
  for t in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r' and (n.nspname='public' or (n.nspname='storage' and c.relname='objects'))
  loop
    if t.nspname='public' then
      execute format('alter table %I.%I enable row level security',t.nspname,t.relname);
      execute format('create policy terms_acceptance_required on %I.%I as restrictive for all to authenticated using ((select public.has_current_terms_acceptance())) with check ((select public.has_current_terms_acceptance()))',t.nspname,t.relname);
    end if;
    execute format('create trigger terms_acceptance_required before insert or update or delete on %I.%I for each row execute function legal_private.guard_terms_mutation()',t.nspname,t.relname);
  end loop;
end $$;

-- Keep public media public; the owner-only branch requires acceptance as well.
create or replace function public.can_read_project_image(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    public.project_image_reference_path(p_path) = p_path
    and not exists (select 1 from public.project_image_deletion_claims where path = p_path)
    and not exists (select 1 from public.pending_modification_photo_leases where path = p_path and claimed_at is not null)
    and exists (select 1 from storage.objects where bucket_id = 'project-images' and name = p_path)
    and (
      (split_part(p_path, '/', 1) = auth.uid()::text and public.has_current_terms_acceptance())
      or (
        exists (select 1 from public.project_image_references r where r.path = p_path)
        and not exists (select 1 from public.project_image_references r left join public.cars c on c.id = r.car_id
          where r.path = p_path and (r.owner_id::text <> split_part(p_path, '/', 1)
            or (r.car_id is not null and (c.id is null or not c.is_public))))
      )
    ), false);
$$;
commit;
