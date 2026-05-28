# SceneBook Agent Runtime v2: Creative Producer Persistence Layer

This document outlines the persistence layer foundation added for Phase 0 of the Agent Runtime v2. This setup prepares the database schema for a proper creative producer agent with persistent creative briefs and active goal modes.

## Schema Architecture

We have introduced two primary tables under the `public` schema in Supabase:

### 1. `public.project_creative_briefs`

Stores the durable, persistent creative brief and discovery state for each content card/project.

* **Fields**:
  - `id` (`uuid`, primary key): Auto-generated unique identifier.
  - `owner_id` (`uuid`, references `auth.users` on delete cascade): User scope identifier.
  - `project_id` (`uuid`, references `public.content_cards` on delete cascade): Content card relationship.
  - `title` (`text`): Descriptive title for the brief (defaults to `'Untitled Brief'`).
  - `brief` (`jsonb`): Structured brief payload (e.g. platform guidelines, target audience, hooks, angles).
  - `open_questions` (`jsonb`): Clarifying questions raised by the AI producer to resolve with the creator.
  - `metadata` (`jsonb`): Optional structured settings and logs.
  - `created_at` / `updated_at` (`timestamptz`): Standard timestamps.

* **Performance & Safety**:
  - Indexed on `owner_id` and `project_id`.

---

### 2. `public.agent_goals`

Tracks active agent objectives, sub-steps, checklist progress, and follow-up actions when in goal execution mode.

* **Fields**:
  - `id` (`uuid`, primary key): Auto-generated unique identifier.
  - `owner_id` (`uuid`, references `auth.users` on delete cascade): User scope identifier.
  - `project_id` (`uuid`, references `public.content_cards` on delete cascade): Content card relationship.
  - `thread_id` (`uuid`, references `public.agent_threads` on delete set null): Optional conversation thread trace.
  - `title` (`text`): Short description of the goal.
  - `status` (`text`): Goal status (defaults to `'active'`).
  - `completed_steps` (`jsonb`): List of completed actions/milestones for the goal.
  - `next_actions` (`jsonb`): Future actions scheduled for execution.
  - `metadata` (`jsonb`): Optional structured payload.
  - `created_at` / `updated_at` (`timestamptz`): Standard timestamps.

* **Performance & Safety**:
  - Indexed on `owner_id`, `project_id`, `thread_id`, and `status`.

---

## Security (RLS)

Both tables strictly enforce owner-scoped Row-Level Security (RLS) policies:
- **Select**: Allowed only if `auth.uid() = owner_id`.
- **Insert**: Allowed only if `auth.uid() = owner_id`.
- **Update**: Allowed only if `auth.uid() = owner_id`.
- **Delete**: Allowed only if `auth.uid() = owner_id`.

Both tables grant full select, insert, update, and delete privileges to the `authenticated` and `service_role` database roles.
