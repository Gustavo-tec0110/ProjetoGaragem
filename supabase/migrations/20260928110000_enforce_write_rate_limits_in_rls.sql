begin;

-- Estas policies são a fonte única do rate limit para escritas acessíveis
-- via PostgREST e Server Actions. A rota de upload continua limitada no
-- servidor porque grava no Storage com service role após validar a sessão.

drop policy if exists "cars_insert_own" on public.cars;
create policy "cars_insert_own" on public.cars
for insert to authenticated
with check (
  owner_id = auth.uid()
  and public.project_creation_within_quota()
  and public.enforce_action_rate_limit('project_create')
);

drop policy if exists "cars_update_own" on public.cars;
create policy "cars_update_own" on public.cars
for update to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and public.enforce_action_rate_limit('project_update')
);

drop policy if exists "cars_delete_own" on public.cars;
create policy "cars_delete_own" on public.cars
for delete to authenticated
using (owner_id = auth.uid() and public.enforce_action_rate_limit('project_update'));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (id = auth.uid() and public.enforce_action_rate_limit('profile_write'));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and public.enforce_action_rate_limit('profile_write'));

drop policy if exists "car_comments_insert_own" on public.car_comments;
create policy "car_comments_insert_own" on public.car_comments
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.enforce_action_rate_limit('comment_create')
  and exists (
    select 1 from public.cars c
    where c.id = car_comments.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_comments_delete_author" on public.car_comments;
create policy "car_comments_delete_author" on public.car_comments
for delete to authenticated
using (
  public.enforce_action_rate_limit('comment_delete')
  and (
    user_id = auth.uid()
    or exists (
      select 1 from public.cars c
      where c.id = car_comments.car_id and c.owner_id = auth.uid()
    )
  )
);

drop policy if exists "car_likes_insert_own" on public.car_likes;
create policy "car_likes_insert_own" on public.car_likes
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.enforce_action_rate_limit('social_toggle')
  and exists (
    select 1 from public.cars c
    where c.id = car_likes.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_likes_delete_own" on public.car_likes;
create policy "car_likes_delete_own" on public.car_likes
for delete to authenticated
using (user_id = auth.uid() and public.enforce_action_rate_limit('social_toggle'));

drop policy if exists "car_saves_insert_own" on public.car_saves;
create policy "car_saves_insert_own" on public.car_saves
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.enforce_action_rate_limit('social_toggle')
  and exists (
    select 1 from public.cars c
    where c.id = car_saves.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_saves_delete_own" on public.car_saves;
create policy "car_saves_delete_own" on public.car_saves
for delete to authenticated
using (user_id = auth.uid() and public.enforce_action_rate_limit('social_toggle'));

drop policy if exists "user_follows_insert_own" on public.user_follows;
create policy "user_follows_insert_own" on public.user_follows
for insert to authenticated
with check (
  follower_id = auth.uid()
  and following_id <> auth.uid()
  and public.enforce_action_rate_limit('social_toggle')
);

drop policy if exists "user_follows_delete_own" on public.user_follows;
create policy "user_follows_delete_own" on public.user_follows
for delete to authenticated
using (follower_id = auth.uid() and public.enforce_action_rate_limit('social_toggle'));

drop policy if exists "project_follows_insert_own" on public.project_follows;
create policy "project_follows_insert_own" on public.project_follows
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.enforce_action_rate_limit('social_toggle')
  and exists (
    select 1 from public.cars c
    where c.id = project_follows.car_id
      and c.is_public = true
      and c.owner_id <> auth.uid()
  )
);

drop policy if exists "project_follows_delete_own" on public.project_follows;
create policy "project_follows_delete_own" on public.project_follows
for delete to authenticated
using (user_id = auth.uid() and public.enforce_action_rate_limit('social_toggle'));

commit;
