"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, CheckCircle2, Clock, Loader2, RefreshCw,
  Flag, AlertTriangle, Users, Play, Trophy,
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
    isRequired:   boolean;
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

/* ─── Priority config ────────────────────────────────────────────────────── */

const PRIORITY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  High:   { label: "High",   icon: <AlertTriangle className="w-3 h-3" />, color: "text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400" },
  Medium: { label: "Medium", icon: <Flag className="w-3 h-3" />,          color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" },
  Low:    { label: "Low",    icon: <CheckCircle2 className="w-3 h-3" />,  color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
};

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ExecutionClient({
  sopId,
  instanceId,
}: {
  sopId:      string;
  instanceId: string;
}) {
  const router = useRouter();

  const [instance,  setInstance]  = useState<Instance | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState<string | null>(null);

  /* ── Fetch instance data ─────────────────────────────────────────────── */
  const fetchInstance = useCallback(async () => {
    try {
      const res = await fetch(`/api/sops/instances?sopId=${sopId}`);
      if (!res.ok) { toast.error("Failed to load execution data"); return; }
      const all = await res.json() as Instance[];
      const found = all.find((i) => i.id === instanceId);
      if (!found) { toast.error("Execution not found"); router.push(`/sops/${sopId}`); return; }
      setInstance(found);
    } finally {
      setLoading(false);
    }
  }, [sopId, instanceId, router]);

  useEffect(() => { fetchInstance(); }, [fetchInstance]);

  /* ── Toggle task completion ──────────────────────────────────────────── */
  const toggleTask = async (execution: TaskExecution) => {
    const newVal = !execution.isCompleted;
    setToggling(execution.id);

    // Optimistic update
    setInstance((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        taskExecutions: prev.taskExecutions.map((e) =>
          e.id === execution.id
            ? { ...e, isCompleted: newVal, completedAt: newVal ? new Date().toISOString() : null }
            : e,
        ),
      };
    });

    try {
      const res = await fetch("/api/sops/instances/executions", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          instanceId,
          checklistId: execution.checklistItem.id,
          isCompleted: newVal,
        }),
      });

      if (!res.ok) {
        // Revert on failure
        setInstance((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            taskExecutions: prev.taskExecutions.map((e) =>
              e.id === execution.id ? { ...e, isCompleted: !newVal } : e,
            ),
          };
        });
        toast.error("Failed to update task");
      } else {
        // Refresh to get server truth (who completed, timestamps)
        fetchInstance();
      }
    } finally {
      setToggling(null);
    }
  };

  /* ── Derived stats ────────────────────────────────────────────────────── */
  const execs     = instance?.taskExecutions ?? [];
  const total     = execs.length;
  const completed = execs.filter((e) => e.isCompleted).length;
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = instance?.status === "COMPLETED";

  /* ── Group by priority ────────────────────────────────────────────────── */
  const groups = (["High", "Medium", "Low", null] as const).reduce<
    Record<string, TaskExecution[]>
  >((acc, p) => {
    const items = execs.filter((e) =>
      p === null
        ? !e.checklistItem.priority || !["High","Medium","Low"].includes(e.checklistItem.priority)
        : e.checklistItem.priority === p,
    );
    if (items.length) acc[p ?? "Other"] = items;
    return acc;
  }, {});

  /* ─── Loading skeleton ────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!instance) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── Back + header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={() => router.push(`/sops/${sopId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <Badge className={cn(
              "text-[10px]",
              isComplete
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            )}>
              {isComplete
                ? <><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Completed</>
                : <><Clock className="w-2.5 h-2.5 mr-1 animate-pulse" />In Progress</>}
            </Badge>
          </div>
          <h1 className="text-xl font-semibold leading-tight">{instance.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>Launched {format(new Date(instance.launchedAt), "MMM d, yyyy 'at' h:mm a")}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Avatar className="w-4 h-4">
                <AvatarImage src={instance.launchedBy.image ?? ""} />
                <AvatarFallback className="text-[8px]">
                  {instance.launchedBy.name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              {instance.launchedBy.name ?? "Unknown"}
            </span>
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={fetchInstance}
          aria-label="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* ── Progress card ─────────────────────────────────────────── */}
      <Card className={cn(
        "border-2",
        isComplete ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20"
                   : "border-amber-200 dark:border-amber-800",
      )}>
        <CardContent className="p-4 space-y-3">
          {isComplete ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  All tasks completed!
                </p>
                <p className="text-xs text-muted-foreground">
                  Finished {instance.completedAt
                    ? formatDistanceToNow(new Date(instance.completedAt), { addSuffix: true })
                    : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Execution in progress</p>
                <p className="text-xs text-muted-foreground">
                  Check off tasks below as they are completed
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{completed} of {total} tasks done</span>
              <span className="font-semibold tabular-nums">{progress}%</span>
            </div>
            <Progress
              value={progress}
              className={cn(
                "h-2",
                isComplete
                  ? "[&>div]:bg-emerald-500"
                  : "[&>div]:bg-amber-500",
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Task checklist ────────────────────────────────────────── */}
      {total === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No checklist items in this SOP. Add checklist items in the SOP editor.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([groupLabel, items]) => {
            const priorityConf = PRIORITY_CONFIG[groupLabel];
            const groupDone    = items.filter((e) => e.isCompleted).length;

            return (
              <Card key={groupLabel}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs flex items-center gap-2">
                    {priorityConf ? (
                      <span className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px]",
                        priorityConf.color,
                      )}>
                        {priorityConf.icon}
                        {priorityConf.label} Priority
                      </span>
                    ) : (
                      <span className="text-muted-foreground">General</span>
                    )}
                    <span className="text-muted-foreground font-normal ml-auto">
                      {groupDone}/{items.length} done
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="px-4 pb-4 space-y-2">
                  {items.map((exec) => {
                    const isToggling = toggling === exec.id;
                    const pConf = exec.checklistItem.priority
                      ? PRIORITY_CONFIG[exec.checklistItem.priority]
                      : null;

                    return (
                      <div
                        key={exec.id}
                        className={cn(
                          "flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all",
                          exec.isCompleted
                            ? "bg-muted/40 border-border/40"
                            : "bg-card border-border hover:border-primary/30",
                          isToggling && "opacity-60",
                        )}
                      >
                        {/* Checkbox */}
                        <div className="mt-0.5 shrink-0">
                          {isToggling ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Checkbox
                              checked={exec.isCompleted}
                              onCheckedChange={() => !isComplete && toggleTask(exec)}
                              disabled={isComplete || isToggling}
                              aria-label={exec.checklistItem.text}
                            />
                          )}
                        </div>

                        {/* Task details */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm leading-snug",
                            exec.isCompleted && "line-through text-muted-foreground",
                          )}>
                            {exec.checklistItem.text}
                            {exec.checklistItem.isRequired && (
                              <span className="ml-1 text-destructive text-xs">*</span>
                            )}
                          </p>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {exec.checklistItem.assignedRole && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Users className="w-2.5 h-2.5" />
                                {exec.checklistItem.assignedRole}
                              </span>
                            )}
                            {pConf && (
                              <span className={cn(
                                "flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                                pConf.color,
                              )}>
                                {pConf.icon} {pConf.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Completion info */}
                        {exec.isCompleted && (
                          <div className="shrink-0 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {exec.completedBy && (
                                <span className="text-[10px] text-muted-foreground">
                                  {exec.completedBy.name ?? "You"}
                                </span>
                              )}
                            </div>
                            {exec.completedAt && (
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(exec.completedAt), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Footer actions ────────────────────────────────────────── */}
      <Separator />
      <div className="flex items-center justify-between pb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/sops/${sopId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to SOP
        </Button>

        {isComplete && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">Run complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
