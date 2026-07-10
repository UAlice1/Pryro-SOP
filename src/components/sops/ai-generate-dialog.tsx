"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles, Loader2, ArrowRight, ArrowLeft, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  title:       z.string().min(2, "Title is required"),
  processName: z.string().min(2, "Process name is required"),
  description: z.string().min(20, "Please provide a more detailed description (min 20 chars)"),
  industry:    z.string().optional(),
  department:  z.string().optional(),
  company:     z.string().optional(),
});

type FormData = z.infer<typeof schema>;

/* ── Shape returned by /api/ai/generate ───────────────────────────────── */
interface GeneratedSOP {
  title:            string;
  purpose:          string;
  scope:            string;
  roles:            Array<{ role: string; roleName?: string; coreDutySummary?: string; description: string }>;
  resources:        Array<{ name: string; type: string; description: string }>;
  workflow:         Array<{ stepNumber: number; title: string; description: string; role?: string; duration?: string; phase?: string }>;
  checklist:        Array<{ text: string; isRequired: boolean; assignedRole?: string; priority?: "High" | "Medium" | "Low" }>;
  safety:           string;
  qualityStandards: string;
  notes:            string;
  reviewSchedule:   string;
}

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIGenerateDialog({ open, onOpenChange }: AIGenerateDialogProps) {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [generated, setGenerated]   = useState<GeneratedSOP | null>(null);

  const { register, handleSubmit, getValues, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleClose = () => {
    onOpenChange(false);
    setStep(0);
    setGenerated(null);
    reset();
  };

  /* Step 1 — call the AI endpoint to get the generated JSON preview */
  const handleGenerate = async (data: FormData) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setGenerated(json.result as GeneratedSOP);
      setStep(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  /* Step 2 — persist via the unified /api/generate-sop endpoint */
  const handleSave = async () => {
    if (!generated) return;
    setSaving(true);
    try {
      const formData = getValues();

      /* Build the exact payload shape /api/generate-sop expects */
      const payload = {
        title:       generated.title  || formData.title,
        industry:    formData.industry ?? undefined,
        description: generated.purpose ?? undefined,

        workflow: (generated.workflow ?? []).map((s, i) => ({
          stepNumber:  s.stepNumber ?? i + 1,
          title:       s.title,
          description: s.description ?? undefined,
          role:        s.role        ?? undefined,
          duration:    s.duration    ?? undefined,
          phase:       s.phase       ?? undefined,
        })),

        checklist: (generated.checklist ?? []).map((c) => ({
          text:         c.text,
          isRequired:   c.isRequired ?? false,
          assignedRole: c.assignedRole ?? undefined,
          priority:     c.priority     ?? undefined,
        })),

        responsibilities: (generated.roles ?? []).map((r) => ({
          role:            r.role,
          roleName:        r.roleName        ?? undefined,
          coreDutySummary: r.coreDutySummary ?? undefined,
          description:     r.description     ?? r.coreDutySummary ?? r.role,
        })),

        documentation: {
          objective:                 generated.purpose   ?? undefined,
          scope:                     generated.scope     ?? undefined,
          detailedProcedureMarkdown: [
            generated.qualityStandards ? `## Quality Standards\n${generated.qualityStandards}` : "",
            generated.notes            ? `## Notes\n${generated.notes}`                         : "",
            generated.reviewSchedule   ? `## Review Schedule\n${generated.reviewSchedule}`     : "",
          ].filter(Boolean).join("\n\n") || undefined,
          safetyOrComplianceNotes: generated.safety ?? undefined,
        },
      };

      const res = await fetch("/api/generate-sop", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to save SOP");

      toast.success("SOP created with all workflow steps, checklist & responsibilities.");
      handleClose();
      router.push(`/sops/${result.sopId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save SOP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Generate SOP with AI
          </DialogTitle>
          <DialogDescription>
            {step === 0
              ? "Describe your process and AI will generate a complete SOP."
              : "Review the generated SOP before saving."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 py-2">
          {["Describe", "Review"].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                step >= i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}>
                {step > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground">{s}</span>
              {i === 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <form onSubmit={handleSubmit(handleGenerate)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-title">SOP Title *</Label>
                    <Input id="ai-title" placeholder="e.g. Customer Refund Process" {...register("title")} className={errors.title ? "border-destructive" : ""} />
                    {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-processName">Process Name *</Label>
                    <Input id="ai-processName" placeholder="e.g. Refund Processing" {...register("processName")} className={errors.processName ? "border-destructive" : ""} />
                    {errors.processName && <p className="text-xs text-destructive">{errors.processName.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input placeholder="e.g. Healthcare, Finance" {...register("industry")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input placeholder="e.g. Customer Support" {...register("department")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-description">Process Description *</Label>
                  <Textarea
                    id="ai-description"
                    rows={5}
                    placeholder={"Describe how the process works in plain language. The more detail you provide, the better the AI-generated SOP will be.\n\nExample: When a customer requests a refund, the support agent verifies the order, checks the refund policy, processes the refund in the payment system, sends confirmation to the customer, and updates the CRM..."}
                    {...register("description")}
                    className={errors.description ? "border-destructive" : ""}
                  />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={generating}>
                    {generating
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                      : <><Sparkles className="w-4 h-4 mr-2" /> Generate SOP</>}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 1 && generated && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GeneratedSOPPreview sop={generated} />
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    : <><Check className="w-4 h-4 mr-2" /> Save SOP</>}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ── Preview component ──────────────────────────────────────────────────── */
function GeneratedSOPPreview({ sop }: { sop: GeneratedSOP }) {
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <Card>
        <CardContent className="p-5">
          <h2 className="text-xl font-bold mb-1">{sop.title}</h2>
          <PreviewSection title="Purpose" content={sop.purpose} />
          <PreviewSection title="Scope"   content={sop.scope} />

          {sop.roles?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-sm mb-2">Roles &amp; Responsibilities</h3>
              <ul className="space-y-1.5">
                {sop.roles.map((r, i) => (
                  <li key={i} className="text-sm">
                    <strong>{r.roleName ?? r.role}:</strong>{" "}
                    {r.coreDutySummary ?? r.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sop.workflow?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-sm mb-2">Workflow Steps</h3>
              <div className="space-y-2">
                {sop.workflow.map((s) => (
                  <div key={s.stepNumber} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {s.stepNumber}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                      {s.role && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Role: {s.role}{s.duration ? ` · ${s.duration}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sop.checklist?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-sm mb-2">Checklist</h3>
              <ul className="space-y-1.5">
                {sop.checklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-4 h-4 rounded border border-border mt-0.5 shrink-0" />
                    {item.text}
                    {item.isRequired && <span className="text-xs text-destructive">(Required)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sop.safety && <PreviewSection title="Safety &amp; Compliance" content={sop.safety} />}
          {sop.notes  && <PreviewSection title="Notes"                   content={sop.notes} />}
        </CardContent>
      </Card>
    </div>
  );
}

function PreviewSection({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div className="mt-4">
      <h3 className="font-semibold text-sm mb-1" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="text-sm text-muted-foreground">{content}</p>
    </div>
  );
}
