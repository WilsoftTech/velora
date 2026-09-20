-- Velora Phase 3: anonymous search analytics + per-user search history.
--
--   private.search_events     anonymous event log. No client can read or write it.
--   public.search_history     a signed-in user's 20 most recent searches. Own rows only.
--   public.record_search      the ONLY way either table is written.
--   public.trending_searches  aggregate-only read of the last 7 days of events.
--
-- Two separate stores on purpose: analytics carry no identity at all, history
-- carries identity but is never aggregated. record_search feeds both from one
-- validated input, so the two can never disagree about what a valid search is.
--
-- Nothing here trusts the caller. The publishable key is public, so anyone can
-- call these functions outside the Velora UI; every input is validated below.

-- ---------------------------------------------------------------------------
-- The normalization contract (single source of truth for what gets persisted)
--
-- Input is raw user text. Output is the canonical query, or NULL when the text
-- is not a meaningful search. Steps, in order:
--   0. Reject raw input over 500 characters before doing any work (cheap guard).
--   1. Unicode NFKC. Folds full-width and compatibility forms ("ＢＡＴＭＡＮ",
--      "ﬁ", non-breaking and ideographic spaces) into one representation.
--   2. Delete invisible and control characters: C0/C1 controls except the
--      whitespace ones, soft hyphen, Arabic letter mark, zero-width space,
--      LRM/RLM, bidi embeddings/overrides/isolates (U+202A-202E, U+2060-206F),
--      BOM. ZWNJ (U+200C) and ZWJ (U+200D) are deliberately KEPT: Persian, Indic
--      scripts and emoji sequences need them.
--   3. Every run of whitespace (tab, newline, NBSP, U+2000-200A, U+2028/2029,
--      U+3000 ...) becomes a single space; leading/trailing space is removed.
--   4. lower().
--   5. Length must be 2..100 characters (code points, not bytes).
--   6. Must contain at least one "useful" character. This is a BLOCKLIST of
--      space, ASCII punctuation, Latin-1 symbols, combining marks, general
--      punctuation, currency, arrows/maths/technical/dingbats, CJK punctuation,
--      variation selectors and emoji, plus characters that render as nothing
--      or mean nothing (Hangul/Khmer fillers, other default-ignorable code
--      points, private-use and non-characters), so a blank query is never
--      recorded. Everything else counts, so Latin, Cyrillic, Greek, Arabic,
--      Hebrew, Indic, Thai, CJK, Hangul ... all pass. The gate is hygiene, not
--      security (anyone can pass it with letters): lone combining marks and
--      script-specific punctuation are still accepted, because PostgreSQL's
--      regular expressions cannot select Unicode general categories.
--      A blocklist is used instead of [[:alnum:]] because [[:alnum:]] depends on
--      the database's ctype locale: under a C locale it would silently reject
--      every non-ASCII title.
--
-- The application does NOT reimplement this. It sends the query it searched
-- (trimmed, at most 100 code points: lib/utils.ts normalizeSearchQuery) and Zod
-- checks only type, scope and range. The database is the sole authority, so
-- there is nothing that can disagree. Known, harmless limits: lower() follows
-- the database locale (a C-ctype database would not fold "É" to "é": worse
-- deduplication, never a rejection) and normalize() follows PostgreSQL's
-- Unicode tables, which can trail a browser's by a few very recent characters.
-- ---------------------------------------------------------------------------
create function private.normalize_search_query(p_raw text)
returns text
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  v_query text;
begin
  if char_length(p_raw) > 500 then
    return null;
  end if;

  v_query := normalize(p_raw, NFKC);

  v_query := regexp_replace(
    v_query,
    '[\u0001-\u0008\u000e-\u001f\u007f-\u0084\u0086-\u009f\u00ad\u061c\u180e\u200b\u200e-\u200f\u202a-\u202e\u2060-\u206f\ufeff]',
    '',
    'g'
  );

  v_query := btrim(
    regexp_replace(
      v_query,
      '[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028-\u2029\u202f\u205f\u3000]+',
      ' ',
      'g'
    ),
    ' '
  );

  v_query := lower(v_query);

  if char_length(v_query) not between 2 and 100 then
    return null;
  end if;

  if v_query !~ '[^\u0020-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e\u00a1-\u00bf\u00d7\u00f7\u0300-\u036f\u200c-\u200d\u2010-\u2027\u2030-\u205e\u20a0-\u20cf\u2190-\u2bff\u3001-\u3004\u3008-\u3020\u3030\u303d-\u303f\u30fb\ufe00-\ufe0f\ufe10-\ufe1f\ufe30-\ufe6f\U0001f000-\U0001faff\u115f-\u1160\u17b4-\u17b5\u180b-\u180d\u180f\ue000-\uf8ff\ufdd0-\ufdef\ufff0-\uffff\U0001bca0-\U0001bca3\U0001d173-\U0001d17a\U000e0000-\U000e0fff\U000f0000-\U0010ffff]' then
    return null;
  end if;

  return v_query;
end;
$$;

revoke all on function private.normalize_search_query(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- private.search_events: anonymous analytics.
--
-- Deliberately has NO user id, email, IP address, user agent, session id or
-- token, and no TMDB payload: only what a trend needs. It lives in the private
-- schema, which the Data API does not expose, and it is ALSO locked down with
-- RLS and explicit revokes so an exposure mistake would still leak nothing.
-- ---------------------------------------------------------------------------
create table private.search_events (
  id bigint generated always as identity primary key,
  -- Canonical form from private.normalize_search_query, never raw text.
  query text not null check (char_length(query) between 2 and 100 and query = btrim(query)),
  scope text not null check (scope in ('all', 'movie', 'tv')),
  -- Caller-reported and UNTRUSTED: a display/analysis hint only. TMDB's own
  -- ceiling is 500 pages x 20 = 10,000 results.
  result_count smallint not null check (result_count between 0 and 10000),
  created_at timestamptz not null default now()
);

comment on table private.search_events is
  'Anonymous search analytics. Never add identity columns. Written only by public.record_search; read only by public.trending_searches.';

-- Serves the 7-day trending window and the bounded retention purge.
create index search_events_created_at_idx on private.search_events (created_at);

alter table private.search_events enable row level security;
-- No policies: with RLS on, that denies every non-owner role.
revoke all on table private.search_events from public, anon, authenticated;
revoke all on sequence private.search_events_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- public.search_history: a signed-in user's recent searches.
--
-- Scope is part of the key. "batman" in Movies and "batman" in TV Shows are
-- different searches, and history has to reproduce what the user actually ran.
-- Repeating an identical (scope, query) refreshes searched_at instead of adding
-- a row. The key leads with user_id, so it also serves per-user lookups and the
-- cascade from auth.users. With at most ~20 rows per user, no other index pays.
-- ---------------------------------------------------------------------------
create table public.search_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  scope text not null check (scope in ('all', 'movie', 'tv')),
  query text not null check (char_length(query) between 2 and 100 and query = btrim(query)),
  searched_at timestamptz not null default now(),
  primary key (user_id, scope, query)
);

alter table public.search_history enable row level security;

create policy "search_history: read own"
  on public.search_history for select to authenticated
  using ((select auth.uid()) = user_id);

-- Direct DELETE under RLS is enough for "remove one" and "clear all": no
-- privileged delete function is needed. There is no insert or update policy
-- AND no insert/update grant: rows can only be written by record_search.
create policy "search_history: remove own"
  on public.search_history for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.search_history from public, anon, authenticated;
grant select, delete on public.search_history to authenticated;

-- ---------------------------------------------------------------------------
-- public.record_search
--
-- SECURITY DEFINER is required, not convenient: anonymous callers must append
-- to private.search_events, and signed-in callers must write search_history,
-- while NEITHER role may hold any privilege on those tables. Granting INSERT
-- would let a client forge rows, timestamps and unbounded history; this
-- function is the narrow, validated path instead.
--
-- It lives in public only because PostgREST can call functions only in exposed
-- schemas. Hardening: empty search_path with every object schema-qualified, no
-- dynamic SQL, EXECUTE revoked from PUBLIC then granted to exactly the two API
-- roles. The user id comes ONLY from auth.uid() (the verified JWT); callers can
-- supply neither a user id, a timestamp, nor the stored query text. A caller can
-- never read anything: the function returns nothing.
--
-- Invalid scope or result_count means a broken or hostile caller: error.
-- A query that normalizes to NULL is an ordinary user input ("!!", "a"):
-- silently not recorded.
-- ---------------------------------------------------------------------------
create function public.record_search(p_query text, p_scope text, p_result_count integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_query text;
  v_user_id uuid := auth.uid();
begin
  if p_scope is null or p_scope not in ('all', 'movie', 'tv') then
    raise exception 'Invalid search scope' using errcode = '22023';
  end if;
  if p_result_count is null or p_result_count not between 0 and 10000 then
    raise exception 'Invalid result count' using errcode = '22023';
  end if;

  v_query := private.normalize_search_query(p_query);
  if v_query is null then
    return;
  end if;

  insert into private.search_events (query, scope, result_count)
  values (v_query, p_scope, p_result_count);

  -- Guests (and anyone whose token carries no user) get analytics only.
  if v_user_id is null then
    return;
  end if;

  -- One lock per user, held to the end of this short transaction. Without it,
  -- two concurrent searches both count 20 rows, both insert, and both prune
  -- against a snapshot that cannot see the other's row: 21 rows remain until the
  -- next search. Same pattern as the watchlist cap in
  -- 20260920000000_watchlist_limit_lock.sql; it only ever contends with the same
  -- user's own concurrent searches.
  perform pg_advisory_xact_lock(hashtextextended('velora.search_history:' || v_user_id::text, 0));

  -- clock_timestamp() is read after the lock, so recency follows the order in
  -- which searches were actually applied and the row just written is always newest.
  insert into public.search_history (user_id, scope, query, searched_at)
  values (v_user_id, p_scope, v_query, clock_timestamp())
  on conflict (user_id, scope, query) do update set searched_at = excluded.searched_at;

  delete from public.search_history h
  where h.user_id = v_user_id
    and (h.scope, h.query) not in (
      select k.scope, k.query
      from public.search_history k
      where k.user_id = v_user_id
      order by k.searched_at desc, k.scope, k.query
      limit 20
    );
end;
$$;

revoke all on function public.record_search(text, text, integer) from public, anon, authenticated;
grant execute on function public.record_search(text, text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- public.trending_searches: aggregate-only.
--
-- SECURITY DEFINER is required because it reads private.search_events, on which
-- clients hold no privilege. It returns one row per query with a count: never
-- an event row, never identity (none exists). Same hardening as record_search.
--
-- Semantics: events from the last 7 days, canonical query, result_count > 0,
-- at least 3 events, most searched first; ties go to the most recently searched
-- and then to the query text, so the order is deterministic.
-- result_count > 0 is a cheap pre-filter that spares TMDB verification calls
-- for junk. It is NOT proof: the count is caller-supplied, so the app must still
-- confirm each candidate against TMDB before showing it. The filter only skips
-- events and never subtracts any, so it cannot be used to suppress someone
-- else's query.
--
-- p_limit is clamped to 1..20 in here. The app asks for more than it shows,
-- because verification drops candidates.
-- ---------------------------------------------------------------------------
create function public.trending_searches(p_limit integer default 6)
returns table (query text, search_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select e.query, count(*) as search_count
  from private.search_events e
  where e.created_at >= now() - interval '7 days'
    and e.result_count > 0
  group by e.query
  having count(*) >= 3
  order by count(*) desc, max(e.created_at) desc, e.query asc
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
$$;

revoke all on function public.trending_searches(integer) from public, anon, authenticated;
grant execute on function public.trending_searches(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Retention.
--
-- record_search does NOT delete old events. Doing so on every user search would
-- put maintenance work and write contention on the hot path, and trending
-- reads only the indexed 7-day window, so old rows cost nothing to keep for a
-- while. Physical cleanup is this bounded, index-supported function instead:
-- it deletes at most one batch per call, oldest first, and can never reach
-- into the 7-day trending window. It is NOT scheduled by this migration
-- (scheduling means enabling pg_cron, a separate decision), so anonymous events
-- currently have NO automatically enforced expiry: the only bounds that exist
-- are the 7-day trending read window and the 20-row history cap.
-- The retention period is deliberately not chosen here (p_older_than has no
-- default): whoever schedules this picks it, and must verify the schedule
-- actually runs, before any document states a retention period.
-- ---------------------------------------------------------------------------
create function private.purge_search_events(p_older_than interval, p_batch integer default 5000)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from private.search_events
  where id in (
    select e.id
    from private.search_events e
    where e.created_at < now() - greatest(p_older_than, interval '7 days')
    order by e.created_at
    limit least(greatest(p_batch, 1), 50000)
  );
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function private.purge_search_events(interval, integer) from public, anon, authenticated;
