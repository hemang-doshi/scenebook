begin;

create table if not exists public.project_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  thread_id uuid not null references public.agent_threads(id) on delete cascade,
  tool_call_id uuid references public.agent_tool_calls(id) on delete set null,
  artifact_type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.project_artifacts enable row level security;

create policy "Users can read own project artifacts"
  on public.project_artifacts
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own project artifacts"
  on public.project_artifacts
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own project artifacts"
  on public.project_artifacts
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own project artifacts"
  on public.project_artifacts
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create index if not exists idx_project_artifacts_project_id_created_at
  on public.project_artifacts(project_id, created_at desc);

create index if not exists idx_project_artifacts_tool_call_id
  on public.project_artifacts(tool_call_id);

grant select, insert, update, delete on table public.project_artifacts to authenticated;
grant select, insert, update, delete on table public.project_artifacts to service_role;

commit;
