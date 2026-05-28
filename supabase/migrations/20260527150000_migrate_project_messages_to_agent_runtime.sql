begin;

with project_message_groups as (
  select
    pm.owner_id,
    pm.card_id as project_id,
    cc.title as project_title,
    min(pm.created_at) as first_message_at,
    max(pm.created_at) as last_message_at,
    (
      select candidate.content
      from public.project_messages candidate
      where candidate.card_id = pm.card_id
        and candidate.owner_id = pm.owner_id
        and candidate.role = 'user'
      order by candidate.created_at asc
      limit 1
    ) as first_user_content
  from public.project_messages pm
  join public.content_cards cc
    on cc.id = pm.card_id
  group by pm.owner_id, pm.card_id, cc.title
),
existing_threads as (
  select distinct on (at.owner_id, at.project_id)
    at.id,
    at.owner_id,
    at.project_id
  from public.agent_threads at
  join project_message_groups groups
    on groups.owner_id = at.owner_id
   and groups.project_id = at.project_id
  where at.status = 'active'
  order by at.owner_id, at.project_id, at.updated_at desc, at.created_at desc
),
inserted_threads as (
  insert into public.agent_threads (
    owner_id,
    project_id,
    title,
    status,
    metadata,
    created_at,
    updated_at
  )
  select
    groups.owner_id,
    groups.project_id,
    coalesce(
      nullif(
        left(
          regexp_replace(
            regexp_replace(trim(coalesce(groups.first_user_content, '')), '^/[^\s]+\s*', ''),
            '\s+',
            ' ',
            'g'
          ),
          72
        ),
        ''
      ),
      groups.project_title
    ),
    'active',
    '{}'::jsonb,
    groups.first_message_at,
    groups.last_message_at
  from project_message_groups groups
  left join existing_threads existing
    on existing.owner_id = groups.owner_id
   and existing.project_id = groups.project_id
  where existing.id is null
  returning id, owner_id, project_id
),
resolved_threads as (
  select * from existing_threads
  union all
  select * from inserted_threads
)
update public.agent_threads at
set
  title = coalesce(
    nullif(
      left(
        regexp_replace(
          regexp_replace(trim(coalesce(groups.first_user_content, '')), '^/[^\s]+\s*', ''),
          '\s+',
          ' ',
          'g'
        ),
        72
      ),
      ''
    ),
    groups.project_title
  ),
  updated_at = greatest(at.updated_at, groups.last_message_at)
from project_message_groups groups
join resolved_threads resolved
  on resolved.owner_id = groups.owner_id
 and resolved.project_id = groups.project_id
where at.id = resolved.id;

with resolved_threads as (
  select distinct on (at.owner_id, at.project_id)
    at.id,
    at.owner_id,
    at.project_id
  from public.agent_threads at
  join public.project_messages pm
    on pm.owner_id = at.owner_id
   and pm.card_id = at.project_id
  where at.status = 'active'
  order by at.owner_id, at.project_id, at.updated_at desc, at.created_at desc
)
insert into public.agent_messages (
  owner_id,
  thread_id,
  project_id,
  role,
  content,
  model,
  provider,
  metadata,
  created_at
)
select
  pm.owner_id,
  resolved.id,
  pm.card_id,
  pm.role,
  pm.content,
  pm.model,
  pm.provider,
  pm.metadata,
  pm.created_at
from public.project_messages pm
join resolved_threads resolved
  on resolved.owner_id = pm.owner_id
 and resolved.project_id = pm.card_id
where not exists (
  select 1
  from public.agent_messages am
  where am.owner_id = pm.owner_id
    and am.thread_id = resolved.id
    and am.project_id = pm.card_id
    and am.role = pm.role
    and am.content = pm.content
    and am.created_at = pm.created_at
);

drop table if exists public.project_messages;

commit;
