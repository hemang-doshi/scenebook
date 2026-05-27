begin;

create table if not exists public.asset_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  name text not null,
  parent_id uuid references public.asset_folders(id) on delete set null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.asset_folder_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid not null references public.asset_folders(id) on delete cascade,
  asset_id uuid not null references public.card_assets(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(folder_id, asset_id)
);

create table if not exists public.asset_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.content_cards(id) on delete cascade,
  asset_id uuid not null references public.card_assets(id) on delete cascade,
  generation_id uuid references public.generation_records(id) on delete set null,
  url text not null,
  model text,
  provider text,
  prompt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.asset_folders enable row level security;
alter table public.asset_folder_items enable row level security;
alter table public.asset_versions enable row level security;

create policy "Users can read own asset folders"
  on public.asset_folders
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own asset folders"
  on public.asset_folders
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own asset folders"
  on public.asset_folders
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own asset folders"
  on public.asset_folders
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own asset folder items"
  on public.asset_folder_items
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own asset folder items"
  on public.asset_folder_items
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own asset folder items"
  on public.asset_folder_items
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own asset folder items"
  on public.asset_folder_items
  for delete
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can read own asset versions"
  on public.asset_versions
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own asset versions"
  on public.asset_versions
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own asset versions"
  on public.asset_versions
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete own asset versions"
  on public.asset_versions
  for delete
  to authenticated
  using (auth.uid() = owner_id);

grant select, insert, update, delete on table public.asset_folders to authenticated;
grant select, insert, update, delete on table public.asset_folder_items to authenticated;
grant select, insert, update, delete on table public.asset_versions to authenticated;

grant select, insert, update, delete on table public.asset_folders to service_role;
grant select, insert, update, delete on table public.asset_folder_items to service_role;
grant select, insert, update, delete on table public.asset_versions to service_role;

commit;
