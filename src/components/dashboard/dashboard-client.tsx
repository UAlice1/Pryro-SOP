"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Plus, Sparkles, Clock, CheckCircle, AlertCircle,
  TrendingUp, Activity, ArrowRight, BookOpen, PenLine,
  GitMerge, Eye, ShieldCheck, Users,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, timeAgo } from "@/lib/utils";
import { AIGenerateDialog } from "@/components/sops/ai-generate-dialog";

// ── Types ────────────────────────────────────────────────────────────────────

interface RecentSOP {
  id: string;
  title: string;
  status: string;
  isAIGenerated: boolean;
  updatedAt: string;
  version: number;
  author: { id: string; name: string | null; image: string | null };
  department?: { name: string };
  category?: { name: string; color: string };
}

interface PendingSOP {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  author: { id: string; name: string | null; image: string | null };
  department?: { name: string };
}

interface ActivityItem {
  id: string;
  action: string;
  description: string | null;
  createdAt: string;
  sop?: { id: string; title: string } | null;
  user: { id: string; name: string | null; image: string | null };
}

interface DashboardStats {
  total: number;
  aiGenerated: number;
  drafts: number;
  inReview: number;
  approved: number;
  published: number;
  pendingApprovalCount: number;
  aiUsage: number;
  recent: RecentSOP[];
  pendingApprovalSOPs: PendingSOP[];
  recentActivity: ActivityItem[];
  role: string;
  canViewAll: boolean;
  canApprove: boolean;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardClient({ userName }: { userName: string }) {
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey:    ["dashboard-stats"],
    queryFn:     fetchDashboardStats,
    staleTime:   30_000, // reuse cached data for 30 s
    refetchOnWindowFocus: true,
  });

  const role      = stats?.role ?? "EMPLOYEE";
  const canCreate = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"].includes(role);
  const canEdit   = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "EDITOR"].includes(role);
  const canApprove = stats?.canApprove ?? false;

  // ── Stat cards — role-aware ────────────────────────────────────────────────
  const statCards = [
    {
      title: "Total SOPs",
      value: stats?.total ?? 0,
      sub:   stats?.canViewAll ? "org-wide" : "your SOPs",
      icon:  FileText,
      color: "text-blue-500",
      bg:    "bg-blue-50 dark:bg-blue-950/30",
      href:  "/sops",
    },
    {
      title: "Drafts",
      value: stats?.drafts ?? 0,
      sub:   "in progress",
      icon:  Clock,
      color: "text-yellow-500",
      bg:    "bg-yellow-50 dark:bg-yellow-950/30",
      href:  "/sops?status=DRAFT",
    },
    {
      title: canApprove ? "Awaiting Approval" : "In Review",
      value: canApprove ? (stats?.pendingApprovalCount ?? 0) : (stats?.inReview ?? 0),
      sub:   canApprove ? "needs your review" : "under review",
      icon:  canApprove ? AlertCircle : GitMerge,
      color: canApprove && (stats?.pendingApprovalCount ?? 0) > 0 ? "text-orange-500" : "text-violet-500",
      bg:    canApprove && (stats?.pendingApprovalCount ?? 0) > 0
        ? "bg-orange-50 dark:bg-orange-950/30"
        : "bg-violet-50 dark:bg-violet-950/30",
      href:  "/sops?status=REVIEW",
    },
    {
      title: "Published",
      value: stats?.published ?? 0,
      sub:   "live & accessible",
      icon:  CheckCircle,
      color: "text-green-500",
      bg:    "bg-green-50 dark:bg-green-950/30",
      href:  "/sops?status=PUBLISHED",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Good {getGreeting()}, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here&apos;s your SOP status
            {stats?.canViewAll ? " across your organization." : "."}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setAiDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New SOP
          </Button>
        )}
      </div>

      {/* ── Pending approvals urgent banner ────────────────────────────────── */}
      {canApprove && (stats?.pendingApprovalCount ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
              <p className="text-sm text-orange-800 dark:text-orange-300 flex-1">
                <strong>{stats!.pendingApprovalCount}</strong> SOP{stats!.pendingApprovalCount > 1 ? "s are" : " is"} waiting for your approval.
              </p>
              <Button size="sm" variant="outline" className="border-orange-300 dark:border-orange-700 shrink-0" asChild>
                <Link href="/sops?status=REVIEW">Review now <ArrowRight className="w-3 h-3 ml-1.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link href={card.href}>
              <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-3xl font-bold">{card.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {canCreate && (
          <QuickAction
            icon={<Sparkles className="w-4 h-4 text-purple-500" />}
            bg="bg-purple-50 dark:bg-purple-950/30"
            title="Generate with AI"
            desc="Describe a process, get a full SOP"
            onClick={() => setAiDialogOpen(true)}
          />
        )}
        {canEdit && !canCreate && (
          <QuickAction
            icon={<PenLine className="w-4 h-4 text-blue-500" />}
            bg="bg-blue-50 dark:bg-blue-950/30"
            title="Edit SOPs"
            desc="Update existing procedures"
            href="/sops"
          />
        )}
        {canCreate && (
          <QuickAction
            icon={<PenLine className="w-4 h-4 text-blue-500" />}
            bg="bg-blue-50 dark:bg-blue-950/30"
            title="Create Manually"
            desc="Start from a blank template"
            href="/sops/new"
          />
        )}
        <QuickAction
          icon={<BookOpen className="w-4 h-4 text-green-500" />}
          bg="bg-green-50 dark:bg-green-950/30"
          title="Browse Library"
          desc="Search all SOPs in your org"
          href="/sops"
        />
        {canApprove && (
          <QuickAction
            icon={<ShieldCheck className="w-4 h-4 text-orange-500" />}
            bg="bg-orange-50 dark:bg-orange-950/30"
            title="Review Queue"
            desc="SOPs awaiting your approval"
            href="/sops?status=REVIEW"
          />
        )}
      </div>

      {/* ── Main content grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent SOPs — 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <RecentSOPsCard sops={stats?.recent ?? []} loading={isLoading} onGenerateClick={() => setAiDialogOpen(true)} canCreate={canCreate} />

          {/* Pending approvals list — only for APPROVER+ */}
          {canApprove && (
            <PendingApprovalsCard sops={stats?.pendingApprovalSOPs ?? []} loading={isLoading} />
          )}
        </div>

        {/* Right column — activity + AI stats */}
        <div className="space-y-6">
          <ActivityCard activity={stats?.recentActivity ?? []} loading={isLoading} canViewAll={stats?.canViewAll ?? false} />
          <AIStatsCard
            aiUsage={stats?.aiUsage ?? 0}
            aiGenerated={stats?.aiGenerated ?? 0}
            total={stats?.total ?? 0}
            loading={isLoading}
          />
        </div>
      </div>

      <AIGenerateDialog open={aiDialogOpen} onOpenChange={setAiDialogOpen} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuickAction({
  icon, bg, title, desc, href, onClick,
}: {
  icon: React.ReactNode;
  bg: string;
  title: string;
  desc: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );

  if (onClick) return <button onClick={onClick} className="w-full text-left">{inner}</button>;
  return <Link href={href!}>{inner}</Link>;
}

function RecentSOPsCard({
  sops, loading, onGenerateClick, canCreate,
}: {
  sops: RecentSOP[];
  loading: boolean;
  onGenerateClick: () => void;
  canCreate: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" /> Recently Created
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sops" className="text-xs text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="px-4 pb-4 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : sops.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 px-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No SOPs yet</p>
            <p className="text-xs text-muted-foreground text-center">
              {canCreate ? "Create your first SOP or generate one with AI." : "No SOPs have been created in your organization yet."}
            </p>
            {canCreate && (
              <Button size="sm" onClick={onGenerateClick}>
                <Plus className="w-4 h-4 mr-1.5" /> Create SOP
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sops.map((sop) => (
              <Link
                key={sop.id}
                href={`/sops/${sop.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {sop.isAIGenerated
                    ? <Sparkles className="w-4 h-4 text-purple-500" />
                    : <FileText className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sop.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {sop.author.name ?? "Unknown"}
                    {sop.department ? ` · ${sop.department.name}` : ""}
                    {" · "}v{sop.version}
                    {" · "}{timeAgo(sop.updatedAt)}
                  </p>
                </div>
                {sop.category && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 hidden sm:inline"
                    style={{
                      background: sop.category.color ? `${sop.category.color}20` : undefined,
                      color:      sop.category.color ?? undefined,
                      border:     `1px solid ${sop.category.color ?? "#e2e8f0"}40`,
                    }}
                  >
                    {sop.category.name}
                  </span>
                )}
                <Badge className={`text-xs shrink-0 ${STATUS_COLORS[sop.status]}`}>
                  {STATUS_LABELS[sop.status]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PendingApprovalsCard({ sops, loading }: { sops: PendingSOP[]; loading: boolean }) {
  return (
    <Card className="border-orange-100 dark:border-orange-900/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-orange-500" />
          Pending Approvals
          {sops.length > 0 && (
            <Badge className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 px-1.5">
              {sops.length}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sops?status=REVIEW" className="text-xs text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="px-4 pb-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : sops.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-6 text-center justify-center">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-muted-foreground">All caught up — no SOPs awaiting review.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sops.map((sop) => (
              <Link
                key={sop.id}
                href={`/sops/${sop.id}?tab=approval`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={sop.author.image ?? ""} />
                  <AvatarFallback className="text-[10px]">{sop.author.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sop.title}</p>
                  <p className="text-xs text-muted-foreground">
                    by {sop.author.name ?? "Unknown"}
                    {sop.department ? ` · ${sop.department.name}` : ""}
                    {" · "}{timeAgo(sop.updatedAt)}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0">
                  <Eye className="w-3 h-3 mr-1" /> Review
                </Button>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityCard({
  activity, loading, canViewAll,
}: {
  activity: ActivityItem[];
  loading: boolean;
  canViewAll: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" />
          {canViewAll ? "Org Activity" : "My Activity"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="px-4 pb-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : activity.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 px-4">No activity yet</p>
        ) : (
          <div className="divide-y divide-border">
            {activity.map((act) => (
              <div key={act.id} className="flex items-start gap-3 px-4 py-3">
                <Avatar className="w-6 h-6 mt-0.5 shrink-0">
                  <AvatarImage src={act.user.image ?? ""} />
                  <AvatarFallback className="text-[10px]">{act.user.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {act.sop ? (
                    <Link href={`/sops/${act.sop.id}`} className="text-xs leading-snug hover:text-primary transition-colors line-clamp-2">
                      {act.description ?? act.action}
                    </Link>
                  ) : (
                    <p className="text-xs leading-snug line-clamp-2">{act.description ?? act.action}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(act.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIStatsCard({
  aiUsage, aiGenerated, total, loading,
}: {
  aiUsage: number;
  aiGenerated: number;
  total: number;
  loading: boolean;
}) {
  const adoptionPct = total > 0 ? Math.round((aiGenerated / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-500" /> AI Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            <AIStatRow label="Generations" value={aiUsage} color="text-purple-600" />
            <AIStatRow label="AI SOPs" value={aiGenerated} color="text-blue-600" />
            <AIStatRow label="Adoption" value={`${adoptionPct}%`} color="text-green-600" />
            <Button variant="outline" size="sm" className="w-full mt-1 text-xs" asChild>
              <Link href="/settings/ai">Configure AI <ArrowRight className="w-3 h-3 ml-1.5" /></Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIStatRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
