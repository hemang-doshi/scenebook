/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Shield, Sparkles, Trash2 } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/fetcher";

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

const providerLabels: Record<ProviderKey, string> = {
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  nim: "NVIDIA NIM",
  huggingface: "Hugging Face",
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [creatorContext, setCreatorContext] = useState("");
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(true);
  const [oauthStatus, setOauthStatus] = useState<{ type: "success" | "error"; message?: string } | null>(null);

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

  useEffect(() => {
    // Safely check query params inside useEffect to avoid bailing out of Next.js prerendering
    const params = new URLSearchParams(window.location.search);
    const instagram = params.get("instagram");
    if (instagram === "success") {
      setOauthStatus({ type: "success", message: "Instagram account connected successfully!" });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (instagram === "error") {
      const msg = params.get("message") || "An error occurred during authentication.";
      setOauthStatus({ type: "error", message: msg });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function loadSocialAccounts() {
    try {
      const data = await fetchJson<any[]>("/api/instagram/accounts");
      setSocialAccounts(data);
    } catch (caught) {
      console.error("Failed to load social accounts:", caught);
    } finally {
      setLoadingSocial(false);
    }
  }

  async function handleDisconnect(id: string) {
    if (!confirm("Are you sure you want to disconnect this Instagram account?")) {
      return;
    }
    try {
      await fetchJson(`/api/instagram/accounts?id=${id}`, { method: "DELETE" });
      setSocialAccounts((curr) => curr.filter((acc) => acc.id !== id));
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Failed to disconnect account.");
    }
  }

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

    void load();
    void loadSocialAccounts();
  }, []);

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

  if (loading) {
    return (
      <Panel className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </Panel>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeading
        eyebrow="Preferences"
        title="Settings"
        description="Encrypted provider tokens, creator context, and environment fallback visibility."
      />

      {oauthStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
          oauthStatus.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          {oauthStatus.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold capitalize">{oauthStatus.type === "success" ? "Success" : "Connection Error"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{oauthStatus.message}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold">Provider Tokens</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              Tokens are stored encrypted. Settings only returns masked presence and whether each token comes from your account or the environment.
            </p>
          </div>

          <div className="space-y-4">
            {(Object.keys(providerLabels) as ProviderKey[]).map((provider) => (
              <div key={provider} className="rounded-xl border border-border/60 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{providerLabels[provider]}</p>
                    <p className="mt-1 text-xs text-muted">
                      {settings?.providers[provider].configured
                        ? `${settings.providers[provider].source} token: ${settings.providers[provider].maskedValue}`
                        : "Not configured"}
                    </p>
                  </div>
                  <Badge className="border-border">
                    {settings?.providers[provider].configured ? settings.providers[provider].source : "none"}
                  </Badge>
                </div>
                <div className="mt-4 flex gap-3">
                  <Input
                    value={providerInputs[provider]}
                    onChange={(event) =>
                      setProviderInputs((current) => ({
                        ...current,
                        [provider]: event.target.value,
                      }))
                    }
                    placeholder={`Replace ${providerLabels[provider]} token`}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setClearedProviders((current) => ({
                        ...current,
                        [provider]: !current[provider],
                      }))
                    }
                  >
                    {clearedProviders[provider] ? "Undo clear" : "Clear"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold">Creator Context</h2>
            </div>
            <Textarea
              className="mt-3 min-h-40"
              value={creatorContext}
              onChange={(event) => setCreatorContext(event.target.value)}
              placeholder="Audience, voice, framing, lighting, pacing, and what your videos should optimize for."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted">
              {error}
              {success ? (
                <span className="inline-flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Settings saved
                </span>
              ) : null}
            </div>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save settings
            </Button>
          </div>
        </Panel>

        <Panel className="space-y-4">
          <div>
            <p className="cmd-label text-accent">Account</p>
            <h2 className="mt-2 text-lg font-semibold">{settings?.userEmail ?? "Anonymous"}</h2>
          </div>
          
          <div className="rounded-xl border border-border/60 bg-black/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="cmd-label text-accent">Social Connections</p>
              <Button
                variant="secondary"
                className="h-7 px-2.5 text-[10px] rounded-lg"
                onClick={() => window.location.href = "/api/instagram/auth"}
              >
                <Plus className="h-3 w-3 mr-1" /> Connect
              </Button>
            </div>
            
            {loadingSocial ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted" />
              </div>
            ) : socialAccounts.length === 0 ? (
              <p className="text-xs text-muted">No social accounts connected. Connect your Instagram Professional account to publish reels and view insights.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {socialAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-black/40 border border-border/40">
                    <div className="flex items-center gap-2 min-w-0">
                      {account.profile_picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={account.profile_picture_url}
                          alt={account.account_username}
                          className="h-7 w-7 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500/10 text-pink-400 text-xs font-semibold">
                          IG
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate text-foreground">@{account.account_username}</p>
                        <p className="text-[10px] text-muted truncate">{account.account_name}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:text-red-400 text-muted flex items-center justify-center"
                      onClick={() => handleDisconnect(account.id)}
                      title="Disconnect account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-black/20 p-4">
            <p className="cmd-label">Encrypted settings</p>
            <p className="mt-2 text-sm text-muted">
              Raw provider keys are no longer returned to the client. Replace or clear tokens from this page when you need to rotate them.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-black/20 p-4">
            <p className="cmd-label">Media generation</p>
            <p className="mt-2 text-sm text-muted">
              Hugging Face media generation uses your encrypted BYOK token first, then falls back to the server environment token when available.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
