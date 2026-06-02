begin;

alter table public.integration_connections
  drop constraint if exists integration_connections_project_id_fkey;

alter table public.integration_connections
  add constraint integration_connections_project_id_fkey
  foreign key (project_id)
  references public.content_cards(id)
  on delete set null;

alter table public.integration_events
  drop constraint if exists integration_events_project_id_fkey;

alter table public.integration_events
  add constraint integration_events_project_id_fkey
  foreign key (project_id)
  references public.content_cards(id)
  on delete set null;

drop policy if exists "Users can insert own integration connections" on public.integration_connections;
drop policy if exists "Users can update own integration connections" on public.integration_connections;
drop policy if exists "Users can delete own integration connections" on public.integration_connections;

drop policy if exists "Users can insert own integration events" on public.integration_events;
drop policy if exists "Users can update own integration events" on public.integration_events;
drop policy if exists "Users can delete own integration events" on public.integration_events;

create policy "Service role can manage integration connections"
  on public.integration_connections for all to service_role
  using (true)
  with check (true);

create policy "Service role can manage integration events"
  on public.integration_events for all to service_role
  using (true)
  with check (true);

revoke insert, update, delete on table public.integration_connections from authenticated;
revoke insert, update, delete on table public.integration_events from authenticated;

alter table public.integration_connections
  drop constraint if exists integration_connections_provider_check;

alter table public.integration_connections
  add constraint integration_connections_provider_check check (
    provider in ('google_drive', 'google_calendar', 'youtube', 'instagram', 'notion')
  );

alter table public.integration_events
  drop constraint if exists integration_events_provider_check;

alter table public.integration_events
  add constraint integration_events_provider_check check (
    provider in ('google_drive', 'google_calendar', 'youtube', 'instagram', 'notion')
  );

alter table public.integration_connections
  drop constraint if exists integration_connections_connected_requires_connection_id;

alter table public.integration_connections
  add constraint integration_connections_connected_requires_connection_id check (
    status <> 'connected' or connection_id is not null
  );

alter table public.integration_connections
  drop constraint if exists integration_connections_no_token_metadata;

alter table public.integration_connections
  add constraint integration_connections_no_token_metadata check (
    not (metadata ?| array[
      'access_token',
      'accessToken',
      'refresh_token',
      'refreshToken',
      'api_key',
      'apiKey',
      'client_secret',
      'clientSecret',
      'id_token',
      'idToken'
    ]::text[])
  );

alter table public.integration_events
  drop constraint if exists integration_events_no_token_metadata;

alter table public.integration_events
  add constraint integration_events_no_token_metadata check (
    not (metadata ?| array[
      'access_token',
      'accessToken',
      'refresh_token',
      'refreshToken',
      'api_key',
      'apiKey',
      'client_secret',
      'clientSecret',
      'id_token',
      'idToken'
    ]::text[])
  );

drop index if exists public.idx_integration_connections_owner_provider;

create or replace function public.set_integration_connections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_integration_connections_updated_at on public.integration_connections;

create trigger set_integration_connections_updated_at
  before update on public.integration_connections
  for each row
  execute function public.set_integration_connections_updated_at();

commit;
