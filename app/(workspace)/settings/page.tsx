"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Key, Database, User, ShieldAlert, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { fetchJson } from "@/lib/fetcher";
import { useWorkspaceSnapshot } from "@/components/workspace/hooks";
import { env } from "@/lib/env";

export default function SettingsPage() {
  const { data: workspaceData } = useWorkspaceSnapshot();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form values
  const [userEmail, setUserEmail] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [nimApiKey, setNimApiKey] = useState("");
  const [creatorContext, setCreatorContext] = useState("");

  // Visibility toggles
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenRouter, setShowOpenRouter] = useState(false);
  const [showNim, setShowNim] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetchJson<{
          userEmail: string;
          geminiApiKey: string;
          openrouterApiKey: string;
          nimApiKey: string;
          creatorContext: string;
        }>("/api/settings");
        
        setUserEmail(res.userEmail || "");
        setGeminiApiKey(res.geminiApiKey || "");
        setOpenrouterApiKey(res.openrouterApiKey || "");
        setNimApiKey(res.nimApiKey || "");
        setCreatorContext(res.creatorContext || "");
      } catch (err) {
        console.error(err);
        setError("Failed to load settings from Supabase.");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      await fetchJson("/api/settings", {
        method: "POST",
        body: JSON.stringify({
          geminiApiKey,
          openrouterApiKey,
          nimApiKey,
          creatorContext,
        }),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation
  const totalCards = workspaceData?.cards?.length || 0;
  const activeProjects = workspaceData?.cards?.filter(c => c.status !== "archived" && c.status !== "posted" && c.status !== "analyzed")?.length || 0;
  const totalAssets = workspaceData?.cards?.reduce((acc, c) => acc + (c.assets?.length || 0), 0) || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
        <p className="text-xs font-mono text-muted uppercase tracking-widest">Loading Creator Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeading
        eyebrow="Preferences"
        title="Settings"
        description="Configure your custom API keys, edit your creator profile instructions, and review your workspace details."
      />

      <div className="cmd-grid lg:grid-cols-[1.3fr_0.7fr] gap-6 items-start">
        
        {/* Left Column: API Keys & Creator Profile */}
        <form onSubmit={handleSave} className="space-y-6">
          <Panel className="border-border bg-surface-soft space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                <Key className="h-4 w-4 text-accent" /> API Key Configuration
              </h2>
              <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                Provide custom API keys to run text, outline, and script generations. These keys are encrypted and saved securely in your Supabase account.
              </p>

              <div className="space-y-4">
                {/* Gemini API Key */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted flex justify-between">
                    <span>Google Gemini API Key</span>
                    <Badge className="text-[8px] tracking-normal font-sans py-0">Text & Multimodal</Badge>
                  </label>
                  <div className="relative">
                    <input
                      type={showGemini ? "text" : "password"}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder={geminiApiKey ? "••••••••••••••••••••••••••••••••••••" : "Enter Google Gemini API Key"}
                      className="w-full bg-black/35 border border-border rounded-lg pl-3 pr-10 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGemini(!showGemini)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={showGemini ? "Hide Gemini API Key" : "Show Gemini API Key"}
                    >
                      {showGemini ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* OpenRouter API Key */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted flex justify-between">
                    <span>OpenRouter API Key</span>
                    <Badge className="text-[8px] tracking-normal font-sans py-0">LLM Aggregator</Badge>
                  </label>
                  <div className="relative">
                    <input
                      type={showOpenRouter ? "text" : "password"}
                      value={openrouterApiKey}
                      onChange={(e) => setOpenrouterApiKey(e.target.value)}
                      placeholder={openrouterApiKey ? "••••••••••••••••••••••••••••••••••••" : "Enter OpenRouter API Key"}
                      className="w-full bg-black/35 border border-border rounded-lg pl-3 pr-10 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenRouter(!showOpenRouter)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={showOpenRouter ? "Hide OpenRouter API Key" : "Show OpenRouter API Key"}
                    >
                      {showOpenRouter ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* NIM API Key */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted flex justify-between">
                    <span>NVIDIA NIM API Key</span>
                    <Badge className="text-[8px] tracking-normal font-sans py-0">Hosted Llama/Gemma</Badge>
                  </label>
                  <div className="relative">
                    <input
                      type={showNim ? "text" : "password"}
                      value={nimApiKey}
                      onChange={(e) => setNimApiKey(e.target.value)}
                      placeholder={nimApiKey ? "••••••••••••••••••••••••••••••••••••" : "Enter NVIDIA NIM API Key"}
                      className="w-full bg-black/35 border border-border rounded-lg pl-3 pr-10 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNim(!showNim)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={showNim ? "Hide NIM API Key" : "Show NIM API Key"}
                    >
                      {showNim ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Creator Profile */}
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
                <Sparkles className="h-4 w-4 text-accent" /> Creator Profile Context
              </h2>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                Describe your audience, niche, tone of voice, lighting/visual style, and preferences. The AI will selectively inject this description to tailor text outputs to your personal style.
              </p>
              <textarea
                value={creatorContext}
                onChange={(e) => setCreatorContext(e.target.value)}
                placeholder="E.g., 'I make tech tutorials for software developers focusing on high-density information. My tone is educational, clear, and direct. I shoot on a Sony A7IV in a warm-lit studio, with coding overlays...'"
                className="w-full h-32 bg-black/35 border border-border rounded-lg p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none leading-relaxed"
              />
            </div>

            {/* Notifications & Submit */}
            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex-1">
                {error && <span className="text-[11px] font-mono text-red-400">{error}</span>}
                {success && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Settings saved successfully!
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="bg-accent text-accent-foreground text-xs font-mono uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-accent/90 transition shadow-lg cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save settings
              </button>
            </div>
          </Panel>
        </form>

        {/* Right Column: Account Stats & Policies */}
        <div className="space-y-6">
          {/* Stats Panel */}
          <Panel className="border-border bg-surface-soft space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/60 pb-3 mb-1">
              <User className="h-4 w-4 text-accent" /> Account Details
            </h2>
            
            <div className="space-y-3.5">
              <div>
                <span className="block text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Email Address</span>
                <span className="text-xs font-medium text-foreground">{userEmail || "anonymous@creator.os"}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                <div>
                  <span className="block text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Platform Mode</span>
                  <Badge className="mt-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Supabase DB</Badge>
                </div>
                <div>
                  <span className="block text-[9px] font-mono text-muted-foreground uppercase tracking-wider">NVIDIA NIM</span>
                  <Badge className="mt-1 text-muted border-border">{env.hasAiConfig ? "Ready" : "Offline"}</Badge>
                </div>
              </div>
            </div>
          </Panel>

          {/* Platform stats */}
          <Panel className="border-border bg-surface-soft space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/60 pb-3 mb-1">
              <Database className="h-4 w-4 text-accent" /> Database Stats
            </h2>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-black/25 border border-border p-3 rounded-lg">
                <span className="block text-[9px] font-mono text-muted uppercase">Total Ideas</span>
                <span className="block text-lg font-bold text-foreground mt-0.5">{totalCards}</span>
              </div>
              <div className="bg-black/25 border border-border p-3 rounded-lg">
                <span className="block text-[9px] font-mono text-muted uppercase">Active</span>
                <span className="block text-lg font-bold text-accent mt-0.5">{activeProjects}</span>
              </div>
              <div className="bg-black/25 border border-border p-3 rounded-lg">
                <span className="block text-[9px] font-mono text-muted uppercase">Files</span>
                <span className="block text-lg font-bold text-cyan-400 mt-0.5">{totalAssets}</span>
              </div>
            </div>
          </Panel>

          {/* Privacy Policy */}
          <Panel className="border-border bg-surface-soft space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/60 pb-3 mb-1">
              <ShieldAlert className="h-4 w-4 text-accent" /> Privacy & Security
            </h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              We care about your privacy. Your API keys are stored encrypted at rest and never shared with third-party tracking services. Read our complete <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a> to learn how we protect your creator properties.
            </p>
          </Panel>
        </div>

      </div>
    </div>
  );
}
