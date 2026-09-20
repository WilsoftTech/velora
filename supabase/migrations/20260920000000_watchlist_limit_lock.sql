-- Makes the 500-title watchlist cap race-safe.
--
-- The original trigger counted rows without any locking. Under READ COMMITTED,
-- two transactions inserting at 499 titles could not see each other's
-- uncommitted row, so both passed the check and the user ended up with 501.
-- Serialising inserts per user closes that gap: the second transaction waits
-- here until the first commits, then counts with its row visible.
create or replace function private.enforce_watchlist_limit()
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

  -- Held until the end of the transaction; only this user's inserts contend.
  perform pg_advisory_xact_lock(hashtextextended('velora.watchlist:' || new.user_id::text, 0));

  if (select count(*) from public.watchlist_items where user_id = new.user_id) >= 500 then
    raise exception 'Watchlist limit reached' using errcode = '23514';
  end if;
  return new;
end;
$$;
