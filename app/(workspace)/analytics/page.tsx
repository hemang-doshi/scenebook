"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Eye,
  Heart,
  Sparkles,
  Loader2,
  ChevronRight,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  LayoutGrid,
  List,
  RefreshCw,
  X,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { fetchJson } from "@/lib/fetcher";
import { getInstagramInsightIssueLabel } from "@/lib/domain/instagram-analytics";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

type KPI = {
  followers: number;
  reach: number | null;
  impressions: number | null;
  engagementRate: number | null;
  views: number | null;
  likes: number;
  comments: number;
};

type Trends = {
  dates: string[];
  views: number[];
  followers: number[];
  engagement: number[];
};

type Post = {
  id: string;
  title: string;
  format: string;
  status: string;
  publishedAt: string;
  permalink?: string;
  media_url?: string;
  thumbnail_url?: string;
  media_type?: string;
  error?: string | null;
  metrics: {
    views: number | null;
    likes: number;
    comments: number;
    shares: number | null;
    saves: number | null;
    reach?: number | null;
    impressions?: number | null;
  };
};

type AccountAnalytics = {
  accountId: string;
  socialAccountId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  kpis: KPI;
  trends: Trends;
  posts: Post[];
  lastSyncedAt?: string | null;
};

function SVGLineChart({
  values,
  color = "rgb(0, 0, 0)",
  gradId,
}: {
  dates: string[];
  values: number[];
  color?: string;
  gradId: string;
}) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 10);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 500;
  const height = 120;
  const padding = 5;

  const points = values.map((val, index) => {
    const x = padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${padding + (width - padding * 2)},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--hairline)" strokeWidth="1" />
      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--hairline-soft)" strokeWidth="1" />
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MarkdownViewer({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-3 text-sm text-[var(--ink)]/80 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("#### ")) {
          return <h5 key={i} className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider mt-4">{trimmed.slice(5)}</h5>;
        }
        if (trimmed.startsWith("### ")) {
          return <h4 key={i} className="text-sm font-bold text-[var(--ink)] mt-4 mb-1.5">{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={i} className="text-base font-bold text-[var(--ink)] mt-6 mb-3 border-b border-[var(--hairline)] pb-1.5">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={i} className="text-lg font-bold text-[var(--ink)] mt-7 mb-4">{trimmed.slice(2)}</h2>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 pl-4 animate-fade-in text-sm">
              <span className="text-[var(--ink)]/60 select-none">•</span>
              <span>{trimmed.slice(2)}</span>
            </div>
          );
        }
        if (trimmed.startsWith("> ")) {
          return <blockquote key={i} className="border-l-2 border-[var(--ink)] pl-3 italic text-[var(--muted)] my-2">{trimmed.slice(2)}</blockquote>;
        }
        if (!trimmed) {
          return <div key={i} className="h-1.5" />;
        }
        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
}

function getInstagramShortcode(permalink?: string): string | null {
  if (!permalink) return null;
  const parts = permalink.split("/").filter(Boolean);
  const pIndex = parts.indexOf("p");
  if (pIndex !== -1 && parts[pIndex + 1]) {
    return parts[pIndex + 1];
  }
  const rIndex = parts.indexOf("reel");
  if (rIndex !== -1 && parts[rIndex + 1]) {
    return parts[rIndex + 1];
  }
  const match = permalink.match(/\/p\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const matchReel = permalink.match(/\/reel\/([a-zA-Z0-9_-]+)/);
  if (matchReel) return matchReel[1];
  return null;
}

function formatMetric(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toString();
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountAnalytics[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [auditing, setAuditing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [oauthStatus, setOauthStatus] = useState<{ type: "success" | "error"; message?: string } | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);

  // View state: grid vs table
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Drawer states
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postAudit, setPostAudit] = useState<string | null>(null);
  const [auditingPost, setAuditingPost] = useState(false);

  useEffect(() => {
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

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchJson<AccountAnalytics[]>("/api/analytics");
        setAccounts(data);
        if (data && data.length > 0) {
          setSelectedAccountId(data[0].accountId);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const activeAccount = accounts.find((acc) => acc.accountId === selectedAccountId);

  async function handleSync() {
    if (!selectedAccountId) return;
    setSyncing(true);
    try {
      const res = await fetchJson<AccountAnalytics>("/api/analytics/sync", {
        method: "POST",
        body: JSON.stringify({ accountId: selectedAccountId }),
      });
      setAccounts((prev) =>
        prev.map((acc) => (acc.accountId === selectedAccountId ? res : acc))
      );
      setOauthStatus({ type: "success", message: "Analytics synced with Instagram successfully!" });
    } catch (caught) {
      setOauthStatus({
        type: "error",
        message: caught instanceof Error ? caught.message : "Failed to sync analytics.",
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleAiAudit() {
    if (!activeAccount) return;
    setAuditing(true);
    setAiReport(null);

    try {
      const res = await fetchJson<{ report: string }>("/api/analytics/ai-insights", {
        method: "POST",
        body: JSON.stringify({ accountData: activeAccount }),
      });
      setAiReport(res.report);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Failed to generate AI audit.");
    } finally {
      setAuditing(false);
    }
  }

  async function handlePostAudit(post: Post) {
    if (!activeAccount) return;
    setAuditingPost(true);
    setPostAudit(null);
    try {
      const validPosts = activeAccount.posts.filter((p) => p.metrics.views !== null && p.metrics.views !== undefined);
      const postsCount = validPosts.length || 1;
      const totalViews = validPosts.reduce((sum, p) => sum + (p.metrics.views || 0), 0);
      const totalLikes = validPosts.reduce((sum, p) => sum + (p.metrics.likes || 0), 0);
      const totalComments = validPosts.reduce((sum, p) => sum + (p.metrics.comments || 0), 0);

      const averageMetrics = {
        views: Math.round(totalViews / postsCount),
        likes: Math.round(totalLikes / postsCount),
        comments: Math.round(totalComments / postsCount),
      };

      const res = await fetchJson<{ audit: string }>("/api/analytics/post-insights", {
        method: "POST",
        body: JSON.stringify({ post, averageMetrics }),
      });
      setPostAudit(res.audit);
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "Failed to generate post audit.");
    } finally {
      setAuditingPost(false);
    }
  }

  const getPostComparison = (post: Post) => {
    if (!activeAccount) return null;
    if (post.metrics.views === null || post.metrics.views === undefined) return null;

    const validPosts = activeAccount.posts.filter((p) => p.metrics.views !== null && p.metrics.views !== undefined);
    const postsCount = validPosts.length || 1;
    const totalViews = validPosts.reduce((sum, p) => sum + (p.metrics.views || 0), 0);
    const totalLikes = validPosts.reduce((sum, p) => sum + (p.metrics.likes || 0), 0);
    const totalComments = validPosts.reduce((sum, p) => sum + (p.metrics.comments || 0), 0);

    const avgViews = totalViews / postsCount || 1;
    const avgLikes = totalLikes / postsCount || 1;
    const avgComments = totalComments / postsCount || 1;

    const viewsDiff = ((post.metrics.views - avgViews) / avgViews) * 100;
    const likesDiff = ((post.metrics.likes - avgLikes) / avgLikes) * 100;
    const commentsDiff = ((post.metrics.comments - avgComments) / avgComments) * 100;

    return {
      viewsDiff,
      likesDiff,
      commentsDiff,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ink)]" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel className="p-6 border-[var(--danger)]/20 bg-[var(--surface-soft)] text-[var(--danger)] max-w-4xl mx-auto mt-8">
        <p className="font-semibold">Failed to load analytics dashboard:</p>
        <p className="text-xs text-[var(--muted)] mt-1">{error}</p>
      </Panel>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <PageHeading
          eyebrow="Performance"
          title="Analytics"
          description="Interactive insights, engagement metrics, and AI recommendations."
        />

        {oauthStatus && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
            oauthStatus.type === "success" 
              ? "bg-[var(--surface-soft)] border-[var(--hairline)] text-[var(--ink)]" 
              : "bg-[var(--surface-soft)] border-[var(--danger)]/20 text-[var(--danger)]"
          }`}>
            {oauthStatus.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold capitalize">{oauthStatus.type === "success" ? "Success" : "Connection Error"}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{oauthStatus.message}</p>
            </div>
          </div>
        )}

        <Panel className="flex flex-col items-center justify-center text-center p-12 py-20 border-dashed border-[var(--hairline)] bg-[var(--canvas)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--rounded-md)] bg-[var(--surface-soft)] text-[var(--ink)] mb-4 border border-[var(--hairline)]">
            <InstagramIcon className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-[var(--ink)]">No Social Channels Connected</h2>
          <p className="mt-2 text-sm text-[var(--muted)] max-w-md">
            Connect an Instagram Professional account to start gathering real-time metrics, publishing videos, and auditing account trends.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="primary" onClick={() => window.location.href = "/api/instagram/auth?returnTo=analytics"}>
              Connect Instagram <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Link href="/settings">
              <Button variant="secondary">
                Go to Settings
              </Button>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 pb-16">
      {/* Saturated Signature Block-Lime Header Block */}
      <Panel className="rounded-[var(--rounded-lg)] bg-[var(--block-lime)] text-[var(--ink)] border-0 p-8 md:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-mono tracking-widest text-[var(--ink)]/60 uppercase mb-2">Performance</p>
            <h1 className="type-display-lg text-3xl md:text-4xl font-bold tracking-tight text-[var(--ink)]">Analytics</h1>
            <p className="mt-2 text-sm md:text-base text-[var(--ink)]/80 leading-relaxed">
              Aggregated account KPIs, retention insights, and automated strategy auditing.
            </p>
            
            {activeAccount && (
              <div className="mt-4 flex items-center">
                {activeAccount.lastSyncedAt ? (
                  <Badge className="bg-[var(--canvas)] border border-[var(--hairline)] text-[var(--ink)] text-[10px] font-mono flex items-center gap-1.5 px-3 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink)] animate-pulse" />
                    Synced {new Date(activeAccount.lastSyncedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </Badge>
                ) : (
                  <Badge className="bg-[var(--canvas)] border border-[var(--hairline)] text-[var(--ink)] text-[10px] font-mono flex items-center gap-1.5 px-3 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink)] animate-pulse" />
                    Demo Data (Sync Required)
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-48">
              <CustomSelect
                value={selectedAccountId}
                onChange={(val) => {
                  setSelectedAccountId(val);
                  setAiReport(null);
                }}
                options={accounts.map((acc) => ({
                  value: acc.accountId,
                  label: `@${acc.username}`,
                }))}
              />
            </div>
            
            {activeAccount && (
              <Button
                disabled={syncing}
                onClick={handleSync}
                className="h-11 px-4 border border-[var(--hairline)] bg-[var(--canvas)] text-[var(--ink)] font-mono text-xs flex items-center gap-1.5"
                variant="secondary"
              >
                {syncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ink)]" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-[var(--ink)]" />
                )}
                Sync
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {oauthStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
          oauthStatus.type === "success" 
            ? "bg-[var(--surface-soft)] border-[var(--hairline)] text-[var(--ink)]" 
            : "bg-[var(--surface-soft)] border-[var(--danger)]/20 text-[var(--danger)]"
        }`}>
          {oauthStatus.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold capitalize">{oauthStatus.type === "success" ? "Success" : "Connection Error"}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{oauthStatus.message}</p>
          </div>
        </div>
      )}

      {activeAccount && (
        <>
          {/* High-level KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="space-y-2 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-6">
              <div className="flex items-center justify-between text-[var(--muted)] text-[10px] font-mono uppercase tracking-wider">
                <span>Followers</span>
                <Users className="h-4 w-4 text-[var(--ink)]" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-[var(--ink)]">
                {activeAccount.kpis.followers.toLocaleString()}
              </p>
            </Panel>

            <Panel className="space-y-2 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-6">
              <div className="flex items-center justify-between text-[var(--muted)] text-[10px] font-mono uppercase tracking-wider">
                <span>Reach</span>
                <Eye className="h-4 w-4 text-[var(--ink)]" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-[var(--ink)]">
                {activeAccount.kpis.reach !== null && activeAccount.kpis.reach !== undefined 
                  ? activeAccount.kpis.reach.toLocaleString() 
                  : "—"}
              </p>
            </Panel>

            <Panel className="space-y-2 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-6">
              <div className="flex items-center justify-between text-[var(--muted)] text-[10px] font-mono uppercase tracking-wider">
                <span>Views</span>
                <BarChart3 className="h-4 w-4 text-[var(--ink)]" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-[var(--ink)]">
                {activeAccount.kpis.views !== null && activeAccount.kpis.views !== undefined 
                  ? activeAccount.kpis.views.toLocaleString() 
                  : "—"}
              </p>
            </Panel>

            <Panel className="space-y-2 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-6">
              <div className="flex items-center justify-between text-[var(--muted)] text-[10px] font-mono uppercase tracking-wider">
                <span>Engagement Rate</span>
                <Heart className="h-4 w-4 text-[var(--ink)]" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-[var(--ink)]">
                {activeAccount.kpis.engagementRate !== null && activeAccount.kpis.engagementRate !== undefined 
                  ? `${activeAccount.kpis.engagementRate}%` 
                  : "—"}
              </p>
            </Panel>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <Panel className="space-y-4 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-6">
              <div>
                <p className="text-xs font-mono tracking-widest text-[var(--muted)] uppercase mb-1">Engagement trend</p>
                <h3 className="text-base font-bold text-[var(--ink)]">Weekly Reach & View Spikes</h3>
              </div>
              <div className="h-40 w-full bg-[var(--canvas)] rounded-[var(--rounded-md)] p-2 border border-[var(--hairline)] flex items-center justify-center">
                {activeAccount.trends.views && activeAccount.trends.views.some(v => v > 0) ? (
                  <SVGLineChart
                    dates={activeAccount.trends.dates}
                    values={activeAccount.trends.views}
                    color="rgb(0, 0, 0)"
                    gradId="viewsGrad"
                  />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-xs text-[var(--muted)]">No view metrics available to plot.</p>
                  </div>
                )}
              </div>
              {activeAccount.trends.dates && activeAccount.trends.dates.length > 0 && (
                <div className="flex justify-between text-[9px] text-[var(--muted)] font-mono px-1">
                  <span>{activeAccount.trends.dates[0]}</span>
                  <span>{activeAccount.trends.dates[Math.floor(activeAccount.trends.dates.length / 2)]}</span>
                  <span>{activeAccount.trends.dates[activeAccount.trends.dates.length - 1]}</span>
                </div>
              )}
            </Panel>

            <Panel className="space-y-4 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-6">
              <div>
                <p className="text-xs font-mono tracking-widest text-[var(--muted)] uppercase mb-1">Audience growth</p>
                <h3 className="text-base font-bold text-[var(--ink)]">Net Followers Gains (Last 30 days)</h3>
              </div>
              <div className="h-40 w-full bg-[var(--canvas)] rounded-[var(--rounded-md)] p-2 border border-[var(--hairline)] flex items-center justify-center">
                {activeAccount.trends.followers && 
                activeAccount.trends.followers.length > 0 && 
                !activeAccount.trends.followers.every((val) => val === activeAccount.trends.followers[0]) ? (
                  <SVGLineChart
                    dates={activeAccount.trends.dates}
                    values={activeAccount.trends.followers}
                    color="rgb(197, 176, 244)"
                    gradId="followersGrad"
                  />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-xs text-[var(--muted)]">Historical follower trend is unavailable.</p>
                    <p className="text-[10px] text-[var(--muted)]/70 mt-1 max-w-xs mx-auto leading-relaxed">
                      Instagram Graph API net gains timeline will build dynamically here over time.
                    </p>
                  </div>
                )}
              </div>
              {activeAccount.trends.dates && activeAccount.trends.dates.length > 0 && (
                <div className="flex justify-between text-[9px] text-[var(--muted)] font-mono px-1">
                  <span>{activeAccount.trends.dates[0]}</span>
                  <span>{activeAccount.trends.dates[Math.floor(activeAccount.trends.dates.length / 2)]}</span>
                  <span>{activeAccount.trends.dates[activeAccount.trends.dates.length - 1]}</span>
                </div>
              )}
            </Panel>
          </div>

          {/* AI Auditor & Recent Posts */}
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* AI Auditor */}
            <Panel className="space-y-6 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[var(--ink)] animate-pulse" />
                  <h2 className="text-base font-bold text-[var(--ink)]">AI Insights Auditor</h2>
                </div>
                <Button variant="primary" disabled={auditing} onClick={handleAiAudit} className="h-9 px-4 text-xs font-semibold">
                  {auditing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--on-primary)]" /> Auditing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" /> Run Audit
                    </>
                  )}
                </Button>
              </div>

              {auditing ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--ink)]" />
                  <p className="text-xs text-[var(--muted)]">Gemini is reviewing your views, reach, and scripts...</p>
                </div>
              ) : aiReport ? (
                <div className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] p-6 max-h-[500px] overflow-y-auto scrollbar-thin">
                  <MarkdownViewer text={aiReport} />
                </div>
              ) : (
                <div className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] p-8 text-center space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--rounded-md)] bg-[var(--canvas)] border border-[var(--hairline)] text-[var(--ink)] mx-auto">
                     <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--ink)]">Automated Performance Summary</h4>
                  <p className="text-xs text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
                    Analyze your recent posts, retention metrics, and caption copy to generate customized script iterations and follow-up hook recommendations.
                  </p>
                </div>
              )}
            </Panel>

            {/* Recent Posts Breakdown */}
            <Panel className="space-y-4 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-lg)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono tracking-widest text-[var(--muted)] uppercase mb-1">Posts Breakdown</p>
                  <h2 className="text-base font-bold text-[var(--ink)]">Recent Reels & Video assets</h2>
                </div>
                
                {/* Grid vs Table Toggle */}
                <div className="flex items-center gap-1 bg-[var(--surface-soft)] p-1 rounded-[var(--rounded-md)] border border-[var(--hairline)] shrink-0">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-[var(--rounded-md)] transition ${viewMode === "grid" ? "bg-[var(--canvas)] text-[var(--ink)] shadow-sm border border-[var(--hairline)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-[var(--rounded-md)] transition ${viewMode === "table" ? "bg-[var(--canvas)] text-[var(--ink)] shadow-sm border border-[var(--hairline)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
                    title="Table View"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {viewMode === "grid" ? (
                // Grid View
                <div className="grid sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
                  {activeAccount.posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => {
                        setSelectedPost(post);
                        setPostAudit(null);
                      }}
                      className="group cursor-pointer overflow-hidden rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--canvas)] hover:border-[var(--ink)] transition-colors duration-250 flex flex-col"
                    >
                      <div className="relative aspect-video bg-[var(--surface-soft)] w-full overflow-hidden border-b border-[var(--hairline)]">
                        {post.thumbnail_url || post.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.thumbnail_url || post.media_url}
                            alt={post.title}
                            className="object-cover w-full h-full group-hover:scale-[1.02] transition duration-200"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <InstagramIcon className="h-6 w-6 text-[var(--muted)]/40" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-[var(--canvas)] border border-[var(--hairline)] text-[var(--ink)] text-[9px] capitalize px-2 py-0.5">
                            {post.format}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--ink)] line-clamp-2 transition-colors duration-200">
                            {post.title}
                          </h4>
                          <p className="text-[9px] text-[var(--muted)] font-mono mt-1">
                            {new Date(post.publishedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>

                        {post.error && (
                          <div className="text-[9px] text-[var(--ink)] bg-[var(--surface-soft)] border border-[var(--hairline)] px-2 py-1 rounded-md line-clamp-2" title={post.error}>
                            {getInstagramInsightIssueLabel(post.error)}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-1 bg-[var(--surface-soft)] p-2 rounded-md text-center font-mono text-[9px] text-[var(--muted)] border border-[var(--hairline)]">
                          <div>
                            <p className="font-bold text-[var(--ink)] text-[10px]">{formatMetric(post.metrics.views)}</p>
                            <p className="text-[8px] text-[var(--muted)] mt-0.5">Views</p>
                          </div>
                          <div>
                            <p className="font-bold text-[var(--ink)] text-[10px]">{formatMetric(post.metrics.likes)}</p>
                            <p className="text-[8px] text-[var(--muted)] mt-0.5">Likes</p>
                          </div>
                          <div>
                            <p className="font-bold text-[var(--ink)] text-[10px]">{formatMetric(post.metrics.comments)}</p>
                            <p className="text-[8px] text-[var(--muted)] mt-0.5">Comments</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Table List View
                <div className="overflow-x-auto max-h-[500px] border border-[var(--hairline)] rounded-[var(--rounded-md)] scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--hairline)] bg-[var(--surface-soft)] text-[9px] font-mono text-[var(--muted)] uppercase tracking-wider">
                        <th className="p-3 pl-4 font-semibold">Title</th>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 text-right font-semibold">Views</th>
                        <th className="p-3 text-right font-semibold">Likes</th>
                        <th className="p-3 text-right font-semibold">Comments</th>
                        <th className="p-3 text-right font-semibold">Eng. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hairline)] text-xs">
                      {activeAccount.posts.map((post) => {
                        const views = post.metrics.views;
                        let rate = "—";
                        if (views !== null && views !== undefined && views > 0) {
                          const eng = (post.metrics.likes || 0) + (post.metrics.comments || 0) + (post.metrics.shares || 0) + (post.metrics.saves || 0);
                          rate = `${((eng / views) * 100).toFixed(1)}%`;
                        }
                        
                        return (
                          <tr
                            key={post.id}
                            onClick={() => {
                              setSelectedPost(post);
                              setPostAudit(null);
                            }}
                            className="hover:bg-[var(--surface-soft)]/55 cursor-pointer transition-colors duration-150"
                          >
                            <td className="p-3 pl-4 font-semibold text-[var(--ink)] truncate max-w-[160px]" title={post.title}>
                              <div className="font-semibold truncate">{post.title}</div>
                              {post.error && (
                                <div className="text-[9px] text-[var(--muted)] font-mono truncate" title={post.error}>
                                  {getInstagramInsightIssueLabel(post.error)}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-[var(--muted)] font-mono text-[10px] whitespace-nowrap">
                              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-[var(--ink)]">
                              {views !== null && views !== undefined ? views.toLocaleString() : "—"}
                            </td>
                            <td className="p-3 text-right font-mono text-[var(--muted)]">
                              {post.metrics.likes !== null && post.metrics.likes !== undefined ? post.metrics.likes.toLocaleString() : "—"}
                            </td>
                            <td className="p-3 text-right font-mono text-[var(--muted)]">
                              {post.metrics.comments !== null && post.metrics.comments !== undefined ? post.metrics.comments.toLocaleString() : "—"}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-[var(--ink)]">
                              {rate}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

      {/* Slide-Over Drawer (Media Viewer) */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedPost(null)} />
          
          <div className="relative w-full max-w-4xl h-full bg-[var(--canvas)] border-l border-[var(--hairline)] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-350">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--hairline)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--ink)] line-clamp-1">{selectedPost.title}</h3>
                <p className="text-[10px] text-[var(--muted)] mt-0.5 font-mono">
                  Published: {new Date(selectedPost.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 hover:bg-[var(--surface-soft)] rounded-[var(--rounded-md)] text-[var(--ink)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body: Two columns layout */}
            <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-6 p-6 scrollbar-thin">
              {/* Left Column: Embed */}
              <div className="flex flex-col justify-start space-y-4">
                <div className="relative w-full aspect-[4/5] bg-[var(--surface-soft)] rounded-[var(--rounded-md)] overflow-hidden border border-[var(--hairline)] flex items-center justify-center">
                  {getInstagramShortcode(selectedPost.permalink) ? (
                    <iframe
                      src={`https://www.instagram.com/p/${getInstagramShortcode(selectedPost.permalink)}/embed`}
                      className="absolute inset-0 w-full h-full border-0"
                      allowTransparency
                      allowFullScreen
                      scrolling="no"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <InstagramIcon className="h-10 w-10 text-[var(--muted)] mx-auto" />
                      <p className="text-xs text-[var(--muted)]">Preview unavailable (Private or missing permalink)</p>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  {selectedPost.permalink && (
                    <a
                      href={selectedPost.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--ink)] hover:underline flex items-center justify-center gap-1 font-mono font-semibold"
                    >
                      View original post on Instagram <ChevronRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Right Column: Metrics, Badges, Audit */}
              <div className="space-y-6">
                {/* Error Banner */}
                {selectedPost.error && (
                  <div className="p-4 rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] text-[var(--danger)] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Detailed Metrics Unavailable
                    </div>
                    <p className="text-[var(--muted)] text-[11px] leading-relaxed">
                      {selectedPost.error}
                    </p>
                  </div>
                )}

                {/* Post Metrics Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono tracking-widest text-[var(--muted)] uppercase">Post Performance</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-md)]">
                      <p className="text-[10px] text-[var(--muted)] font-mono">Views</p>
                      <p className="text-lg font-bold text-[var(--ink)] mt-0.5">
                        {selectedPost.metrics.views !== null && selectedPost.metrics.views !== undefined
                          ? selectedPost.metrics.views.toLocaleString()
                          : "—"}
                      </p>
                      {(() => {
                        const comp = getPostComparison(selectedPost);
                        if (!comp) return null;
                        const isAbove = comp.viewsDiff >= 0;
                        return (
                          <span className={`text-[8px] font-mono mt-1 block ${isAbove ? "text-[var(--ink)] font-bold" : "text-[var(--muted)]"}`}>
                            {isAbove ? "+" : ""}{comp.viewsDiff.toFixed(0)}% {isAbove ? "above avg" : "below avg"}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="p-3 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-md)]">
                      <p className="text-[10px] text-[var(--muted)] font-mono">Likes</p>
                      <p className="text-lg font-bold text-[var(--ink)] mt-0.5">
                        {selectedPost.metrics.likes !== null && selectedPost.metrics.likes !== undefined
                          ? selectedPost.metrics.likes.toLocaleString()
                          : "—"}
                      </p>
                      {(() => {
                        const comp = getPostComparison(selectedPost);
                        if (!comp) return null;
                        const isAbove = comp.likesDiff >= 0;
                        return (
                          <span className={`text-[8px] font-mono mt-1 block ${isAbove ? "text-[var(--ink)] font-bold" : "text-[var(--muted)]"}`}>
                            {isAbove ? "+" : ""}{comp.likesDiff.toFixed(0)}% {isAbove ? "above avg" : "below avg"}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="p-3 bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--rounded-md)]">
                      <p className="text-[10px] text-[var(--muted)] font-mono">Comments</p>
                      <p className="text-lg font-bold text-[var(--ink)] mt-0.5">
                        {selectedPost.metrics.comments !== null && selectedPost.metrics.comments !== undefined
                          ? selectedPost.metrics.comments.toLocaleString()
                          : "—"}
                      </p>
                      {(() => {
                        const comp = getPostComparison(selectedPost);
                        if (!comp) return null;
                        const isAbove = comp.commentsDiff >= 0;
                        return (
                          <span className={`text-[8px] font-mono mt-1 block ${isAbove ? "text-[var(--ink)] font-bold" : "text-[var(--muted)]"}`}>
                            {isAbove ? "+" : ""}{comp.commentsDiff.toFixed(0)}% {isAbove ? "above avg" : "below avg"}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-3 bg-[var(--surface-soft)] border border-[var(--hairline)] rounded-[var(--rounded-md)]">
                      <p className="text-[9px] text-[var(--muted)] font-mono">Shares</p>
                      <p className="text-sm font-semibold text-[var(--ink)] mt-0.5">
                        {selectedPost.metrics.shares !== null && selectedPost.metrics.shares !== undefined
                          ? selectedPost.metrics.shares.toLocaleString()
                          : "—"}
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--surface-soft)] border border-[var(--hairline)] rounded-[var(--rounded-md)]">
                      <p className="text-[9px] text-[var(--muted)] font-mono">Saves</p>
                      <p className="text-sm font-semibold text-[var(--ink)] mt-0.5">
                        {selectedPost.metrics.saves !== null && selectedPost.metrics.saves !== undefined
                          ? selectedPost.metrics.saves.toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[var(--hairline)]" />

                {/* Quick AI Audit */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono tracking-widest text-[var(--muted)] uppercase flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--ink)] animate-pulse" /> AI Performance Audit
                    </h4>
                    {!postAudit && (
                      <Button
                        disabled={auditingPost || selectedPost.metrics.views === null}
                        onClick={() => handlePostAudit(selectedPost)}
                        className="h-8 px-3 text-xs font-semibold rounded-[var(--rounded-md)]"
                        variant="primary"
                      >
                        {auditingPost ? "Analyzing..." : "Analyze Hook"}
                      </Button>
                    )}
                  </div>

                  {auditingPost ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2 bg-[var(--surface-soft)] border border-[var(--hairline)] rounded-[var(--rounded-md)]">
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--ink)]" />
                      <p className="text-[10px] text-[var(--muted)] font-mono">Gemini is auditing post hooks & retention pacing...</p>
                    </div>
                  ) : postAudit ? (
                    <div className="rounded-[var(--rounded-md)] border border-[var(--hairline)] bg-[var(--surface-soft)] p-5 space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                      <MarkdownViewer text={postAudit} />
                      <div className="flex justify-end pt-2 border-t border-[var(--hairline)]">
                        <Button variant="secondary" onClick={() => handlePostAudit(selectedPost)} className="h-7 px-3 text-[10px]" disabled={selectedPost.metrics.views === null}>
                          Re-Analyze
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[var(--rounded-md)] border border-dashed border-[var(--hairline)] bg-[var(--surface-soft)]/50 p-5 text-center">
                      <p className="text-xs text-[var(--muted)] leading-relaxed">
                        {selectedPost.metrics.views === null
                          ? `${getInstagramInsightIssueLabel(selectedPost.error)}: AI auditing requires view metrics for this post.`
                          : "Audit this post to diagnose hook pacing and get iteration script recommendations."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
