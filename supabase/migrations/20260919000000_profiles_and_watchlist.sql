-- Velora Phase 2: profiles and watchlist_items, both protected by Row Level Security.
--
-- Access model: signed-in users can touch only their own rows. Anonymous
-- visitors get no access at all (guests keep their list in localStorage).
-- Tables are not exposed to the Data API by default, so every grant below is
-- explicit and as narrow as the app needs.

-- Helper functions live in a schema the Data API does not expose.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user; holds only what the product displays.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 50),
  -- Reserved for a later phase. Not writable by clients yet, because a
  -- user-supplied URL needs an allow-list before the app renders it.
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Creates the profile when a user registers. SECURITY DEFINER is required
-- because the registering user has no privileges on profiles yet; the function
-- is kept out of the exposed schema and no client role may execute it.
-- display_name comes from user-editable metadata: it is display text only and
-- must never be used for an authorization decision.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 50), '')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- watchlist_items: a user's saved titles. TMDB stays the source of truth for
-- everything about the title; only its identity is stored here.
-- ---------------------------------------------------------------------------
create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  -- Defaults to the caller, so the app never has to send (or be trusted with) a user id.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tmdb_id integer not null check (tmdb_id > 0),
  media_type text not null check (media_type in ('movie', 'tv')),
  created_at timestamptz not null default now(),
  -- Also the index for per-user lookups and the foreign key (user_id leads).
  constraint watchlist_items_user_media_key unique (user_id, media_type, tmdb_id)
);

-- A signed-in user can call the Data API directly with their own session, so an
-- app-side limit would not bind them. The cap therefore lives here (keep in
-- sync with MAX_WATCHLIST_ITEMS in lib/schemas.ts). Re-saving a title that is
-- already on the list is let through so the insert can be a harmless no-op.
create function private.enforce_watchlist_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.watchlist_items
    where user_id = new.user_id and media_type = new.media_type and tmdb_id = new.tmdb_id
  ) then
    return new;
  end if;

  if (select count(*) from public.watchlist_items where user_id = new.user_id) >= 500 then
    raise exception 'Watchlist limit reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger watchlist_items_enforce_limit
  before insert on public.watchlist_items
  for each row execute function private.enforce_watchlist_limit();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.watchlist_items enable row level security;

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "watchlist_items: read own"
  on public.watchlist_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "watchlist_items: add own"
  on public.watchlist_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "watchlist_items: remove own"
  on public.watchlist_items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grants: start from nothing, then add only what the app uses.
-- Profiles are created by the trigger and removed by cascade, so clients never
-- insert or delete them; watchlist rows are immutable, so there is no update.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.watchlist_items from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, delete on public.watchlist_items to authenticated;
