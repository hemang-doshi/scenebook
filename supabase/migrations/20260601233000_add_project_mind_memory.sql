begin;

create table if not exists public.project_memory_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  thread_id uuid references public.agent_threads(id) on delete set null,
  run_id uuid references public.agent_runs(id) on delete set null,
  tool_call_id uuid references public.agent_tool_calls(id) on delete set null,
  memory_type text not null check (
    memory_type in (
      'creative_direction',
      'user_preference',
      'selected_output',
      'rejected_output',
      'analytics_learning',
      'workflow_checkpoint',
      'integration_connection',
      'agent_summary'
    )
  ),
  summary text not null,
  content jsonb not null default '{}'::jsonb,
  source text not null default 'agent' check (source in ('user', 'agent', 'system', 'integration')),
  confidence numeric(3, 2) not null default 1.00 check (confidence >= 0 and confidence <= 1),
  user_approved boolean not null default false,
  supersedes_memory_id uuid references public.project_memory_entries(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'superseded', 'deleted')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agent_run_summaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  user_goal text not null,
  summary text not null,
  actions_taken jsonb not null default '[]'::jsonb,
  workspace_changes jsonb not null default '[]'::jsonb,
  selected_outputs jsonb not null default '[]'::jsonb,
  rejected_outputs jsonb not null default '[]'::jsonb,
  open_next_steps jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(run_id)
);

alter table public.project_memory_entries enable row level security;
alter table public.agent_run_summaries enable row level security;

create policy "Users can read own project memories"
  on public.project_memory_entries for select to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own project memories"
  on public.project_memory_entries for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own project memories"
  on public.project_memory_entries for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own project memories"
  on public.project_memory_entries for delete to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own agent run summaries"
  on public.agent_run_summaries for select to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own agent run summaries"
  on public.agent_run_summaries for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own agent run summaries"
  on public.agent_run_summaries for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own agent run summaries"
  on public.agent_run_summaries for delete to authenticated
  using (auth.uid() = owner_id);

create index if not exists idx_project_memory_entries_project_type_created
  on public.project_memory_entries(project_id, memory_type, created_at desc)
  where status = 'active';

create index if not exists idx_project_memory_entries_run_id
  on public.project_memory_entries(run_id);

create index if not exists idx_agent_run_summaries_project_created
  on public.agent_run_summaries(project_id, created_at desc);

grant select, insert, update, delete on table public.project_memory_entries to authenticated;
grant select, insert, update, delete on table public.agent_run_summaries to authenticated;

grant select, insert, update, delete on table public.project_memory_entries to service_role;
grant select, insert, update, delete on table public.agent_run_summaries to service_role;

commit;
