"use client";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { env } from "@/lib/env";

export default function SettingsPage() {
  return (
    <div>
      <PageHeading
        eyebrow="Settings"
        title="Studio settings"
        description="Keep the MVP honest about where data lives, where AI runs, and how the sample mode should behave during local dogfooding."
      />
      <div className="cmd-grid lg:grid-cols-2">
        <Panel>
          <h2 className="cmd-title text-3xl font-semibold">Environment</h2>
          <div className="mt-5 space-y-3 text-sm text-muted">
            <p>
              Data mode: <Badge>{env.isSampleMode ? "Sample" : "Supabase"}</Badge>
            </p>
            <p>
              NVIDIA NIM: <Badge>{env.hasAiConfig ? "Configured" : "Not configured"}</Badge>
            </p>
            <p>Supabase URL must be set through `.env.local` for live auth and storage.</p>
          </div>
        </Panel>
        <Panel>
          <h2 className="cmd-title text-3xl font-semibold">Creator principles</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-muted">
            <li>AI suggests. It never overwrites creator-authored content automatically.</li>
            <li>Supabase remains the source of truth when live credentials are present.</li>
            <li>Sample mode stays available for local demos and end-to-end tests.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
