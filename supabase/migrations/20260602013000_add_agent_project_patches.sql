begin;

create table if not exists public.agent_project_patches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  thread_id uuid references public.agent_threads(id) on delete set null,
  run_id uuid references public.agent_runs(id) on delete set null,
  title text not null,
  summary text not null,
  reason text,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'blocked')),
  status text not null default 'planned' check (
    status in (
      'planned',
      'applying',
      'completed',
      'partial_failed',
      'failed',
      'awaiting_approval'
    )
  ),
  requires_approval boolean not null default false,
  successful_operations integer not null default 0,
  failed_operations integer not null default 0,
  retryable boolean not null default false,
  patch jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz
);

create table if not exists public.agent_project_patch_operations (
  id uuid primary key default gen_random_uuid(),
  patch_id uuid not null references public.agent_project_patches(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  thread_id uuid references public.agent_threads(id) on delete set null,
  run_id uuid references public.agent_runs(id) on delete set null,
  operation_index integer not null,
  operation_type text not null,
  tool_name text not null,
  status text not null default 'planned' check (
    status in (
      'planned',
      'running',
      'completed',
      'failed',
      'blocked',
      'awaiting_approval'
    )
  ),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error jsonb not null default '{}'::jsonb,
  verification jsonb not null default '{}'::jsonb,
  retryable boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(patch_id, operation_index)
);

alter table public.agent_project_patches enable row level security;
alter table public.agent_project_patch_operations enable row level security;

create policy "Users can read own agent project patches"
  on public.agent_project_patches for select to authenticated
  using (
    auth.uid() = agent_project_patches.owner_id
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patches.project_id
        and card.owner_id = agent_project_patches.owner_id
    )
  );

create policy "Users can insert own agent project patches"
  on public.agent_project_patches for insert to authenticated
  with check (
    auth.uid() = agent_project_patches.owner_id
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patches.project_id
        and card.owner_id = agent_project_patches.owner_id
    )
  );

create policy "Users can update own agent project patches"
  on public.agent_project_patches for update to authenticated
  using (
    auth.uid() = agent_project_patches.owner_id
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patches.project_id
        and card.owner_id = agent_project_patches.owner_id
    )
  )
  with check (
    auth.uid() = agent_project_patches.owner_id
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patches.project_id
        and card.owner_id = agent_project_patches.owner_id
    )
  );

create policy "Users can delete own agent project patches"
  on public.agent_project_patches for delete to authenticated
  using (
    auth.uid() = agent_project_patches.owner_id
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patches.project_id
        and card.owner_id = agent_project_patches.owner_id
    )
  );

create policy "Users can read own agent project patch operations"
  on public.agent_project_patch_operations for select to authenticated
  using (
    auth.uid() = agent_project_patch_operations.owner_id
    and exists (
      select 1
      from public.agent_project_patches patch
      where patch.id = agent_project_patch_operations.patch_id
        and patch.owner_id = agent_project_patch_operations.owner_id
        and patch.project_id = agent_project_patch_operations.project_id
    )
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patch_operations.project_id
        and card.owner_id = agent_project_patch_operations.owner_id
    )
  );

create policy "Users can insert own agent project patch operations"
  on public.agent_project_patch_operations for insert to authenticated
  with check (
    auth.uid() = agent_project_patch_operations.owner_id
    and exists (
      select 1
      from public.agent_project_patches patch
      where patch.id = agent_project_patch_operations.patch_id
        and patch.owner_id = agent_project_patch_operations.owner_id
        and patch.project_id = agent_project_patch_operations.project_id
    )
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patch_operations.project_id
        and card.owner_id = agent_project_patch_operations.owner_id
    )
  );

create policy "Users can update own agent project patch operations"
  on public.agent_project_patch_operations for update to authenticated
  using (
    auth.uid() = agent_project_patch_operations.owner_id
    and exists (
      select 1
      from public.agent_project_patches patch
      where patch.id = agent_project_patch_operations.patch_id
        and patch.owner_id = agent_project_patch_operations.owner_id
        and patch.project_id = agent_project_patch_operations.project_id
    )
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patch_operations.project_id
        and card.owner_id = agent_project_patch_operations.owner_id
    )
  )
  with check (
    auth.uid() = agent_project_patch_operations.owner_id
    and exists (
      select 1
      from public.agent_project_patches patch
      where patch.id = agent_project_patch_operations.patch_id
        and patch.owner_id = agent_project_patch_operations.owner_id
        and patch.project_id = agent_project_patch_operations.project_id
    )
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patch_operations.project_id
        and card.owner_id = agent_project_patch_operations.owner_id
    )
  );

create policy "Users can delete own agent project patch operations"
  on public.agent_project_patch_operations for delete to authenticated
  using (
    auth.uid() = agent_project_patch_operations.owner_id
    and exists (
      select 1
      from public.agent_project_patches patch
      where patch.id = agent_project_patch_operations.patch_id
        and patch.owner_id = agent_project_patch_operations.owner_id
        and patch.project_id = agent_project_patch_operations.project_id
    )
    and exists (
      select 1
      from public.content_cards card
      where card.id = agent_project_patch_operations.project_id
        and card.owner_id = agent_project_patch_operations.owner_id
    )
  );

create index if not exists idx_agent_project_patches_project_created
  on public.agent_project_patches(project_id, created_at desc);

create index if not exists idx_agent_project_patches_run_id
  on public.agent_project_patches(run_id);

create index if not exists idx_agent_project_patch_operations_patch_index
  on public.agent_project_patch_operations(patch_id, operation_index);

create index if not exists idx_agent_project_patch_operations_project_created
  on public.agent_project_patch_operations(project_id, created_at desc);

grant select, insert, update, delete on table public.agent_project_patches to authenticated;
grant select, insert, update, delete on table public.agent_project_patch_operations to authenticated;

grant select, insert, update, delete on table public.agent_project_patches to service_role;
grant select, insert, update, delete on table public.agent_project_patch_operations to service_role;

commit;
