"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SopToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, FileText } from "lucide-react";

const schema = z.object({
  title:       z.string().min(2, "Title is required"),
  processName: z.string().min(2, "Process name is required"),
  description: z.string().max(500, "Max 500 characters").optional(),
  department:  z.string().optional(),
  company:     z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function NewSOPPage() {
  const router = useRouter();
  const [loading,   setLoading]   = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [descLen,   setDescLen]   = useState(0);

  const { register, handleSubmit, getValues, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const descValue = watch("description") ?? "";

  const buildPayload = async (data: FormData, aiGenerate: boolean) => {
    if (!aiGenerate) {
      // Save draft without AI
      const res = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       data.title,
          processName: data.processName,
          description: data.description,
          status:      "DRAFT",
        }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save draft");
      return json.id;
    }

    // Generate with AI
    const genRes = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:       data.title,
        processName: data.processName,
        description: data.description ?? `${data.title} process for ${data.company ?? "the company"}`,
        department:  data.department,
        company:     data.company,
      }),
    });
    const genJson = await genRes.json() as { result?: Record<string, unknown>; error?: string };
    if (!genRes.ok) throw new Error(genJson.error ?? "AI generation failed");

    const generated = genJson.result as {
      title?: string; purpose?: string; scope?: string;
      workflow?: Array<{ stepNumber?: number; title: string; description?: string; role?: string; duration?: string; phase?: string }>;
      checklist?: Array<{ text: string; isRequired?: boolean; assignedRole?: string; priority?: string }>;
      roles?: Array<{ role: string; roleName?: string; coreDutySummary?: string; description?: string }>;
      safety?: string; qualityStandards?: string; notes?: string; reviewSchedule?: string;
    };

    const payload = {
      title:       generated.title || data.title,
      description: generated.purpose,
      workflow:    (generated.workflow ?? []).map((s, i) => ({
        stepNumber: s.stepNumber ?? i + 1, title: s.title,
        description: s.description, role: s.role, duration: s.duration, phase: s.phase,
      })),
      checklist: (generated.checklist ?? []).map((c) => ({
        text: c.text, isRequired: c.isRequired ?? false,
        assignedRole: c.assignedRole, priority: c.priority,
      })),
      responsibilities: (generated.roles ?? []).map((r) => ({
        role: r.role, roleName: r.roleName,
        coreDutySummary: r.coreDutySummary, description: r.description ?? r.coreDutySummary ?? r.role,
      })),
      documentation: {
        objective: generated.purpose, scope: generated.scope,
        safetyOrComplianceNotes: generated.safety,
        detailedProcedureMarkdown: [
          generated.qualityStandards ? `## Quality Standards\n${generated.qualityStandards}` : "",
          generated.notes            ? `## Notes\n${generated.notes}` : "",
          generated.reviewSchedule   ? `## Review Schedule\n${generated.reviewSchedule}` : "",
        ].filter(Boolean).join("\n\n") || undefined,
      },
    };

    const saveRes = await fetch("/api/generate-sop", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const saveJson = await saveRes.json() as { sopId?: string; error?: string };
    if (!saveRes.ok) throw new Error(saveJson.error ?? "Failed to save");
    return saveJson.sopId;
  };

  const onSaveDraft = async () => {
    const data = getValues();
    if (!data.title || data.title.length < 2) { toast.error("Please enter a SOP title"); return; }
    setSavingDraft(true);
    try {
      const id = await buildPayload(data, false);
      SopToast.draftSaved(data.title);
      router.push(`/sops/${id}`);
    } catch (err: unknown) {
      SopToast.error("Save draft", err instanceof Error ? err.message : undefined);
    } finally { setSavingDraft(false); }
  };

  const onGenerate = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const id = await buildPayload(data, true);
      SopToast.aiGenerated(payload.title as string ?? data.title);
      router.push(`/sops/${id}`);
    } catch (err: unknown) {
      SopToast.error("Generate SOP", err instanceof Error ? err.message : undefined);
      setLoading(false);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h1 className="text-xl font-semibold">New SOP</h1>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 flex items-start justify-center px-6 pb-10">
        <div className="w-full max-w-2xl">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

            {/* Card header with icon */}
            <div className="flex items-center gap-3 px-7 pt-6 pb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Create New SOP</h2>
                <p className="text-sm text-muted-foreground">Fill in the details below and our AI will generate a complete SOP for you.</p>
              </div>
            </div>

            <div className="px-7 pb-7 space-y-5">
              {/* SOP Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium">
                  SOP Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Employee Onboarding Process"
                  {...register("title")}
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              {/* Process Name */}
              <div className="space-y-1.5">
                <Label htmlFor="processName" className="text-sm font-medium">
                  Process Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="processName"
                  placeholder="e.g. HR Onboarding"
                  {...register("processName")}
                  className={errors.processName ? "border-destructive" : ""}
                />
                {errors.processName && <p className="text-xs text-destructive">{errors.processName.message}</p>}
              </div>

              {/* Description with char counter */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    rows={5}
                    placeholder="Brief overview of this process..."
                    {...register("description")}
                    className="resize-none pb-7"
                  />
                  <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground tabular-nums">
                    {descValue.length}/500
                  </span>
                </div>
              </div>

              {/* Department + Company */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                  <Input id="department" placeholder="e.g. Human Resources" {...register("department")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-sm font-medium">Company</Label>
                  <Input id="company" placeholder="e.g. Acme Corp" {...register("company")} />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 mt-5">
            <Button type="button" variant="outline" onClick={onSaveDraft} disabled={savingDraft || loading} className="gap-2">
              {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Save Draft
            </Button>
            <Button type="button" onClick={onGenerate} disabled={loading || savingDraft} className="gap-2 bg-primary text-primary-foreground">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Generating…" : "Generate with AI"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
