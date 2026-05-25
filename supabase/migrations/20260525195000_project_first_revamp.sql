begin;

grant select, insert, update on table public.creator_settings to authenticated;
grant select, insert, update on table public.creator_settings to service_role;

alter table public.creator_settings
  add column if not exists gemini_api_key_encrypted text,
  add column if not exists openrouter_api_key_encrypted text,
  add column if not exists nim_api_key_encrypted text,
  add column if not exists huggingface_api_key_encrypted text;

create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.content_cards(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  provider text,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.project_messages enable row level security;

create policy "Users can read own project messages"
  on public.project_messages
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own project messages"
  on public.project_messages
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own project messages"
  on public.project_messages
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

grant select, insert, update on table public.project_messages to authenticated;
grant select, insert, update on table public.project_messages to service_role;

create table if not exists public.generation_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.content_cards(id) on delete cascade,
  provider text not null,
  model text not null,
  modality text not null check (modality in ('text', 'image', 'audio', 'video')),
  prompt text not null,
  status text not null check (status in ('queued', 'completed', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz
);

alter table public.generation_records enable row level security;

create policy "Users can read own generation records"
  on public.generation_records
  for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own generation records"
  on public.generation_records
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own generation records"
  on public.generation_records
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

grant select, insert, update on table public.generation_records to authenticated;
grant select, insert, update on table public.generation_records to service_role;

alter table public.card_assets
  add column if not exists storage_path text,
  add column if not exists source text not null default 'manual',
  add column if not exists scene_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists generation_id uuid references public.generation_records(id) on delete set null,
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

create index if not exists idx_project_messages_card_id_created_at
  on public.project_messages(card_id, created_at);

create index if not exists idx_generation_records_card_id_created_at
  on public.generation_records(card_id, created_at desc);

create index if not exists idx_card_assets_generation_id
  on public.card_assets(generation_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  52428800,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload own project assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own project assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own project assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public can read project assets"
  on storage.objects
  for select
  to public
  using (bucket_id = 'project-assets');

commit;
