begin;

create extension if not exists citext;

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text;

create or replace function public.profile_username_from_auth_user(
  user_id uuid,
  email text,
  metadata jsonb
)
returns citext
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  base_username text;
  candidate text;
  counter integer := 0;
begin
  raw_name := coalesce(
    nullif(metadata->>'preferred_username', ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    nullif(metadata->>'full_name', ''),
    nullif(metadata->>'name', ''),
    'membro'
  );

  base_username := lower(regexp_replace(raw_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_username := regexp_replace(base_username, '^-+|-+$', '', 'g');

  if base_username = '' then
    base_username := 'membro';
  end if;

  if length(base_username) < 3 then
    base_username := rpad(base_username, 3, '0');
  end if;

  base_username := left(base_username, 16);
  candidate := left(
    base_username || '-' || left(replace(user_id::text, '-', ''), 6),
    24
  );

  while exists (
    select 1
    from public.profiles p
    where p.username = candidate
      and p.id <> user_id
  ) loop
    counter := counter + 1;
    candidate := left(base_username, greatest(3, 23 - length(counter::text))) || '-' || counter::text;
    candidate := left(candidate, 24);
  end loop;

  return candidate::citext;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_full_name text := coalesce(
    nullif(metadata->>'full_name', ''),
    nullif(metadata->>'name', '')
  );
  resolved_avatar_url text := coalesce(
    nullif(metadata->>'avatar_url', ''),
    nullif(metadata->>'picture', '')
  );
begin
  insert into public.profiles (
    id,
    username,
    display_name,
    email,
    full_name,
    avatar_url
  )
  values (
    new.id,
    public.profile_username_from_auth_user(new.id, new.email, metadata),
    coalesce(resolved_full_name, new.email, 'Membro Projeto Garagem'),
    new.email,
    resolved_full_name,
    resolved_avatar_url
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

commit;
