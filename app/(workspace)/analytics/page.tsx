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
  color = "rgb(99, 102, 241)",
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
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MarkdownViewer({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-3 text-sm text-muted leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("#### ")) {
          return <h5 key={i} className="text-xs font-semibold text-foreground uppercase tracking-wider mt-4">{trimmed.slice(5)}</h5>;
        }
        if (trimmed.startsWith("### ")) {
          return <h4 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1.5">{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={i} className="text-base font-semibold text-accent mt-6 mb-3 border-b border-border/40 pb-1.5">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={i} className="text-lg font-bold text-foreground mt-7 mb-4">{trimmed.slice(2)}</h2>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 pl-4 animate-fade-in">
              <span className="text-accent">•</span>
              <span>{trimmed.slice(2)}</span>
            </div>
          );
        }
        if (trimmed.startsWith("> ")) {
          return <blockquote key={i} className="border-l-2 border-accent pl-3 italic text-muted-foreground my-2">{trimmed.slice(2)}</blockquote>;
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <Panel className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel className="p-6 border-rose-500/20 bg-rose-500/5 text-rose-400">
        <p className="font-semibold">Failed to load analytics dashboard:</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </Panel>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl">
        <PageHeading
          eyebrow="Performance"
          title="Analytics"
          description="Interactive insights, engagement metrics, and AI recommendations."
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

        <Panel className="flex flex-col items-center justify-center text-center p-12 py-20 border-dashed border-border/80">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-500/10 text-pink-400 mb-4 border border-pink-500/20">
            <InstagramIcon className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No Social Channels Connected</h2>
          <p className="mt-2 text-sm text-muted max-w-md">
            Connect an Instagram Professional account to start gathering real-time metrics, publishing videos, and auditing account trends.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => window.location.href = "/api/instagram/auth?returnTo=analytics"}>
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
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Performance"
          title="Analytics"
          description="Aggregated account KPIs, retention insights, and automated strategy auditing."
        />
        
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          {/* Last Synced Status Badge */}
          {activeAccount && (
            <div className="flex flex-col items-end">
              {activeAccount.lastSyncedAt ? (
                <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Synced {new Date(activeAccount.lastSyncedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Demo Data (Sync Required)
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-48">
              <CustomSelect
                value={selectedAccountId}
                onChange={(val) => {
                  setSelectedAccountId(val);
                  setAiReport(null); // Reset report when switching account
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
                className="h-9 px-3 border border-border/40 font-mono text-xs flex items-center gap-1.5"
                variant="secondary"
              >
                {syncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-muted" />
                )}
                Sync
              </Button>
            )}
          </div>
        </div>
      </div>

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

      {activeAccount && (
        <>
          {/* High-level KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="space-y-2 bg-black/15 border-border/40">
              <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider">
                <span>Followers</span>
                <Users className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {activeAccount.kpis.followers.toLocaleString()}
              </p>
            </Panel>

            <Panel className="space-y-2 bg-black/15 border-border/40">
              <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider">
                <span>Reach</span>
                <Eye className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {activeAccount.kpis.reach !== null && activeAccount.kpis.reach !== undefined 
                  ? activeAccount.kpis.reach.toLocaleString() 
                  : "—"}
              </p>
            </Panel>

            <Panel className="space-y-2 bg-black/15 border-border/40">
              <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider">
                <span>Views</span>
                <BarChart3 className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {activeAccount.kpis.views !== null && activeAccount.kpis.views !== undefined 
                  ? activeAccount.kpis.views.toLocaleString() 
                  : "—"}
              </p>
            </Panel>

            <Panel className="space-y-2 bg-black/15 border-border/40">
              <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider">
                <span>Engagement Rate</span>
                <Heart className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {activeAccount.kpis.engagementRate !== null && activeAccount.kpis.engagementRate !== undefined 
                  ? `${activeAccount.kpis.engagementRate}%` 
                  : "—"}
              </p>
            </Panel>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <Panel className="space-y-4">
              <div>
                <p className="cmd-label text-accent">Engagement trend</p>
                <h3 className="mt-1 text-sm font-semibold">Weekly Reach & View Spikes</h3>
              </div>
              <div className="h-40 w-full bg-black/30 rounded-xl p-2 border border-border/30 flex items-center justify-center">
                {activeAccount.trends.views && activeAccount.trends.views.some(v => v > 0) ? (
                  <SVGLineChart
                    dates={activeAccount.trends.dates}
                    values={activeAccount.trends.views}
                    color="rgb(99, 102, 241)"
                    gradId="viewsGrad"
                  />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-xs text-muted-foreground">No view metrics available to plot.</p>
                  </div>
                )}
              </div>
              {activeAccount.trends.dates && activeAccount.trends.dates.length > 0 && (
                <div className="flex justify-between text-[9px] text-muted font-mono px-1">
                  <span>{activeAccount.trends.dates[0]}</span>
                  <span>{activeAccount.trends.dates[Math.floor(activeAccount.trends.dates.length / 2)]}</span>
                  <span>{activeAccount.trends.dates[activeAccount.trends.dates.length - 1]}</span>
                </div>
              )}
            </Panel>

            <Panel className="space-y-4">
              <div>
                <p className="cmd-label text-accent">Audience growth</p>
                <h3 className="mt-1 text-sm font-semibold">Net Followers Gains (Last 30 days)</h3>
              </div>
              <div className="h-40 w-full bg-black/30 rounded-xl p-2 border border-border/30 flex items-center justify-center">
                {activeAccount.trends.followers && 
                activeAccount.trends.followers.length > 0 && 
                !activeAccount.trends.followers.every((val) => val === activeAccount.trends.followers[0]) ? (
                  <SVGLineChart
                    dates={activeAccount.trends.dates}
                    values={activeAccount.trends.followers}
                    color="rgb(236, 72, 153)"
                    gradId="followersGrad"
                  />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-xs text-muted-foreground">Historical follower trend is unavailable.</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-xs mx-auto">
                      Instagram Graph API does not provide retroactive follower history. Net gains timeline will build dynamically here over time.
                    </p>
                  </div>
                )}
              </div>
              {activeAccount.trends.dates && activeAccount.trends.dates.length > 0 && (
                <div className="flex justify-between text-[9px] text-muted font-mono px-1">
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
            <Panel className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <h2 className="text-base font-semibold">AI Insights Auditor</h2>
                </div>
                <Button disabled={auditing} onClick={handleAiAudit} className="h-8 text-xs font-mono">
                  {auditing ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Auditing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3.5 w-3.5" /> Run Audit
                    </>
                  )}
                </Button>
              </div>

              {auditing ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <p className="text-xs text-muted">Gemini is reviewing your views, reach, and scripts...</p>
                </div>
              ) : aiReport ? (
                <div className="rounded-xl border border-border/60 bg-black/45 p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <MarkdownViewer text={aiReport} />
                </div>
              ) : (
                <div className="rounded-xl border border-border/40 bg-black/20 p-8 text-center space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent mx-auto">
                     <BookOpen className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold">Automated Performance Summary</h4>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Analyze your recent posts, retention metrics, and caption copy to generate customized script iterations and follow-up hook recommendations.
                  </p>
                </div>
              )}
            </Panel>

            {/* Recent Posts Breakdown */}
            <Panel className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="cmd-label text-accent">Posts Breakdown</p>
                  <h2 className="mt-1 text-base font-semibold">Recent Reels & Video assets</h2>
                </div>
                
                {/* Grid vs Table Toggle */}
                <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-border/40 shrink-0">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition ${viewMode === "grid" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-md transition ${viewMode === "table" ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"}`}
                    title="Table View"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {viewMode === "grid" ? (
                // Grid View
                <div className="grid sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {activeAccount.posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => {
                        setSelectedPost(post);
                        setPostAudit(null);
                      }}
                      className="group cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-black/35 hover:border-accent/40 transition duration-300 flex flex-col"
                    >
                      <div className="relative aspect-video bg-black/45 w-full overflow-hidden border-b border-border/40">
                        {post.thumbnail_url || post.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.thumbnail_url || post.media_url}
                            alt={post.title}
                            className="object-cover w-full h-full group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <InstagramIcon className="h-6 w-6 text-muted-foreground/35" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-black/70 backdrop-blur-md border-border/60 text-[9px] capitalize px-2 py-0.5">
                            {post.format}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-accent transition duration-200">
                            {post.title}
                          </h4>
                          <p className="text-[9px] text-muted font-mono mt-1">
                            {new Date(post.publishedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>

                        {post.error && (
                          <div className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md line-clamp-2" title={post.error}>
                            {getInstagramInsightIssueLabel(post.error)}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-1 bg-black/40 p-2 rounded-lg text-center font-mono text-[9px] text-muted border border-border/20">
                          <div>
                            <p className="font-semibold text-foreground text-[10px]">{formatMetric(post.metrics.views)}</p>
                            <p className="text-[8px] text-muted-foreground mt-0.5">Views</p>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-[10px]">{formatMetric(post.metrics.likes)}</p>
                            <p className="text-[8px] text-muted-foreground mt-0.5">Likes</p>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-[10px]">{formatMetric(post.metrics.comments)}</p>
                            <p className="text-[8px] text-muted-foreground mt-0.5">Comments</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Table List View
                <div className="overflow-x-auto max-h-[500px] border border-border/40 rounded-xl custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 bg-black/45 text-[9px] font-mono text-muted uppercase tracking-wider">
                        <th className="p-3 pl-4 font-semibold">Title</th>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 text-right font-semibold">Views</th>
                        <th className="p-3 text-right font-semibold">Likes</th>
                        <th className="p-3 text-right font-semibold">Comments</th>
                        <th className="p-3 text-right font-semibold">Eng. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 bg-black/10 text-xs">
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
                            className="hover:bg-white/5 cursor-pointer transition duration-150"
                          >
                            <td className="p-3 pl-4 font-medium text-foreground truncate max-w-[160px]" title={post.title}>
                              <div className="font-medium truncate">{post.title}</div>
                              {post.error && (
                                <div className="text-[9px] text-amber-400 font-mono truncate" title={post.error}>
                                  {getInstagramInsightIssueLabel(post.error)}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground font-mono text-[10px] whitespace-nowrap">
                              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="p-3 text-right font-mono font-semibold text-foreground">
                              {views !== null && views !== undefined ? views.toLocaleString() : "—"}
                            </td>
                            <td className="p-3 text-right font-mono text-muted">
                              {post.metrics.likes !== null && post.metrics.likes !== undefined ? post.metrics.likes.toLocaleString() : "—"}
                            </td>
                            <td className="p-3 text-right font-mono text-muted">
                              {post.metrics.comments !== null && post.metrics.comments !== undefined ? post.metrics.comments.toLocaleString() : "—"}
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-400">
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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedPost(null)} />
          
          <div className="relative w-full max-w-4xl h-full bg-[#0a0a0c] border-l border-border/80 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <div>
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">{selectedPost.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  Published: {new Date(selectedPost.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-muted hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body: Two columns layout */}
            <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-6 p-6 custom-scrollbar">
              {/* Left Column: Embed */}
              <div className="flex flex-col justify-start space-y-4">
                <div className="relative w-full aspect-[4/5] bg-black/40 rounded-xl overflow-hidden border border-border/40 flex items-center justify-center">
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
                      <InstagramIcon className="h-10 w-10 text-muted mx-auto" />
                      <p className="text-xs text-muted">Preview unavailable (Private or missing permalink)</p>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  {selectedPost.permalink && (
                    <a
                      href={selectedPost.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center justify-center gap-1 font-mono"
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
                  <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-400 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Detailed Metrics Unavailable
                    </div>
                    <p className="text-muted text-[11px] leading-relaxed">
                      {selectedPost.error}
                    </p>
                  </div>
                )}

                {/* Post Metrics Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Post Performance</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-black/30 border border-border/40 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-mono">Views</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">
                        {selectedPost.metrics.views !== null && selectedPost.metrics.views !== undefined
                          ? selectedPost.metrics.views.toLocaleString()
                          : "—"}
                      </p>
                      {(() => {
                        const comp = getPostComparison(selectedPost);
                        if (!comp) return null;
                        const isAbove = comp.viewsDiff >= 0;
                        return (
                          <span className={`text-[8px] font-mono mt-1 block ${isAbove ? "text-emerald-400" : "text-amber-400"}`}>
                            {isAbove ? "+" : ""}{comp.viewsDiff.toFixed(0)}% {isAbove ? "above avg" : "below avg"}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="p-3 bg-black/30 border border-border/40 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-mono">Likes</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">
                        {selectedPost.metrics.likes !== null && selectedPost.metrics.likes !== undefined
                          ? selectedPost.metrics.likes.toLocaleString()
                          : "—"}
                      </p>
                      {(() => {
                        const comp = getPostComparison(selectedPost);
                        if (!comp) return null;
                        const isAbove = comp.likesDiff >= 0;
                        return (
                          <span className={`text-[8px] font-mono mt-1 block ${isAbove ? "text-emerald-400" : "text-amber-400"}`}>
                            {isAbove ? "+" : ""}{comp.likesDiff.toFixed(0)}% {isAbove ? "above avg" : "below avg"}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="p-3 bg-black/30 border border-border/40 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-mono">Comments</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">
                        {selectedPost.metrics.comments !== null && selectedPost.metrics.comments !== undefined
                          ? selectedPost.metrics.comments.toLocaleString()
                          : "—"}
                      </p>
                      {(() => {
                        const comp = getPostComparison(selectedPost);
                        if (!comp) return null;
                        const isAbove = comp.commentsDiff >= 0;
                        return (
                          <span className={`text-[8px] font-mono mt-1 block ${isAbove ? "text-emerald-400" : "text-amber-400"}`}>
                            {isAbove ? "+" : ""}{comp.commentsDiff.toFixed(0)}% {isAbove ? "above avg" : "below avg"}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-3 bg-black/20 border border-border/30 rounded-xl">
                      <p className="text-[9px] text-muted-foreground font-mono">Shares</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {selectedPost.metrics.shares !== null && selectedPost.metrics.shares !== undefined
                          ? selectedPost.metrics.shares.toLocaleString()
                          : "—"}
                      </p>
                    </div>
                    <div className="p-3 bg-black/20 border border-border/30 rounded-xl">
                      <p className="text-[9px] text-muted-foreground font-mono">Saves</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {selectedPost.metrics.saves !== null && selectedPost.metrics.saves !== undefined
                          ? selectedPost.metrics.saves.toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="border-border/40" />

                {/* Quick AI Audit */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" /> AI Performance Audit
                    </h4>
                    {!postAudit && (
                      <Button
                        disabled={auditingPost || selectedPost.metrics.views === null}
                        onClick={() => handlePostAudit(selectedPost)}
                        className="h-7 px-3 text-[10px] font-mono"
                      >
                        {auditingPost ? "Analyzing..." : "Analyze Hook"}
                      </Button>
                    )}
                  </div>

                  {auditingPost ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2 bg-black/10 border border-border/30 rounded-xl">
                      <Loader2 className="h-5 w-5 animate-spin text-accent" />
                      <p className="text-[10px] text-muted font-mono">Gemini is auditing post hooks & retention pacing...</p>
                    </div>
                  ) : postAudit ? (
                    <div className="rounded-xl border border-border/60 bg-black/35 p-5 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                      <MarkdownViewer text={postAudit} />
                      <div className="flex justify-end">
                        <Button variant="secondary" onClick={() => handlePostAudit(selectedPost)} className="h-6 text-[9px] font-mono" disabled={selectedPost.metrics.views === null}>
                          Re-Analyze
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-black/10 p-5 text-center">
                      <p className="text-xs text-muted">
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
