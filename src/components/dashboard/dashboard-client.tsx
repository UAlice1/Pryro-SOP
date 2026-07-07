"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Plus, Sparkles, Clock, CheckCircle, AlertCircle,
  TrendingUp, Activity, ArrowRight,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, timeAgo } from "@/lib/utils";

interface Stats {
  total: number;
  aiGenerated: number;
  drafts: number;
  published: number;
  pendingApprovals: number;
  aiUsage: number;
  recent: Array<{ id: string; title: string; status: string; isAIGenerated: boolean; updatedAt: string; department?: { name: string }; category?: { name: string; color: string } }>;
  recentActivity: Array<{ id: string; action: string; description: string; createdAt: string; sop?: { id: string; title: string }; user: { id: string; name: string; image?: string } }>;
}

export function DashboardClient({ userName }: { userName: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { title: "Total SOPs", value: stats?.total ?? 0, icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { title: "AI Generated", value: stats?.aiGenerated ?? 0, icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
    { title: "Drafts", value: stats?.drafts ?? 0, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
    { title: "Published", value: stats?.published ?? 0, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Good {getGreeting()}, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Here&apos;s what&apos;s happening with your SOPs.</p>
        </div>
        <Button asChild>
          <Link href="/sops/new"><Plus className="w-4 h-4 mr-2" /> New SOP</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold">{card.value}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Generate an SOP with AI</p>
            <p className="text-xs text-muted-foreground">Describe your process and let AI create a complete professional SOP in seconds.</p>
          </div>
          <Button asChild size="sm">
            <Link href="/sops/new?mode=ai">Generate Now <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent SOPs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent SOPs</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sops" className="text-xs text-muted-foreground hover:text-foreground">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-4 pb-4 space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : stats?.recent.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="divide-y divide-border">
                  {stats?.recent.map((sop) => (
                    <Link key={sop.id} href={`/sops/${sop.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {sop.isAIGenerated ? <Sparkles className="w-4 h-4 text-purple-500" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sop.title}</p>
                        <p className="text-xs text-muted-foreground">{sop.department?.name ?? "No department"} · {timeAgo(sop.updatedAt)}</p>
                      </div>
                      <Badge className={`text-xs shrink-0 ${STATUS_COLORS[sop.status]}`}>
                        {STATUS_LABELS[sop.status]}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" /> Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-4 pb-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stats?.recentActivity.slice(0, 8).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar className="w-6 h-6 mt-0.5 shrink-0">
                      <AvatarImage src={act.user.image ?? ""} />
                      <AvatarFallback className="text-[10px]">{act.user.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">{act.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(act.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {!stats?.recentActivity.length && (
                  <p className="text-xs text-muted-foreground text-center py-6">No activity yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Banner */}
      {stats && stats.pendingApprovals > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              You have <strong>{stats.pendingApprovals}</strong> SOP{stats.pendingApprovals > 1 ? "s" : ""} pending your approval.
            </p>
            <Button variant="outline" size="sm" className="ml-auto border-yellow-300 dark:border-yellow-700" asChild>
              <Link href="/sops?filter=pending">Review</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Usage */}
      {stats && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">AI Usage Statistics</p>
              <div className="flex items-center gap-4 mt-1">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.aiUsage}</p>
                  <p className="text-[10px] text-muted-foreground">Total Generations</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.aiGenerated}</p>
                  <p className="text-[10px] text-muted-foreground">AI-Generated SOPs</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.total > 0 ? Math.round((stats.aiGenerated / stats.total) * 100) : 0}%</p>
                  <p className="text-[10px] text-muted-foreground">AI Adoption Rate</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">Configure AI</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 px-4">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <FileText className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No SOPs yet</p>
      <p className="text-xs text-muted-foreground text-center">Create your first SOP manually or generate one with AI.</p>
      <Button size="sm" asChild><Link href="/sops/new"><Plus className="w-4 h-4 mr-1.5" /> Create SOP</Link></Button>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
