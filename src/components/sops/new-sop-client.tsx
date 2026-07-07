"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import {
  FileText, Sparkles, Loader2, ArrowRight, ArrowLeft, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  processName: z.string().min(2, "Process name is required"),
  description: z.string().min(20, "Please provide a more detailed description (min 20 chars)"),
  department: z.string().optional(),
  company: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface GeneratedSOP {
  title: string;
  purpose: string;
  scope: string;
  roles: Array<{ role: string; description: string }>;
  tools: string[];
  resources: Array<{ name: string; type: string; description: string }>;
  workflow: Array<{ stepNumber: number; title: string; description: string; role: string; duration: string }>;
  procedures: Array<{ stepNumber: number; title: string; content: string }>;
  checklist: Array<{ text: string; isRequired: boolean }>;
  safety: string;
  qualityStandards: string;
  notes: string;
  references: string[];
  reviewSchedule: string;
}

export function NewSOPClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultMode = searchParams.get("mode") === "ai" ? "ai" : "manual";

  const [mode, setMode] = useState<"select" | "manual" | "ai">("select");
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<GeneratedSOP | null>(null);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Handle mode selection on mount
  useState(() => {
    if (defaultMode === "ai") setMode("ai");
  });

  const handleGenerate = async (data: FormData) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setGenerated(json.result);
      setStep(1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAI = async () => {
    if (!generated) return;
    setSaving(true);
    try {
      const formData = getValues();
      const createRes = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generated.title || formData.title,
          description: generated.purpose,
          processName: formData.processName,
          status: "DRAFT",
        }),
      });
      const sop = await createRes.json();

      await fetch(`/api/sops/${sop.id}/sections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: [
            { type: "purpose", title: "Purpose", content: generated.purpose, order: 1 },
            { type: "scope", title: "Scope", content: generated.scope, order: 2 },
            { type: "safety", title: "Safety & Compliance", content: generated.safety, order: 3 },
            { type: "quality", title: "Quality Standards", content: generated.qualityStandards, order: 4 },
            { type: "notes", title: "Notes", content: generated.notes, order: 5 },
            { type: "review", title: "Review Schedule", content: generated.reviewSchedule, order: 6 },
          ],
        }),
      });

      if (generated.workflow?.length) {
        await fetch(`/api/sops/${sop.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isAIGenerated: true }),
        });
      }

      toast.success("SOP created successfully!");
      router.push(`/sops/${sop.id}`);
    } catch {
      toast.error("Failed to save SOP");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManual = async (data: FormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, processName: data.processName, description: data.description, status: "DRAFT" }),
      });
      const sop = await res.json();
      toast.success("SOP created!");
      router.push(`/sops/${sop.id}`);
    } catch {
      toast.error("Failed to create SOP");
    } finally {
      setSaving(false);
    }
  };

  if (mode === "select") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create New SOP</h1>
          <p className="text-muted-foreground text-sm mt-1">Choose how you want to create your SOP.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModeCard
            icon={<Sparkles className="w-6 h-6 text-purple-500" />}
            title="Generate with AI"
            description="Describe your process in plain English and let AI generate a complete, professional SOP instantly."
            badge="Recommended"
            badgeColor="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            onClick={() => setMode("ai")}
          />
          <ModeCard
            icon={<FileText className="w-6 h-6 text-blue-500" />}
            title="Create Manually"
            description="Start with a blank template and write your SOP from scratch with full control."
            onClick={() => setMode("manual")}
          />
        </div>
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode("select")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <h1 className="text-xl font-semibold">New SOP</h1>
        </div>
        <form onSubmit={handleSubmit(handleSaveManual)} className="space-y-4">
          <Card><CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">SOP Title *</Label>
              <Input id="title" placeholder="e.g. Employee Onboarding Process" {...register("title")} className={errors.title ? "border-destructive" : ""} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="processName">Process Name *</Label>
              <Input id="processName" placeholder="e.g. HR Onboarding" {...register("processName")} className={errors.processName ? "border-destructive" : ""} />
              {errors.processName && <p className="text-xs text-destructive">{errors.processName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} placeholder="Brief overview of this process..." {...register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input placeholder="e.g. Human Resources" {...register("department")} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input placeholder="e.g. Acme Corp" {...register("company")} />
              </div>
            </div>
          </CardContent></Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create SOP <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // AI mode
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        {step === 0 && <Button variant="ghost" size="sm" onClick={() => setMode("select")}><ArrowLeft className="w-4 h-4 mr-1.5" /> Back</Button>}
        {step === 1 && <Button variant="ghost" size="sm" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-1.5" /> Back</Button>}
        <div>
          <h1 className="text-xl font-semibold">Generate SOP with AI</h1>
          <p className="text-xs text-muted-foreground">{step === 0 ? "Describe your process" : "Review generated SOP"}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {["Describe", "Review"].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                step > i ? "bg-primary text-primary-foreground" : step === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {step > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{s}</span>
              {i === 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <form onSubmit={handleSubmit(handleGenerate)} className="space-y-4">
              <Card><CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">SOP Title *</Label>
                    <Input id="title" placeholder="e.g. Customer Refund Process" {...register("title")} className={errors.title ? "border-destructive" : ""} />
                    {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="processName">Process Name *</Label>
                    <Input id="processName" placeholder="e.g. Refund Processing" {...register("processName")} className={errors.processName ? "border-destructive" : ""} />
                    {errors.processName && <p className="text-xs text-destructive">{errors.processName.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input placeholder="e.g. Customer Support" {...register("department")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input placeholder="e.g. Acme Corp" {...register("company")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Process Description *</Label>
                  <Textarea id="description" rows={5} placeholder="Describe how the process works in plain language. The more detail you provide, the better the AI-generated SOP will be.&#10;&#10;Example: When a customer requests a refund, the support agent verifies the order, checks the refund policy, processes the refund in the payment system, sends confirmation to the customer, and updates the CRM..." {...register("description")} className={errors.description ? "border-destructive" : ""} />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>
              </CardContent></Card>
              <div className="flex justify-end">
                <Button type="submit" disabled={generating} size="lg">
                  {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate SOP</>}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 1 && generated && (
          <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <GeneratedSOPPreview sop={generated} />
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep(0)}>Regenerate</Button>
              <Button onClick={handleSaveAI} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Check className="w-4 h-4 mr-2" /> Save SOP</>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeCard({ icon, title, description, badge, badgeColor, onClick }: {
  icon: React.ReactNode; title: string; description: string; badge?: string; badgeColor?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left p-5 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-md transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:scale-105 transition-transform">{icon}</div>
        {badge && <Badge className={`ml-auto text-xs ${badgeColor}`}>{badge}</Badge>}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

function GeneratedSOPPreview({ sop }: { sop: GeneratedSOP }) {
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <Card><CardContent className="p-5 prose-sop">
        <h2 className="text-xl font-bold mb-1">{sop.title}</h2>
        <Section title="Purpose" content={sop.purpose} />
        <Section title="Scope" content={sop.scope} />
        {sop.roles?.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-sm mb-2">Roles & Responsibilities</h3>
            <ul className="space-y-1.5">
              {sop.roles.map((r, i) => <li key={i} className="text-sm"><strong>{r.role}:</strong> {r.description}</li>)}
            </ul>
          </div>
        )}
        {sop.workflow?.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-sm mb-2">Workflow Steps</h3>
            <div className="space-y-2">
              {sop.workflow.map((s) => (
                <div key={s.stepNumber} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{s.stepNumber}</div>
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                    {s.role && <p className="text-xs text-muted-foreground mt-0.5">Role: {s.role} {s.duration && `· ${s.duration}`}</p>}
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
                  {item.text} {item.isRequired && <span className="text-xs text-destructive">(Required)</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {sop.safety && <Section title="Safety & Compliance" content={sop.safety} />}
        {sop.notes && <Section title="Notes" content={sop.notes} />}
      </CardContent></Card>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div className="mt-4">
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{content}</p>
    </div>
  );
}
