# SceneBook Cinematic OS

SceneBook is a Next.js creator workspace for moving one idea from capture to script, production, editing, publishing, and post-mortem learning. This repo now ships with a dark command-center UI based on the Stitch project `18257923334882431207` and includes a sample-mode studio editor.

## What is in the app

- `Sign In` command-center entry screen with sample-mode access
- `Home` dashboard with current focus, queue metrics, and pipeline watch
- `Inbox` capture queue with inline promotion into a content card
- `Production Board` status surface for the full lifecycle
- `Content Card` workspace for script, checklist, assets, AI suggestions, and analytics
- `Studio Editor` route with project media, preview stage, inspector controls, and timeline

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest for unit coverage
- Playwright for end-to-end verification
- DevDeck for local process control
- Supabase hooks and API routes for live mode

## Sample mode

Without live environment credentials, SceneBook runs in sample mode with:

- seeded cards, inbox items, and media references
- a local sample video at `public/media/sample-reel.mp4`
- in-memory create/update flows used by the UI and tests

This keeps the app runnable and demoable without external services.

## Stitch resources

The source HTML exports and screenshots for the referenced Stitch project are downloaded into `design/stitch/` and intentionally gitignored. They are local implementation references, not committed product assets.

## Local development

Install dependencies:

```bash
npm install
```

Start the app through DevDeck:

```bash
node ./node_modules/@hemangdoshi/devdeck/dist/index.js start
```

Check status:

```bash
node ./node_modules/@hemangdoshi/devdeck/dist/index.js status
```

The local app serves on [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Environment

Sample mode works with no env file.

For live mode, provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` or the configured AI provider values used by your deployment

Set those in `.env.local`.

## Verification

Run the full local verification set:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

## Project structure

```text
app/
  (workspace)/
    board/
    cards/[id]/
    home/
    inbox/
    settings/
    studio/[id]/
  api/
components/
lib/
public/media/
tests/
```

## Notes

- The workspace uses a command-center visual system with Geist + JetBrains Mono.
- The studio editor is sample-mode friendly and falls back to bundled media when a card only has non-previewable link assets.
- The fetched Stitch exports are for implementation reference only and are not part of the shipped UI bundle.
