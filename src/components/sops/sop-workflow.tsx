"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, GitMerge } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Step {
  id?:         string;
  stepNumber:  number;
  title:       string;
  description: string | null;
  role:        string | null;
  duration:    string | null;
  phase?:      string | null;
  dependsOn?:  number[];
}

/** Parse a comma/space-separated string of integers into a number array */
function parseDependsOn(raw: string): number[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
}

/** Format a number array back to a human-readable string */
function formatDependsOn(deps?: number[]): string {
  return deps && deps.length > 0 ? deps.join(", ") : "";
}

export function SOPWorkflow({
  sopId,
  steps: initialSteps,
  onRefresh,
}: {
  sopId:     string;
  steps:     Step[];
  onRefresh: () => void;
}) {
  const [steps,  setSteps]  = useState<Step[]>(
    initialSteps.length > 0
      ? initialSteps
      : [{ stepNumber: 1, title: "", description: "", role: "", duration: "", phase: "", dependsOn: [] }],
  );
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof Step>(i: number, key: K, value: Step[K]) => {
    setSteps((prev) => {
      const u = [...prev];
      u[i] = { ...u[i], [key]: value };
      return u;
    });
  };

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, title: "", description: "", role: "", duration: "", phase: "", dependsOn: [] },
    ]);

  const removeStep = (i: number) =>
    setSteps((prev) =>
      prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/workflow`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ steps }),
      });
      if (res.ok) { toast.success("Workflow saved"); onRefresh(); }
      else toast.error("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Workflow Steps</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{steps.length} step{steps.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" variant="outline" onClick={addStep}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Step
        </Button>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Step number bubble */}
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                  {step.stepNumber}
                </div>

                <div className="flex-1 space-y-2">
                  {/* Title */}
                  <Input
                    value={step.title}
                    onChange={(e) => update(i, "title", e.target.value)}
                    placeholder="Step title"
                    className="font-medium"
                  />

                  {/* Description */}
                  <Textarea
                    value={step.description ?? ""}
                    onChange={(e) => update(i, "description", e.target.value)}
                    placeholder="Step description"
                    rows={2}
                  />

                  {/* Row: role + duration + phase */}
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={step.role ?? ""}
                      onChange={(e) => update(i, "role", e.target.value || null)}
                      placeholder="Responsible role"
                      className="text-sm"
                    />
                    <Input
                      value={step.duration ?? ""}
                      onChange={(e) => update(i, "duration", e.target.value || null)}
                      placeholder="Duration (e.g. 30 min)"
                      className="text-sm"
                    />
                    <Input
                      value={step.phase ?? ""}
                      onChange={(e) => update(i, "phase", e.target.value || null)}
                      placeholder="Phase (e.g. Preparation)"
                      className="text-sm"
                    />
                  </div>

                  {/* dependsOn field */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <GitMerge className="w-3.5 h-3.5 text-muted-foreground" />
                      <label className="text-xs text-muted-foreground font-medium">
                        Depends on step(s)
                      </label>
                    </div>
                    <Input
                      value={formatDependsOn(step.dependsOn)}
                      onChange={(e) =>
                        update(i, "dependsOn", parseDependsOn(e.target.value))
                      }
                      placeholder="e.g. 1, 2  (comma-separated step numbers)"
                      className="text-sm h-8"
                    />
                    {step.dependsOn && step.dependsOn.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">Prerequisites:</span>
                        {step.dependsOn.map((dep) => (
                          <Badge key={dep} variant="outline" className="text-[10px] h-4 px-1.5">
                            Step {dep}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("w-7 h-7 text-destructive hover:text-destructive shrink-0 mt-1")}
                  onClick={() => removeStep(i)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving…" : "Save Workflow"}
        </Button>
      </div>
    </div>
  );
}
