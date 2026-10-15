-- The legacy snapshot already contains a later notification signature. On a
-- NEW database only, remove that empty-base definition before replaying the
-- historical migration which uses different argument names. Do not change the
-- historical migrations or apply this compatibility step to an existing site.
drop function if exists public.create_notification(uuid,text,uuid,text,text,boolean);

-- Rebuilt by July, then extended by September. The snapshot already has those
-- extra columns, which CREATE OR REPLACE VIEW cannot remove during replay.
drop view public.public_profiles;

-- The July 6 historical definition searches only public, while the later
-- snapshot installs unaccent in extensions. Temporary invoker shim for replay;
-- the final reconciliation uses extensions.unaccent and the shim is removed.
create function public.unaccent(text) returns text
language sql stable security invoker set search_path = ''
as $$ select extensions.unaccent($1) $$;
