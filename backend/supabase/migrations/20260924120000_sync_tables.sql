-- The durable archive of the phone's local store (milestone 6). The phone is the source of
-- truth; these tables mirror it, one row per local row, same ids (client-generated UUIDv7).
--
-- Forward compatibility (CLAUDE.md, CONVENTIONS): later migrations only ADD tables or columns,
-- and a new column is nullable or has a default. Pattern and kind are plain text with no check
-- constraint, so a new kind needs no migration here and old rows are never touched.
--
-- No foreign keys between these tables: the outbox pushes rows in the order they were written,
-- and the catalogue was queued after the sets that use it, so an FK would block the queue. The
-- app never deletes an exercise, and the archive only has to hold what the phone holds.
--
-- Two columns the phone never sees:
--   user_id    the owner, checked by RLS. Defaults to the signed-in user.
--   synced_at  when the server last accepted the row, set here, never by a client. The pull
--              cursor: updated_at can't be one, since a late push carries an old updated_at.

create table public.exercises (
  id               uuid primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null,
  pattern          text not null,
  default_rest_sec integer not null default 120,
  archived         boolean not null default false,
  updated_at       timestamptz not null,
  synced_at        timestamptz not null default clock_timestamp()
);

create table public.templates (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  updated_at  timestamptz not null,
  synced_at   timestamptz not null default clock_timestamp()
);

-- Your list: what the board shows and in what order. set_logs never references it (Hard Rule 3).
create table public.template_items (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id  uuid not null,
  exercise_id  uuid not null,
  pattern      text not null,
  sort_order   integer not null default 0,
  updated_at   timestamptz not null,
  synced_at    timestamptz not null default clock_timestamp()
);

-- The single source of truth (Hard Rule 1). No template reference, here or ever.
create table public.set_logs (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id  uuid not null,
  session_id   uuid,
  logged_at    timestamptz not null,
  weight       numeric not null,
  reps         integer not null,
  rpe          numeric,
  kind         text not null default 'working',
  updated_at   timestamptz not null,
  synced_at    timestamptz not null default clock_timestamp()
);

-- Manual end markers only (Hard Rule 2). template_id is a label and is never read.
create table public.sessions (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at   timestamptz not null,
  ended_at     timestamptz,
  template_id  uuid,
  updated_at   timestamptz not null,
  synced_at    timestamptz not null default clock_timestamp()
);

-- The query the app is built around, and the pull cursor for every table.
create index set_logs_user_exercise_logged on public.set_logs (user_id, exercise_id, logged_at desc);
create index exercises_user_synced      on public.exercises      (user_id, synced_at);
create index templates_user_synced      on public.templates      (user_id, synced_at);
create index template_items_user_synced on public.template_items (user_id, synced_at);
create index set_logs_user_synced       on public.set_logs       (user_id, synced_at);
create index sessions_user_synced       on public.sessions       (user_id, synced_at);

-- Last write wins on updated_at. An update carrying an older updated_at than the stored row
-- is skipped (returning null cancels it, which is what an upsert's ON CONFLICT UPDATE runs),
-- so a stale device can never overwrite a newer edit. Every accepted write stamps synced_at.
create function public.sync_stamp() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['exercises', 'templates', 'template_items', 'set_logs', 'sessions'] loop
    execute format(
      'create trigger sync_stamp before insert or update on public.%I
         for each row execute function public.sync_stamp()', t);

    -- Only the owner can see or write a row.
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;
