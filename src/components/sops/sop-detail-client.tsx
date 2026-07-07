"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Star, Copy, Archive, Trash2, Download, Sparkles,
  FileText, CheckSquare, Users, BookOpen, Activity,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDateTime } from "@/lib/utils";
import { SOPEditor } from "@/components/sops/sop-editor";
import { SOPWorkflow } from "@/components/sops/sop-workflow";
import { SOPChecklist } from "@/components/sops/sop-checklist";
import { SOPComments } from "@/components/sops/sop-comments";
import { SOPActivityLog } from "@/components/sops/sop-activity-log";
import { AIToolbar } from "@/components/sops/ai-toolbar";

interface SOPData {
  id: string;
  title: string;
  description: string | null;
  purpose: string | null;
  scope: string | null;
  status: string;
  isAIGenerated: boolean;
  isFavorite: boolean;
  version: number;
  updatedAt: string;
  createdAt: string;
  sections: Array<{ id: string; type: string; title: string; content: string; order: number }>;
  workflowSteps: Array<{ id: string; stepNumber: number; title: string; description: string | null; role: string | null; duration: string | null }>;
  checklistItems: Array<{ id: string; text: string; isRequired: boolean; order: number }>;
  responsibilities: Array<{ id: string; role: string; description: string; order: number }>;
  resources: Array<{ id: string; name: string; type: string | null; description: string | null; order: number }>;
  comments: unknown[];
  activities: Array<{ id: string; action: string; description: string | null; createdAt: string; user: { id: string; name: string | null; image: string | null } }>;
  department?: { name: string };
  category?: { name: string; color: string };
  author: { name: string | null; image: string | null };
}

export function SOPDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [sop, setSop] = useState<SOPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");

  const fetchSOP = useCallback(async () => {
    const res = await fetch(`/api/sops/${id}`);
    if (!res.ok) { router.push("/sops"); return; }
    const data = await res.json();
    setSop(data);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchSOP(); }, [fetchSOP]);

  const handleUpdate = async (updates: Partial<SOPData>) => {
    if (!sop) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSop((prev) => prev ? { ...prev, ...updated } : prev);
        toast.success("Saved");
      }
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this SOP permanently?")) return;
    await fetch(`/api/sops/${id}`, { method: "DELETE" });
    toast.success("SOP deleted");
    router.push("/sops");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/sops/${id}/export?format=html`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sop?.title ?? "sop"}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("SOP exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDuplicate = async () => {
    const res = await fetch(`/api/sops/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const copy = await res.json();
      toast.success("SOP duplicated");
      router.push(`/sops/${copy.id}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!sop) return null;

  return (
    <motion.div className="max-w-5xl mx-auto space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => router.push("/sops")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {sop.isAIGenerated && <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs"><Sparkles className="w-3 h-3 mr-1" />AI Generated</Badge>}
            <Badge className={`text-xs ${STATUS_COLORS[sop.status]}`}>{STATUS_LABELS[sop.status]}</Badge>
            {sop.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
          </div>
          <h1 className="text-xl font-semibold mt-1 leading-tight">{sop.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            v{sop.version} · Updated {formatDateTime(sop.updatedAt)}
            {sop.department && ` · ${sop.department.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
          <Button variant="outline" size="sm" onClick={() => handleUpdate({ isFavorite: !sop.isFavorite })}>
            <Star className={`w-3.5 h-3.5 ${sop.isFavorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}><Copy className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* AI Toolbar */}
      <AIToolbar sopId={id} onRefresh={fetchSOP} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="editor" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Editor</TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Workflow</TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs gap-1.5"><CheckSquare className="w-3.5 h-3.5" /> Checklist</TabsTrigger>
          <TabsTrigger value="comments" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" /> Comments</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1.5"><Activity className="w-3.5 h-3.5" /> Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <SOPEditor sop={sop} onUpdate={handleUpdate} onSaveSections={async (sections) => {
            await fetch(`/api/sops/${id}/sections`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sections }),
            });
            toast.success("Sections saved");
          }} />
        </TabsContent>
        <TabsContent value="workflow" className="mt-4">
          <SOPWorkflow sopId={id} steps={sop.workflowSteps} onRefresh={fetchSOP} />
        </TabsContent>
        <TabsContent value="checklist" className="mt-4">
          <SOPChecklist sopId={id} items={sop.checklistItems} onRefresh={fetchSOP} />
        </TabsContent>
        <TabsContent value="comments" className="mt-4">
          <SOPComments sopId={id} comments={sop.comments as never[]} onRefresh={fetchSOP} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <SOPActivityLog activities={sop.activities} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
