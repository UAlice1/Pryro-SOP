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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  processName: z.string().min(2, "Process name is required"),
  description: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function NewSOPClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleSave = async (data: FormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          processName: data.processName,
          description: data.description || "",
          status: "DRAFT",
        }),
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sops"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back</Link>
        </Button>
        <h1 className="text-xl font-semibold">New SOP</h1>
      </div>
      <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
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
