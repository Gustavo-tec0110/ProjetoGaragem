begin;

alter table public.profiles
  add column if not exists cover_url text;

create or replace view public.public_profiles
with (security_barrier = true) as
select
  id,
  username,
  case
    when position('@' in display_name) > 1 then username::text
    else display_name
  end as display_name,
  avatar_url,
  bio,
  city,
  state,
  instagram_handle,
  is_saves_public,
  is_likes_public,
  cars_count,
  followers_count,
  following_count,
  created_at,
  updated_at,
  cover_url
from public.profiles;

comment on view public.public_profiles is
  'Public-safe profile projection. Excludes email and full_name; use public.profiles only for the authenticated user own row.';

grant select on public.public_profiles to anon, authenticated;

notify pgrst, 'reload schema';

commit;
