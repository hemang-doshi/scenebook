begin;

create table if not exists public.agent_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  title text not null default 'Untitled thread',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  model text,
  provider text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  status text not null default 'queued',
  input text not null,
  selected_models jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  tool_name text not null,
  command text,
  status text not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  requires_approval boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz
);

create table if not exists public.agent_memory_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  summary text not null,
  decisions jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.agent_threads enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_tool_calls enable row level security;
alter table public.agent_memory_snapshots enable row level security;

create policy "Users can read own agent threads"
  on public.agent_threads
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own agent threads"
  on public.agent_threads
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own agent threads"
  on public.agent_threads
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own agent threads"
  on public.agent_threads
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own agent messages"
  on public.agent_messages
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own agent messages"
  on public.agent_messages
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own agent messages"
  on public.agent_messages
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own agent messages"
  on public.agent_messages
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own agent runs"
  on public.agent_runs
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own agent runs"
  on public.agent_runs
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own agent runs"
  on public.agent_runs
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own agent runs"
  on public.agent_runs
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own agent tool calls"
  on public.agent_tool_calls
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own agent tool calls"
  on public.agent_tool_calls
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own agent tool calls"
  on public.agent_tool_calls
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own agent tool calls"
  on public.agent_tool_calls
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own agent memory snapshots"
  on public.agent_memory_snapshots
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own agent memory snapshots"
  on public.agent_memory_snapshots
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own agent memory snapshots"
  on public.agent_memory_snapshots
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own agent memory snapshots"
  on public.agent_memory_snapshots
  for delete
  to authenticated
  using (auth.uid() = owner_id);

grant select, insert, update, delete on table public.agent_threads to authenticated;
grant select, insert, update, delete on table public.agent_messages to authenticated;
grant select, insert, update, delete on table public.agent_runs to authenticated;
grant select, insert, update, delete on table public.agent_tool_calls to authenticated;
grant select, insert, update, delete on table public.agent_memory_snapshots to authenticated;

grant select, insert, update, delete on table public.agent_threads to service_role;
grant select, insert, update, delete on table public.agent_messages to service_role;
grant select, insert, update, delete on table public.agent_runs to service_role;
grant select, insert, update, delete on table public.agent_tool_calls to service_role;
grant select, insert, update, delete on table public.agent_memory_snapshots to service_role;

commit;
