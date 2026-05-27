begin;

create table if not exists public.creator_social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'youtube', 'tiktok', 'linkedin', 'x')),
  account_name text not null,
  account_username text not null,
  account_id text not null, -- The Instagram Business Account ID or equivalent platform identifier
  access_token_encrypted text not null,
  profile_picture_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, platform, account_id)
);

alter table public.creator_social_accounts enable row level security;

create policy "Users can read own social accounts"
  on public.creator_social_accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own social accounts"
  on public.creator_social_accounts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own social accounts"
  on public.creator_social_accounts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own social accounts"
  on public.creator_social_accounts
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.creator_social_accounts to authenticated;
grant select, insert, update, delete on table public.creator_social_accounts to service_role;

commit;
