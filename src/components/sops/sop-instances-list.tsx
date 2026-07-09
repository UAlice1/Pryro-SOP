"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Play, RefreshCw, Eye, Clock, CheckCircle2,
  Loader2, Activity, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface TaskExecution {
  id:          string;
  isCompleted: boolean;
  completedAt: string | null;
  checklistItem: {
    id:           string;
    text:         string;
    priority:     string | null;
    assignedRole: string | null;
  };
  completedBy: { id: string; name: string | null } | null;
}

interface Instance {
  id:          string;
  name:        string;
  status:      string;
  launchedAt:  string;
  completedAt: string | null;
  launchedBy:  { id: string; name: string | null; image: string | null };
  taskExecutions: TaskExecution[];
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function calcProgress(execs: TaskExecution[]): number {
  if (!execs.length) return 0;
  return Math.round((execs.filter((e) => e.isCompleted).length / execs.length) * 100);
}

function StatusBadge({ status }: { status: string }) {
  const isComplete = status === "COMPLETED";
  return (
    <Badge
      className={cn(
        "text-[10px] px-2 py-0.5 font-medium gap-1",
        isComplete
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      )}
    >
      {isComplete
        ? <CheckCircle2 className="w-2.5 h-2.5" />
        : <Clock className="w-2.5 h-2.5 animate-pulse" />}
      {isComplete ? "Completed" : "In Progress"}
    </Badge>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function SOPInstancesList({ sopId }: { sopId: string }) {
  const params    = useParams<{ id: string }>();
  const routeId   = sopId || params?.id || "";

  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [launching, setLaunching] = useState(false);

  const fetchInstances = useCallback(async () => {
    if (!routeId) return;
    try {
      const res = await fetch(`/api/sops/instances?sopId=${routeId}`);
      if (res.ok) setInstances(await res.json());
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const res = await fetch("/api/sops/instances", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sopId: routeId }),
      });
      if (res.ok) {
        toast.success("Execution instance launched");
        fetchInstances();
      } else {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? "Failed to launch");
      }
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Execution History
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Loading…" : `${instances.length} run${instances.length !== 1 ? "s" : ""} recorded`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchInstances}
            aria-label="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleLaunch}
            disabled={launching}
          >
            {launching
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Plus className="w-3 h-3" />}
            {launching ? "Launching…" : "New Run"}
          </Button>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && instances.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Play className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">No executions yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Launch a run to track who completes which steps in real time.
              </p>
            </div>
            <Button size="sm" onClick={handleLaunch} disabled={launching} className="gap-1.5">
              {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Launch First Run
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instances table */}
      {!loading && instances.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-4 border-b border-border bg-muted/30">
            <div className="grid grid-cols-[1fr_130px_90px_120px_80px_auto] gap-3 items-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Run / Name</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operator</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Action</span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {instances.map((inst) => {
                const progress  = calcProgress(inst.taskExecutions);
                const completed = inst.taskExecutions.filter((e) => e.isCompleted).length;
                const total     = inst.taskExecutions.length;
                const isActive  = inst.status !== "COMPLETED";
                const shortId   = inst.id.slice(-6).toUpperCase();

                return (
                  <div
                    key={inst.id}
                    className="grid grid-cols-[1fr_130px_90px_120px_80px_auto] gap-3 items-center px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Run ID / Name */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inst.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        #{shortId}
                      </p>
                    </div>

                    {/* Date */}
                    <div>
                      <p className="text-xs text-foreground">
                        {format(new Date(inst.launchedAt), "MMM d, yyyy")}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(inst.launchedAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Status */}
                    <div>
                      <StatusBadge status={inst.status} />
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {completed}/{total} tasks
                        </span>
                        <span className="text-[10px] font-semibold tabular-nums">
                          {progress}%
                        </span>
                      </div>
                      <Progress
                        value={progress}
                        className={cn(
                          "h-1.5",
                          progress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500",
                        )}
                      />
                    </div>

                    {/* Operator */}
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={inst.launchedBy.image ?? ""} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {inst.launchedBy.name?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] truncate text-muted-foreground max-w-[60px]">
                        {inst.launchedBy.name ?? "Unknown"}
                      </span>
                    </div>

                    {/* Action */}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] gap-1 whitespace-nowrap"
                        asChild
                      >
                        <Link href={`/sops/${routeId}/execute/${inst.id}`}>
                          {isActive
                            ? <><Play className="w-2.5 h-2.5" /> Resume Run</>
                            : <><Eye className="w-2.5 h-2.5" /> View Monitor</>}
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
