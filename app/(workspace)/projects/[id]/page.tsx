/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Clapperboard,
  FileText,
  Film,
  FolderKanban,
  Loader2,
  MessageSquare,
  PlayCircle,
  Sparkles,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/ui/custom-select";
import { CreatorProgress } from "@/components/workspace/creator-progress";
import { useProjectWorkspace } from "@/components/workspace/hooks";
import { fetchJson } from "@/lib/fetcher";
import { statusLabels } from "@/lib/domain/content";
import { getDefaultMediaModel, getMediaModelPresets, mediaModalities, textModelPresets } from "@/lib/ai/model-registry";
import type { CardAsset, ChecklistItem, ContentStatus } from "@/lib/types";

const tabs = [
  { id: "overview", label: "Overview", icon: FolderKanban },
  { id: "script", label: "Script", icon: FileText },
  { id: "generate", label: "Generate", icon: Sparkles },
  { id: "story-assets", label: "Story/Assets", icon: Clapperboard },
  { id: "tasks", label: "Tasks", icon: PlayCircle },
  { id: "editor", label: "Editor", icon: Film },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

type TabId = (typeof tabs)[number]["id"];

function getAssetGroupLabel(asset: CardAsset) {
  return asset.sceneKey?.trim() || "Ungrouped";
}

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId | null) ?? "overview";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const { project, error, isLoading, refresh, isPending } = useProjectWorkspace(params.id);

  const [saving, setSaving] = useState(false);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatModel, setChatModel] = useState<string>(textModelPresets[0].id);
  const [generating, setGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [generationTitle, setGenerationTitle] = useState("");
  const [generationSceneKey, setGenerationSceneKey] = useState("");
  const [generationModality, setGenerationModality] = useState<(typeof mediaModalities)[number]>("image");
  const [generationModelId, setGenerationModelId] = useState(getDefaultMediaModel("image").id);
  const [generationCustomModelId, setGenerationCustomModelId] = useState("");

  const [overviewForm, setOverviewForm] = useState({
    title: "",
    status: "idea" as ContentStatus,
    format: "short",
    platform: "youtube",
  });
  const [scriptForm, setScriptForm] = useState({
    angle: "",
    hook: "",
    outline: "",
    script: "",
    caption: "",
    onScreenText: "",
    cta: "",
    notes: "",
  });
  const [analyticsForm, setAnalyticsForm] = useState({
    reflection: "",
    followUpIdea: "",
    watchTimeNote: "",
  });

  useEffect(() => {
    if (!project) return;

    setOverviewForm({
      title: project.title,
      status: project.status,
      format: project.format,
      platform: project.platform,
    });
    setScriptForm({
      angle: project.scriptLab.angle,
      hook: project.scriptLab.hook,
      outline: project.scriptLab.outline,
      script: project.scriptLab.script,
      caption: project.scriptLab.caption,
      onScreenText: project.scriptLab.onScreenText,
      cta: project.scriptLab.cta,
      notes: project.scriptLab.notes,
    });
    setAnalyticsForm({
      reflection: project.analyticsJournal.reflection,
      followUpIdea: project.analyticsJournal.followUpIdea,
      watchTimeNote: project.analyticsJournal.watchTimeNote,
    });
  }, [project]);

  useEffect(() => {
    const nextTab = searchParams.get("tab") as TabId | null;
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

  const groupedAssets = useMemo(() => {
    if (!project) return [];
    const groups = new Map<string, CardAsset[]>();
    for (const asset of project.assets) {
      const key = getAssetGroupLabel(asset);
      groups.set(key, [...(groups.get(key) ?? []), asset]);
    }
    return Array.from(groups.entries());
  }, [project]);

  const availableMediaModels = useMemo(
    () => getMediaModelPresets(generationModality),
    [generationModality],
  );

  useEffect(() => {
    const fallback = getDefaultMediaModel(generationModality);
    setGenerationModelId(fallback.id);
    setGenerationCustomModelId("");
  }, [generationModality]);

  if (isLoading) {
    return (
      <Panel className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </Panel>
    );
  }

  if (error || !project) {
    return <Panel>{error ?? "Unable to load project."}</Panel>;
  }

  const projectId = project.id;

  async function saveProjectPatch(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetchJson(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleProjectChat() {
    if (!chatPrompt.trim()) return;
    setGenerating(true);
    try {
      await fetchJson(`/api/projects/${projectId}/chat`, {
        method: "POST",
        body: JSON.stringify({ prompt: chatPrompt, model: chatModel }),
      });
      setChatPrompt("");
      refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function handleMediaGeneration() {
    if (!generationPrompt.trim()) return;
    setGenerating(true);
    try {
      await fetchJson(`/api/projects/${projectId}/generations`, {
        method: "POST",
        body: JSON.stringify({
          prompt: generationPrompt,
          modality: generationModality,
          title: generationTitle || undefined,
          sceneKey: generationSceneKey || undefined,
          modelId: generationCustomModelId || generationModelId,
          provider: availableMediaModels.find((item) => item.id === generationModelId)?.provider,
        }),
      });
      setGenerationPrompt("");
      setGenerationTitle("");
      refresh();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Project Workspace"
          title={project.title}
          description="One project hub for script decisions, generation history, storyboard assets, and editor handoff."
        />
        <div className="flex items-center gap-2">
          <Badge className="bg-accent/10 text-accent border-accent/20">
            {statusLabels[project.status]}
          </Badge>
            <Link href={`/editor/${projectId}`}>
            <Button className="text-xs">
              Open Editor <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <CreatorProgress currentStatus={project.status} cardId={project.id} />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-black/20 text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-muted">
                Project title
                <Input
                  className="mt-2"
                  value={overviewForm.title}
                  onChange={(event) => setOverviewForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="text-xs text-muted">
                Status
                <CustomSelect
                  className="mt-2"
                  value={overviewForm.status}
                  onChange={(value) =>
                    setOverviewForm((current) => ({ ...current, status: value as ContentStatus }))
                  }
                  options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-muted">
                Format
                <Input
                  className="mt-2"
                  value={overviewForm.format}
                  onChange={(event) => setOverviewForm((current) => ({ ...current, format: event.target.value }))}
                />
              </label>
              <label className="text-xs text-muted">
                Platform
                <Input
                  className="mt-2"
                  value={overviewForm.platform}
                  onChange={(event) => setOverviewForm((current) => ({ ...current, platform: event.target.value }))}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button disabled={saving} onClick={() => saveProjectPatch(overviewForm)}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save overview
              </Button>
            </div>
          </Panel>

          <Panel className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="cmd-label">Assets</p>
                <p className="mt-2 text-3xl font-semibold">{project.assets.length}</p>
              </div>
              <div>
                <p className="cmd-label">Chat Turns</p>
                <p className="mt-2 text-3xl font-semibold">{project.messages.length}</p>
              </div>
              <div>
                <p className="cmd-label">Generations</p>
                <p className="mt-2 text-3xl font-semibold">{project.generations.length}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-black/20 p-4">
              <p className="cmd-label text-accent">Continue</p>
              <p className="mt-2 text-sm text-muted">
                Jump back into {project.scriptLab.script ? "generation and asset organization" : "script shaping"}.
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => setActiveTab(project.scriptLab.script ? "generate" : "script")}>
                  Continue
                </Button>
                <Link href={`/editor/${project.id}`}>
                  <Button>Launch editor</Button>
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "script" && (
        <Panel className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs text-muted">
              Angle
              <Textarea className="mt-2" value={scriptForm.angle} onChange={(event) => setScriptForm((current) => ({ ...current, angle: event.target.value }))} />
            </label>
            <label className="text-xs text-muted">
              Hook
              <Textarea className="mt-2" value={scriptForm.hook} onChange={(event) => setScriptForm((current) => ({ ...current, hook: event.target.value }))} />
            </label>
          </div>
          <label className="text-xs text-muted">
            Outline
            <Textarea className="mt-2 min-h-28" value={scriptForm.outline} onChange={(event) => setScriptForm((current) => ({ ...current, outline: event.target.value }))} />
          </label>
          <label className="text-xs text-muted">
            Script
            <Textarea className="mt-2 min-h-40" value={scriptForm.script} onChange={(event) => setScriptForm((current) => ({ ...current, script: event.target.value }))} />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-xs text-muted">
              Caption
              <Textarea className="mt-2" value={scriptForm.caption} onChange={(event) => setScriptForm((current) => ({ ...current, caption: event.target.value }))} />
            </label>
            <label className="text-xs text-muted">
              On-screen text
              <Textarea className="mt-2" value={scriptForm.onScreenText} onChange={(event) => setScriptForm((current) => ({ ...current, onScreenText: event.target.value }))} />
            </label>
            <label className="text-xs text-muted">
              CTA
              <Textarea className="mt-2" value={scriptForm.cta} onChange={(event) => setScriptForm((current) => ({ ...current, cta: event.target.value }))} />
            </label>
          </div>
          <label className="text-xs text-muted">
            Notes
            <Textarea className="mt-2" value={scriptForm.notes} onChange={(event) => setScriptForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>
          <div className="flex justify-end">
            <Button disabled={saving} onClick={() => saveProjectPatch({ scriptLab: scriptForm })}>
              Save script
            </Button>
          </div>
        </Panel>
      )}

      {activeTab === "generate" && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="cmd-label text-accent">Project Copilot</p>
                <h3 className="mt-1 text-sm font-semibold">Persisted chat history</h3>
              </div>
              <CustomSelect
                value={chatModel}
                onChange={(value) => setChatModel(value)}
                options={textModelPresets.map((model) => ({ value: model.id, label: model.label }))}
              />
            </div>
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-black/20 p-4">
              {project.messages.length === 0 ? (
                <p className="text-sm text-muted">No project chat yet.</p>
              ) : (
                project.messages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-border/40 bg-black/20 p-3">
                    <p className="cmd-label mb-2">{message.role}</p>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))
              )}
            </div>
            <Textarea
              value={chatPrompt}
              onChange={(event) => setChatPrompt(event.target.value)}
              placeholder="Ask for the next beat, a tighter hook, or a better transition."
            />
            <div className="flex justify-end">
              <Button disabled={generating} onClick={handleProjectChat}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Save chat
              </Button>
            </div>
          </Panel>

          <Panel className="space-y-4">
            <div>
              <p className="cmd-label text-accent">Media Generation</p>
              <h3 className="mt-1 text-sm font-semibold">Hugging Face image, audio, and video outputs</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-muted">
                Modality
                <CustomSelect
                  className="mt-2"
                  value={generationModality}
                  onChange={(value) => setGenerationModality(value as (typeof mediaModalities)[number])}
                  options={mediaModalities.map((value) => ({ value, label: value.toUpperCase() }))}
                />
              </label>
              <label className="text-xs text-muted">
                Preset model
                <CustomSelect
                  className="mt-2"
                  value={generationModelId}
                  onChange={(value) => setGenerationModelId(value)}
                  options={availableMediaModels.map((model) => ({ value: model.id, label: model.label }))}
                />
              </label>
            </div>
            <label className="text-xs text-muted">
              Custom model ID
              <Input className="mt-2" value={generationCustomModelId} onChange={(event) => setGenerationCustomModelId(event.target.value)} placeholder="Optional Hugging Face model id" />
            </label>
            <label className="text-xs text-muted">
              Prompt
              <Textarea className="mt-2 min-h-32" value={generationPrompt} onChange={(event) => setGenerationPrompt(event.target.value)} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-muted">
                Asset title
                <Input className="mt-2" value={generationTitle} onChange={(event) => setGenerationTitle(event.target.value)} />
              </label>
              <label className="text-xs text-muted">
                Beat / scene
                <Input className="mt-2" value={generationSceneKey} onChange={(event) => setGenerationSceneKey(event.target.value)} placeholder="Intro beat" />
              </label>
            </div>
            <div className="flex justify-end">
              <Button disabled={generating} onClick={handleMediaGeneration}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate asset
              </Button>
            </div>
            <div className="space-y-2 rounded-xl border border-border/60 bg-black/20 p-4">
              {project.generations.map((generation) => (
                <div key={generation.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p>{generation.modality.toUpperCase()} · {generation.model}</p>
                    <p className="text-xs text-muted">{generation.status}</p>
                  </div>
                  <Badge className="border-border">{generation.provider}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "story-assets" && (
        <div className="space-y-6">
          {groupedAssets.map(([group, assets]) => (
            <Panel key={group} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="cmd-label text-accent">Beat</p>
                  <h3 className="mt-1 text-sm font-semibold">{group}</h3>
                </div>
                <Badge className="border-border">{assets.length} assets</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="rounded-xl border border-border/60 bg-black/20 p-4">
                    <p className="text-sm font-semibold">{asset.title}</p>
                    <p className="mt-1 text-xs text-muted">{asset.type}</p>
                    <p className="mt-3 text-sm text-muted whitespace-pre-wrap">{asset.note}</p>
                    <div className="mt-4 flex gap-2">
                      <Link href={`/editor/${projectId}?asset=${asset.id}`}>
                        <Button variant="secondary" className="text-xs">Send to editor</Button>
                      </Link>
                      {asset.url.startsWith("http") ? (
                        <a href={asset.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-accent">
                          Preview
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {([
            { label: "A-Roll", items: project.shootPack.aRoll },
            { label: "B-Roll", items: project.shootPack.bRoll },
            { label: "Screen Captures", items: project.shootPack.screenCaptures },
            { label: "Props", items: project.shootPack.props },
            { label: "Missing Assets", items: project.shootPack.missingAssets },
          ] as Array<{ label: string; items: ChecklistItem[] }>).map(({ label, items }) => (
            <Panel key={label} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{label}</h3>
                <Badge className="border-border">{items.length}</Badge>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted">No items yet.</p>
              ) : (
                items.map((item) => (
                  <label key={item.id} className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2 text-sm">
                    <input type="checkbox" checked={item.done} readOnly />
                    <span>{item.label}</span>
                  </label>
                ))
              )}
            </Panel>
          ))}
        </div>
      )}

      {activeTab === "editor" && (
        <Panel className="space-y-4">
          <div className="rounded-2xl border border-accent/20 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.24),rgba(10,10,12,0.95))] p-8">
            <p className="cmd-label text-accent">Editor handoff</p>
            <h3 className="mt-2 text-2xl font-semibold">Open the live editor with project assets ready</h3>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              SceneBook now opens the editor with project media already available and lets you focus a specific storyboard asset from the Story/Assets tab.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
                <Link href={`/editor/${projectId}`}>
                  <Button>Open editor</Button>
                </Link>
              {project.assets[0] ? (
                <Link href={`/editor/${projectId}?asset=${project.assets[0].id}`}>
                  <Button variant="secondary">Open with first asset</Button>
                </Link>
              ) : null}
            </div>
          </div>
        </Panel>
      )}

      {activeTab === "analytics" && (
        <Panel className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Panel className="bg-black/20">
              <p className="cmd-label">Views</p>
              <p className="mt-2 text-3xl font-semibold">{project.analyticsJournal.views}</p>
            </Panel>
            <Panel className="bg-black/20">
              <p className="cmd-label">Likes</p>
              <p className="mt-2 text-3xl font-semibold">{project.analyticsJournal.likes}</p>
            </Panel>
            <Panel className="bg-black/20">
              <p className="cmd-label">Shares</p>
              <p className="mt-2 text-3xl font-semibold">{project.analyticsJournal.shares}</p>
            </Panel>
          </div>
          <label className="text-xs text-muted">
            Reflection
            <Textarea className="mt-2" value={analyticsForm.reflection} onChange={(event) => setAnalyticsForm((current) => ({ ...current, reflection: event.target.value }))} />
          </label>
          <label className="text-xs text-muted">
            Watch-time note
            <Textarea className="mt-2" value={analyticsForm.watchTimeNote} onChange={(event) => setAnalyticsForm((current) => ({ ...current, watchTimeNote: event.target.value }))} />
          </label>
          <label className="text-xs text-muted">
            Follow-up idea
            <Textarea className="mt-2" value={analyticsForm.followUpIdea} onChange={(event) => setAnalyticsForm((current) => ({ ...current, followUpIdea: event.target.value }))} />
          </label>
          <div className="flex justify-end">
            <Button
              disabled={saving}
              onClick={() =>
                saveProjectPatch({
                  analyticsJournal: {
                    ...project.analyticsJournal,
                    ...analyticsForm,
                  },
                })
              }
            >
              Save analytics
            </Button>
          </div>
        </Panel>
      )}

      {(saving || isPending) && (
        <div className="fixed bottom-6 right-6 rounded-full border border-border bg-background/90 px-4 py-2 text-xs text-muted shadow-lg">
          <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />
          Saving project updates
        </div>
      )}
    </div>
  );
}
