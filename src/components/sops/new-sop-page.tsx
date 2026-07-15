"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, ArrowLeft, ArrowRight } from "lucide-react";

const schema = z.object({
  title:       z.string().min(2, "Title is required"),
  processName: z.string().min(2, "Process name is required"),
  description: z.string().optional(),
  department:  z.string().optional(),
  company:     z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function NewSOPPage() {
  const router   = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Step 1: generate with AI
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

      // Step 2: save to database
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
          objective: generated.purpose,
          scope:     generated.scope,
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

      toast.success("SOP generated successfully!");
      router.push(`/sops/${saveJson.sopId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-5 border-b border-border">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-semibold">New SOP</h1>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl">
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">

            {/* SOP Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                SOP Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Employee Onboarding Process"
                {...register("title")}
                className={`h-11 ${errors.title ? "border-destructive" : ""}`}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            {/* Process Name */}
            <div className="space-y-2">
              <Label htmlFor="processName" className="text-sm font-medium">
                Process Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="processName"
                placeholder="e.g. HR Onboarding"
                {...register("processName")}
                className={`h-11 ${errors.processName ? "border-destructive" : ""}`}
              />
              {errors.processName && <p className="text-xs text-destructive">{errors.processName.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Brief overview of this process..."
                {...register("description")}
                className="resize-none"
              />
            </div>

            {/* Department + Company */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                <Input id="department" placeholder="e.g. Human Resources" {...register("department")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-medium">Company</Label>
                <Input id="company" placeholder="e.g. Acme Corp" {...register("company")} className="h-11" />
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={loading} size="lg" className="gap-2 px-6">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating SOP…</>
                : <><Sparkles className="w-4 h-4" /> Create SOP <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
