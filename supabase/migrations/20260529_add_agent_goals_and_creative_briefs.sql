begin;

create table if not exists public.project_creative_briefs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  title text not null default 'Untitled Brief',
  brief jsonb not null default '{}'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agent_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  thread_id uuid references public.agent_threads(id) on delete set null,
  title text not null,
  status text not null default 'active',
  completed_steps jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.project_creative_briefs enable row level security;
alter table public.agent_goals enable row level security;

create policy "Users can read own project creative briefs"
  on public.project_creative_briefs
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own project creative briefs"
  on public.project_creative_briefs
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own project creative briefs"
  on public.project_creative_briefs
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own project creative briefs"
  on public.project_creative_briefs
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own agent goals"
  on public.agent_goals
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own agent goals"
  on public.agent_goals
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own agent goals"
  on public.agent_goals
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own agent goals"
  on public.agent_goals
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create index if not exists idx_project_creative_briefs_owner_id
  on public.project_creative_briefs(owner_id);

create index if not exists idx_project_creative_briefs_project_id
  on public.project_creative_briefs(project_id);

create index if not exists idx_agent_goals_owner_id
  on public.agent_goals(owner_id);

create index if not exists idx_agent_goals_project_id
  on public.agent_goals(project_id);

create index if not exists idx_agent_goals_thread_id
  on public.agent_goals(thread_id);

create index if not exists idx_agent_goals_status
  on public.agent_goals(status);

grant select, insert, update, delete on table public.project_creative_briefs to authenticated;
grant select, insert, update, delete on table public.project_creative_briefs to service_role;

grant select, insert, update, delete on table public.agent_goals to authenticated;
grant select, insert, update, delete on table public.agent_goals to service_role;

commit;
