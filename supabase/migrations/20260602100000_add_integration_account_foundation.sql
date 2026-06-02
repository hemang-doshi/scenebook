begin;

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.content_cards(id) on delete cascade,
  provider text not null,
  connection_id text,
  status text not null default 'not_connected' check (
    status in ('not_connected', 'pending', 'connected', 'failed', 'revoked')
  ),
  scopes text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.content_cards(id) on delete cascade,
  integration_connection_id uuid references public.integration_connections(id) on delete set null,
  provider text not null,
  event_type text not null,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.integration_connections enable row level security;
alter table public.integration_events enable row level security;

create policy "Users can read own integration connections"
  on public.integration_connections for select to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own integration connections"
  on public.integration_connections for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own integration connections"
  on public.integration_connections for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own integration connections"
  on public.integration_connections for delete to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own integration events"
  on public.integration_events for select to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own integration events"
  on public.integration_events for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own integration events"
  on public.integration_events for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own integration events"
  on public.integration_events for delete to authenticated
  using (auth.uid() = owner_id);

create index if not exists idx_integration_connections_owner_provider
  on public.integration_connections(owner_id, provider);

create index if not exists idx_integration_connections_project
  on public.integration_connections(project_id, created_at desc);

create index if not exists idx_integration_events_owner_created
  on public.integration_events(owner_id, created_at desc);

create index if not exists idx_integration_events_connection_created
  on public.integration_events(integration_connection_id, created_at desc);

grant select, insert, update, delete on table public.integration_connections to authenticated;
grant select, insert, update, delete on table public.integration_events to authenticated;

grant select, insert, update, delete on table public.integration_connections to service_role;
grant select, insert, update, delete on table public.integration_events to service_role;

commit;
