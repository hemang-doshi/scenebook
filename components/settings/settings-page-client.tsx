"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  UserCircle2,
} from "lucide-react";

import { IntegrationCard } from "@/components/integrations/integration-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/fetcher";
import type { IntegrationSettingsCardModel } from "@/lib/integrations/settings-view-model";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { normalizeInstagramOAuthError, type InstagramOAuthNotice } from "@/lib/instagram/oauth";

type ProviderKey = "gemini" | "openrouter" | "nim" | "huggingface";

type SettingsResponse = {
  userEmail: string | null;
  creatorContext: string;
  providers: Record<
    ProviderKey,
    {
      configured: boolean;
      source: "user" | "env" | "none";
      maskedValue: string | null;
    }
  >;
};

type SettingsTab = "ai-providers" | "creator-context" | "social" | "integrations" | "account";

type SocialAccount = {
  id: string;
  account_name: string;
  account_username: string;
  profile_picture_url: string | null;
};

const providerLabels: Record<ProviderKey, string> = {
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  nim: "NVIDIA NIM",
  huggingface: "Hugging Face",
};

const tabOptions: Array<{ id: SettingsTab; label: string }> = [
  { id: "ai-providers", label: "AI Providers" },
  { id: "creator-context", label: "Creator Context" },
  { id: "social", label: "Social" },
  { id: "integrations", label: "Integrations" },
  { id: "account", label: "Account" },
];

function OAuthRecoveryCard({ notice, success }: { notice: InstagramOAuthNotice | null; success?: string | null }) {
  if (!notice && !success) {
    return null;
  }

  const isSuccess = Boolean(success);

  return (
    <Panel className={cn(
      "border p-5",
      isSuccess
        ? "border-[var(--success)]/25 bg-[rgba(124,242,154,.08)]"
        : "border-[var(--danger)]/25 bg-[rgba(255,93,115,.08)]",
    )}>
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--success)]" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--danger)]" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--ink)]">
            {isSuccess ? "Instagram connected" : notice?.title}
          </p>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            {isSuccess ? success : notice?.description}
          </p>
          {!isSuccess ? (
            <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
              {notice?.action}
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

export function SettingsPageClient({
  initialTab,
  integrationCards,
  oauthMessage,
  oauthReason,
}: {
  initialTab: SettingsTab;
  integrationCards: IntegrationSettingsCardModel[];
  oauthMessage?: string | null;
  oauthReason?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [creatorContext, setCreatorContext] = useState("");
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(true);
  const [providerInputs, setProviderInputs] = useState<Record<ProviderKey, string>>({
    gemini: "",
    openrouter: "",
    nim: "",
    huggingface: "",
  });
  const [clearedProviders, setClearedProviders] = useState<Record<ProviderKey, boolean>>({
    gemini: false,
    openrouter: false,
    nim: false,
    huggingface: false,
  });
  const oauthNotice = useMemo(() => {
    if (!oauthMessage) {
      return null;
    }

    return normalizeInstagramOAuthError(oauthReason ? `${oauthReason}:${oauthMessage}` : oauthMessage);
  }, [oauthMessage, oauthReason]);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetchJson<SettingsResponse>("/api/settings");
        setSettings(response);
        setCreatorContext(response.creatorContext);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load settings.");
      } finally {
        setLoading(false);
      }
    }

    async function loadSocialAccounts() {
      try {
        const data = await fetchJson<SocialAccount[]>("/api/instagram/accounts");
        setSocialAccounts(data);
      } catch (caught) {
        console.error("Failed to load social accounts:", caught);
      } finally {
        setLoadingSocial(false);
      }
    }

    void load();
    void loadSocialAccounts();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, document.title, `${url.pathname}?${url.searchParams.toString()}`);
  }, [activeTab]);

  async function handleDisconnect(id: string) {
    if (!confirm("Disconnect this Instagram account?")) {
      return;
    }

    try {
      await fetchJson(`/api/instagram/accounts?id=${id}`, { method: "DELETE" });
      setSocialAccounts((curr) => curr.filter((acc) => acc.id !== id));
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Failed to disconnect account.");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const providerTokens: Partial<Record<ProviderKey, string | null>> = {};

      for (const provider of Object.keys(providerInputs) as ProviderKey[]) {
        if (clearedProviders[provider]) {
          providerTokens[provider] = null;
        } else if (providerInputs[provider].trim()) {
          providerTokens[provider] = providerInputs[provider].trim();
        }
      }

      await fetchJson("/api/settings", {
        method: "POST",
        body: JSON.stringify({
          creatorContext,
          providerTokens,
        }),
      });

      const refreshed = await fetchJson<SettingsResponse>("/api/settings");
      setSettings(refreshed);
      setCreatorContext(refreshed.creatorContext);
      setProviderInputs({
        gemini: "",
        openrouter: "",
        nim: "",
        huggingface: "",
      });
      setClearedProviders({
        gemini: false,
        openrouter: false,
        nim: false,
        huggingface: false,
      });
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    const client = createSupabaseBrowserClient();
    await client.auth.signOut();
    window.location.href = "/sign-in";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ink)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[var(--container)] flex-col gap-6 px-4 py-8 md:px-6">
      <Panel className="border border-[var(--line)] bg-[rgba(255,255,255,.04)] p-6 md:p-8">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-mono uppercase tracking-[.12em] text-[var(--blue-2)]">Control Surface</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)] md:text-4xl">Settings</h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Provider tokens, creator context, social connections, Nango integrations, and account controls.
          </p>
        </div>
      </Panel>

      <OAuthRecoveryCard notice={oauthNotice} success={null} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Settings sections">
        {tabOptions.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={cn(
              "rounded-[var(--radius-pill)] border px-3 py-2 text-xs font-mono uppercase tracking-[.08em] transition-colors",
              activeTab === tab.id
                ? "border-[var(--coral)]/40 bg-[var(--coral)]/12 text-[var(--coral-2)]"
                : "border-[var(--line)] bg-[rgba(255,255,255,.03)] text-[var(--muted)] hover:text-[var(--ink)]",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ai-providers" ? (
        <Panel className="space-y-6 border border-[var(--line)] bg-[var(--canvas)] p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[var(--ink)]" />
            <h2 className="text-base font-bold text-[var(--ink)]">AI Providers</h2>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Tokens stay encrypted. This page only shows masked token presence and source.
          </p>

          <div className="space-y-4">
            {(Object.keys(providerInputs) as ProviderKey[]).map((provider) => (
              <div key={provider} className="rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--surface-soft)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{providerLabels[provider]}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {settings?.providers[provider].configured
                        ? `${settings.providers[provider].source} token: ${settings.providers[provider].maskedValue}`
                        : "Not configured"}
                    </p>
                  </div>
                  <Badge className="border border-[var(--hairline)] bg-[rgba(255,255,255,.03)] px-2 py-0.5 text-[10px] text-[var(--ink)]">
                    {settings?.providers[provider].configured ? settings.providers[provider].source : "none"}
                  </Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Input
                    value={providerInputs[provider]}
                    onChange={(event) =>
                      setProviderInputs((current) => ({ ...current, [provider]: event.target.value }))
                    }
                    placeholder={`Replace ${providerLabels[provider]} token`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 px-4 text-xs font-semibold"
                    onClick={() =>
                      setClearedProviders((current) => ({
                        ...current,
                        [provider]: !current[provider],
                      }))
                    }
                  >
                    {clearedProviders[provider] ? "Undo" : "Clear"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === "creator-context" ? (
        <Panel className="space-y-6 border border-[var(--line)] bg-[var(--canvas)] p-6 md:p-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--coral)]" />
            <h2 className="text-base font-bold text-[var(--ink)]">Creator Context</h2>
          </div>
          <Textarea
            className="min-h-48"
            value={creatorContext}
            onChange={(event) => setCreatorContext(event.target.value)}
            placeholder="Audience, voice, framing, lighting, pacing, and what your videos should optimize for."
          />
        </Panel>
      ) : null}

      {activeTab === "social" ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel className="space-y-5 border border-[var(--line)] bg-[var(--canvas)] p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-[.12em] text-[var(--blue-2)]">Social</p>
                <h2 className="mt-1 text-xl font-bold text-[var(--ink)]">Instagram direct connection</h2>
              </div>
              <Button
                variant="secondary"
                className="h-9 px-3 text-[11px]"
                onClick={() => {
                  window.location.href = "/api/instagram/auth";
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Connect
              </Button>
            </div>

            <OAuthRecoveryCard notice={oauthNotice} success={null} />

            {loadingSocial ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
              </div>
            ) : socialAccounts.length === 0 ? (
              <Panel className="border border-dashed border-[var(--line)] bg-[rgba(255,255,255,.02)] p-5">
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  No Instagram accounts are connected. This direct connection powers analytics and publishing today.
                </p>
              </Panel>
            ) : (
              <div className="space-y-3">
                {socialAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,255,255,.025)] p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {account.profile_picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={account.profile_picture_url}
                          alt={account.account_username}
                          className="h-9 w-9 rounded-full border border-[var(--line)] object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[rgba(255,255,255,.04)] text-xs font-semibold text-[var(--ink)]">
                          IG
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">@{account.account_username}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{account.account_name}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 text-[var(--muted)] hover:text-[var(--ink)]"
                      onClick={() => handleDisconnect(account.id)}
                      title="Disconnect account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="space-y-4 border border-[var(--line)] bg-[var(--canvas)] p-6 md:p-8">
            <p className="text-xs font-mono uppercase tracking-[.12em] text-[var(--blue-2)]">Diagnostics</p>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              SceneBook cannot bypass Meta eligibility rules. If Meta reports blocked API access, the next step is app review, permission approval, or account eligibility work outside this codebase.
            </p>
            <Link
              href="/settings?tab=integrations"
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[.08em] text-[var(--coral-2)]"
            >
              Open Nango integrations
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Panel>
        </div>
      ) : null}

      {activeTab === "integrations" ? (
        <Panel className="space-y-6 border border-[var(--line)] bg-[var(--canvas)] p-6 md:p-8">
          <div>
            <p className="text-xs font-mono uppercase tracking-[.12em] text-[var(--blue-2)]">Integrations</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--ink)]">Nango connection bridge</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              These providers use the existing Nango connection backend. Missing provider mappings remain visible as setup requirements.
            </p>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Integration providers">
            {integrationCards.map((provider) => (
              <IntegrationCard key={provider.provider} provider={provider} />
            ))}
          </section>
        </Panel>
      ) : null}

      {activeTab === "account" ? (
        <Panel className="space-y-5 border border-[var(--line)] bg-[var(--canvas)] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <UserCircle2 className="h-5 w-5 text-[var(--ink)]" />
            <div>
              <p className="text-xs font-mono uppercase tracking-[.12em] text-[var(--blue-2)]">Account</p>
              <h2 className="mt-1 text-xl font-bold text-[var(--ink)]">{settings?.userEmail ?? "Anonymous"}</h2>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Account controls also live in the workspace action rail for faster access while working.
          </p>
          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
            <div className="text-sm text-[var(--ink)]">
              {error}
              {success ? (
                <span className="inline-flex items-center gap-2 text-[var(--success)]">
                  <CheckCircle2 className="h-4 w-4" />
                  Settings saved
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="h-10 px-4 text-xs" onClick={handleSignOut}>
                Sign out
              </Button>
              <Button variant="primary" className="h-10 px-5 text-xs font-semibold" disabled={saving} onClick={handleSave}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save settings
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
