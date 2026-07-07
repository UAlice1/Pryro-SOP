"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, RefreshCw, CheckSquare,
  GitBranch, ChevronDown, ChevronUp, AlertTriangle,
  Check, X,
} from "lucide-react";

interface AIRewritePanelProps {
  sopId: string;
  sopStatus: string;
  onRefresh: () => void;
  onApplySections: (sections: Section[]) => Promise<void>;
  onApplyWorkflow: (steps: WorkflowStep[]) => Promise<void>;
  onApplyChecklist: (items: ChecklistItem[], mode: "replace" | "append") => Promise<void>;
}

interface Section {
  type: string;
  title: string;
  content: string;
  order: number;
}

interface WorkflowStep {
  stepNumber: number;
  title: string;
  description: string;
  role: string;
  duration: string;
  type?: string;
}

interface ChecklistItem {
  text: string;
  isRequired: boolean;
  category?: string;
}

interface RewriteResult {
  title?: string;
  sections?: Section[];
  workflow?: WorkflowStep[];
  checklist?: ChecklistItem[];
}

type AIAction = "rewrite" | "checklist" | "workflow" | null;

const isBlocked = (status: string) => status === "APPROVED" || status === "PUBLISHED";

const AI_ACTIONS_EXTRA = [
  { key: "responsibilities", label: "Responsibilities", endpoint: "/api/ai/generate-responsibilities", icon: "👥" },
  { key: "safety", label: "Safety & Compliance", endpoint: "/api/ai/generate-safety", icon: "🛡️" },
  { key: "resources", label: "Required Resources", endpoint: "/api/ai/generate-resources", icon: "📦" },
] as const;

type ExtraActionKey = typeof AI_ACTIONS_EXTRA[number]["key"];

interface ExtraResult {
  responsibilities?: Array<{ role: string; description: string }>;
  safety?: { overview: string; requirements: Array<{ category: string; description: string }> };
  resources?: Array<{ name: string; type: string; description: string }>;
}

export function AIRewritePanel({ sopId, sopStatus, onRefresh, onApplySections, onApplyWorkflow, onApplyChecklist }: AIRewritePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<AIAction>(null);
  const [preview, setPreview] = useState<{ action: AIAction; data: RewriteResult } | null>(null);
  const [checklistMode, setChecklistMode] = useState<"replace" | "append">("append");
  const [workflowMode, setWorkflowMode] = useState<"replace" | "suggest">("suggest");
  const [extraLoading, setExtraLoading] = useState<ExtraActionKey | null>(null);
  const [extraResult, setExtraResult] = useState<{ key: ExtraActionKey; data: ExtraResult } | null>(null);

  const blocked = isBlocked(sopStatus);

  const runExtraAction = async (key: ExtraActionKey) => {
    if (blocked) return;
    const actionDef = AI_ACTIONS_EXTRA.find((a) => a.key === key)!;
    setExtraLoading(key);
    setExtraResult(null);
    try {
      const res = await fetch(actionDef.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setExtraResult({ key, data: json.result });
      toast.success(`${actionDef.label} generated — review below`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setExtraLoading(null);
    }
  };

  const applyExtraResult = async () => {
    if (!extraResult) return;
    try {
      if (extraResult.key === "responsibilities" && extraResult.data.responsibilities) {
        await fetch(`/api/sops/${sopId}/responsibilities`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responsibilities: extraResult.data.responsibilities.map((r, i) => ({ ...r, order: i + 1 })) }),
        });
        toast.success("Responsibilities saved");
      } else if (extraResult.key === "resources" && extraResult.data.resources) {
        await fetch(`/api/sops/${sopId}/resources`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resources: extraResult.data.resources.map((r, i) => ({ ...r, order: i + 1 })) }),
        });
        toast.success("Resources saved");
      } else if (extraResult.key === "safety" && extraResult.data.safety) {
        const content = `${extraResult.data.safety.overview}\n\n${extraResult.data.safety.requirements?.map((r) => `${r.category}: ${r.description}`).join("\n") ?? ""}`;
        await fetch(`/api/sops/${sopId}/sections`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sections: [{ type: "safety", title: "Safety & Compliance", content, order: 99 }],
          }),
        });
        toast.success("Safety section saved");
      }
      setExtraResult(null);
      onRefresh();
    } catch {
      toast.error("Failed to apply");
    }
  };

  const runAction = async (action: AIAction) => {    if (!action || blocked) return;
    setLoading(action);
    setPreview(null);

    const endpoints: Record<string, string> = {
      rewrite: "/api/ai/rewrite-sop",
      checklist: "/api/ai/generate-checklist",
      workflow: "/api/ai/generate-workflow",
    };

    const bodies: Record<string, object> = {
      rewrite: { sopId },
      checklist: { sopId, mode: checklistMode },
      workflow: { sopId, mode: workflowMode },
    };

    try {
      const res = await fetch(endpoints[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodies[action]),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AI request failed");
      setPreview({ action, data: json.result });
      toast.success("AI generation complete — review the preview below");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  const applyPreview = async () => {
    if (!preview) return;
    setLoading(preview.action);
    try {
      if (preview.action === "rewrite" && preview.data.sections) {
        await onApplySections(preview.data.sections);
        if (preview.data.workflow) await onApplyWorkflow(preview.data.workflow);
        if (preview.data.checklist) await onApplyChecklist(preview.data.checklist, "replace");
        toast.success("SOP rewritten and saved");
      } else if (preview.action === "checklist" && preview.data.checklist) {
        await onApplyChecklist(preview.data.checklist, checklistMode);
        toast.success(`Checklist ${checklistMode === "append" ? "items added" : "replaced"}`);
      } else if (preview.action === "workflow" && preview.data.workflow) {
        await onApplyWorkflow(preview.data.workflow);
        toast.success("Workflow updated");
      }
      setPreview(null);
      onRefresh();
    } catch {
      toast.error("Failed to apply changes");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl text-sm hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="font-medium text-purple-700 dark:text-purple-300">AI Generation Tools</span>
          {blocked && (
            <Badge className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              <AlertTriangle className="w-3 h-3 mr-1" /> Draft only
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {blocked && (
                <div className="flex items-start gap-2 px-4 py-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-800 dark:text-yellow-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>AI generation is disabled for <strong>Approved</strong> and <strong>Published</strong> SOPs. Change status to <strong>Draft</strong> to enable AI tools.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Rewrite SOP */}
                <ActionCard
                  icon={<RefreshCw className="w-4 h-4 text-purple-500" />}
                  title="Rewrite Entire SOP"
                  description="AI rewrites all sections, workflow, and checklist while keeping the original purpose and scope."
                  badge="Full rewrite"
                  badgeColor="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  loading={loading === "rewrite"}
                  disabled={blocked}
                  onRun={() => runAction("rewrite")}
                />

                {/* Generate Checklist */}
                <ActionCard
                  icon={<CheckSquare className="w-4 h-4 text-blue-500" />}
                  title="Generate Checklist"
                  description="AI creates a comprehensive checklist with pre-execution, sign-off, and verification items."
                  badge={checklistMode === "append" ? "Append" : "Replace"}
                  badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  loading={loading === "checklist"}
                  disabled={blocked}
                  onRun={() => runAction("checklist")}
                  extra={
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Mode:</span>
                      <div className="flex rounded-md border border-border overflow-hidden">
                        {(["append", "replace"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={(e) => { e.stopPropagation(); setChecklistMode(m); }}
                            className={`px-2 py-0.5 text-xs capitalize transition-colors ${checklistMode === m ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  }
                />

                {/* Generate Workflow */}
                <ActionCard
                  icon={<GitBranch className="w-4 h-4 text-green-500" />}
                  title="Generate Workflow"
                  description="AI generates ordered workflow steps with roles, durations, and decision points."
                  badge={workflowMode === "suggest" ? "Add steps" : "Full replace"}
                  badgeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  loading={loading === "workflow"}
                  disabled={blocked}
                  onRun={() => runAction("workflow")}
                  extra={
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Mode:</span>
                      <div className="flex rounded-md border border-border overflow-hidden">
                        {(["suggest", "replace"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={(e) => { e.stopPropagation(); setWorkflowMode(m); }}
                            className={`px-2 py-0.5 text-xs capitalize transition-colors ${workflowMode === m ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  }
                />
              </div>

              {/* Extra AI Generators */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Additional Generators</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {AI_ACTIONS_EXTRA.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => runExtraAction(a.key)}
                      disabled={blocked || extraLoading === a.key}
                      className="flex items-center gap-2.5 px-3 py-2.5 bg-card border border-border rounded-lg text-left hover:border-primary/40 hover:bg-muted/50 transition-colors text-sm disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <span className="text-base">{a.icon}</span>
                      <span className="flex-1 text-xs font-medium">{a.label}</span>
                      {extraLoading === a.key
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
                        : <Sparkles className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra Result Preview */}
              <AnimatePresence>
                {extraResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          {AI_ACTIONS_EXTRA.find((a) => a.key === extraResult.key)?.label} — Preview
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={applyExtraResult} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
                            <Check className="w-3.5 h-3.5 mr-1" /> Apply
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setExtraResult(null)} className="h-7 text-xs">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 max-h-48 overflow-y-auto">
                        {extraResult.key === "responsibilities" && (
                          <div className="space-y-1.5">
                            {extraResult.data.responsibilities?.map((r, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-medium">{r.role}:</span>
                                <span className="text-muted-foreground ml-1">{r.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {extraResult.key === "resources" && (
                          <div className="space-y-1.5">
                            {extraResult.data.resources?.map((r, i) => (
                              <div key={i} className="text-xs flex items-start gap-2">
                                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0">{r.type}</span>
                                <div>
                                  <span className="font-medium">{r.name}: </span>
                                  <span className="text-muted-foreground">{r.description}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {extraResult.key === "safety" && extraResult.data.safety && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">{extraResult.data.safety.overview}</p>
                            {extraResult.data.safety.requirements?.map((r, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-medium text-orange-600">{r.category}: </span>
                                <span className="text-muted-foreground">{r.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preview Panel */}
              <AnimatePresence>
                {preview && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          Preview — {preview.action === "rewrite" ? "Full SOP Rewrite" : preview.action === "checklist" ? "Generated Checklist" : "Generated Workflow"}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={applyPreview} disabled={!!loading} className="h-7 text-xs">
                            {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                            Apply
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPreview(null)} className="h-7 text-xs">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <PreviewContent preview={preview} />
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionCard({
  icon, title, description, badge, badgeColor,
  loading, disabled, onRun, extra,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  loading: boolean;
  disabled: boolean;
  onRun: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <Card className={`transition-all ${disabled ? "opacity-50" : "hover:border-primary/30"}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <p className="font-medium text-xs">{title}</p>
              <Badge className={`text-[10px] px-1.5 py-0 ${badgeColor}`}>{badge}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
        {extra}
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          onClick={onRun}
          disabled={disabled || loading}
          variant="outline"
        >
          {loading
            ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Generating...</>
            : <><Sparkles className="w-3 h-3 mr-1.5" /> Generate</>}
        </Button>
      </CardContent>
    </Card>
  );
}

function PreviewContent({ preview }: { preview: { action: AIAction; data: RewriteResult } }) {
  const { action, data } = preview;

  if (action === "rewrite") {
    return (
      <div className="space-y-3 max-h-64 overflow-y-auto text-xs">
        {data.sections?.map((s) => (
          <div key={s.type}>
            <p className="font-semibold text-foreground">{s.title}</p>
            <p className="text-muted-foreground mt-0.5 leading-relaxed line-clamp-3">{s.content}</p>
          </div>
        ))}
        {data.workflow && (
          <div>
            <p className="font-semibold text-foreground mt-2">Workflow ({data.workflow.length} steps)</p>
            {data.workflow.slice(0, 3).map((s) => (
              <p key={s.stepNumber} className="text-muted-foreground">{s.stepNumber}. {s.title} {s.role ? `(${s.role})` : ""}</p>
            ))}
            {data.workflow.length > 3 && <p className="text-muted-foreground">+ {data.workflow.length - 3} more steps</p>}
          </div>
        )}
      </div>
    );
  }

  if (action === "checklist") {
    return (
      <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
        {data.checklist?.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-3.5 h-3.5 rounded border border-border mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{item.text}{item.isRequired && <span className="text-destructive ml-1">*</span>}</span>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground pt-1">* = Required</p>
      </div>
    );
  }

  if (action === "workflow") {
    return (
      <div className="max-h-48 overflow-y-auto space-y-2 text-xs">
        {data.workflow?.map((step) => (
          <div key={step.stepNumber} className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">{step.stepNumber}</div>
            <div>
              <p className="font-medium">{step.title} {step.role && <span className="text-muted-foreground font-normal">— {step.role}</span>}</p>
              {step.duration && <p className="text-muted-foreground">{step.duration}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
