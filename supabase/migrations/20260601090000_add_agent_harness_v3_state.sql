begin;

create table if not exists public.project_creative_briefs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  audience text,
  platform text,
  format text,
  duration_seconds integer,
  tone text,
  core_angle text,
  viewer_promise text,
  viewer_emotion text,
  creator_persona text,
  visual_style text,
  cta text,
  constraints jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  rejected_directions jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  approved_fields jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(project_id)
);

create table if not exists public.agent_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  thread_id uuid references public.agent_threads(id) on delete set null,
  title text not null,
  status text not null default 'active',
  stage text not null default 'ideating',
  completed_steps jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.script_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  thread_id uuid references public.agent_threads(id) on delete set null,
  tool_call_id uuid references public.agent_tool_calls(id) on delete set null,
  title text not null,
  script_lab jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  step_index integer not null,
  snapshot_summary jsonb not null default '{}'::jsonb,
  decision jsonb not null default '{}'::jsonb,
  observation jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.agent_tool_calls
  add column if not exists risk text,
  add column if not exists approval_reason text,
  add column if not exists state_snapshot_id uuid,
  add column if not exists verification jsonb not null default '{}'::jsonb,
  add column if not exists availability text,
  add column if not exists side_effect text,
  add column if not exists approval_policy text;

alter table public.agent_runs
  add column if not exists trace jsonb not null default '[]'::jsonb;

alter table public.project_creative_briefs enable row level security;
alter table public.agent_goals enable row level security;
alter table public.script_versions enable row level security;
alter table public.agent_run_steps enable row level security;

create policy "Users can read own creative briefs"
  on public.project_creative_briefs for select to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own creative briefs"
  on public.project_creative_briefs for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own creative briefs"
  on public.project_creative_briefs for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own creative briefs"
  on public.project_creative_briefs for delete to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own agent goals"
  on public.agent_goals for select to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own agent goals"
  on public.agent_goals for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own agent goals"
  on public.agent_goals for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own agent goals"
  on public.agent_goals for delete to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own script versions"
  on public.script_versions for select to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own script versions"
  on public.script_versions for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own script versions"
  on public.script_versions for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own script versions"
  on public.script_versions for delete to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own agent run steps"
  on public.agent_run_steps for select to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own agent run steps"
  on public.agent_run_steps for insert to authenticated
  with check (auth.uid() = owner_id);

create index if not exists idx_agent_goals_project_status_updated
  on public.agent_goals(project_id, status, updated_at desc);

create index if not exists idx_project_creative_briefs_project_id
  on public.project_creative_briefs(project_id);

create index if not exists idx_script_versions_project_created
  on public.script_versions(project_id, created_at desc);

create index if not exists idx_agent_run_steps_run_index
  on public.agent_run_steps(run_id, step_index);

grant select, insert, update, delete on table public.project_creative_briefs to authenticated;
grant select, insert, update, delete on table public.agent_goals to authenticated;
grant select, insert, update, delete on table public.script_versions to authenticated;
grant select, insert on table public.agent_run_steps to authenticated;

grant select, insert, update, delete on table public.project_creative_briefs to service_role;
grant select, insert, update, delete on table public.agent_goals to service_role;
grant select, insert, update, delete on table public.script_versions to service_role;
grant select, insert, update, delete on table public.agent_run_steps to service_role;

commit;

