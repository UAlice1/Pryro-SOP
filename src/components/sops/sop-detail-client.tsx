"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Star, Copy, Archive, Trash2, Sparkles,
  FileText, CheckSquare, Users, BookOpen, Activity,
  GitMerge, History, Lightbulb, MessageSquareMore, Printer,
  FileDown, FileType, Globe, ChevronDown, Loader2,
  ShieldCheck, Package, Play, UserPlus, FileCode,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDateTime } from "@/lib/utils";
import { SOPEditor } from "@/components/sops/sop-editor";
import { SOPWorkflow } from "@/components/sops/sop-workflow";
import { SOPChecklist } from "@/components/sops/sop-checklist";
import { SOPComments } from "@/components/sops/sop-comments";
import { SOPActivityLog } from "@/components/sops/sop-activity-log";
import { AIRewritePanel } from "@/components/sops/ai-rewrite-panel";
import { SOPApproval } from "@/components/sops/sop-approval";
import { SOPVersions } from "@/components/sops/sop-versions";
import { SOPInsights } from "@/components/sops/sop-insights";
import { SOPAIAssistant } from "@/components/sops/sop-ai-assistant";
import { SOPResponsibilities } from "@/components/sops/sop-responsibilities";
import { SOPSafety } from "@/components/sops/sop-safety";
import { SOPResources } from "@/components/sops/sop-resources";
import { SOPAcknowledgementBanner } from "@/components/sops/sop-acknowledgement";
import { SOPInstancesList } from "@/components/sops/sop-instances-list";
import { InviteStaffDialog } from "@/components/sops/invite-staff-dialog";

interface SOPData {
  id: string;
  title: string;
  description: string | null;
  purpose: string | null;
  scope: string | null;
  status: string;
  authorId: string;
  isAIGenerated: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  version: number;
  updatedAt: string;
  createdAt: string;
  sections: Array<{ id: string; type: string; title: string; content: string; order: number }>;
  workflowSteps: Array<{ id: string; stepNumber: number; title: string; description: string | null; role: string | null; duration: string | null }>;
  checklistItems: Array<{ id: string; text: string; isRequired: boolean; order: number }>;
  responsibilities: Array<{ id: string; role: string; description: string; order: number }>;
  resources: Array<{ id: string; name: string; type: string | null; description: string | null; order: number }>;
  comments: unknown[];
  approvals: Array<{ id: string; status: string; comment: string | null; createdAt: string; updatedAt: string; approver: { id: string; name: string | null; image: string | null } }>;
  activities: Array<{ id: string; action: string; description: string | null; createdAt: string; user: { id: string; name: string | null; image: string | null } }>;
  department?: { name: string };
  category?: { name: string; color: string };
  author: { name: string | null; image: string | null };
  acknowledgements?: Array<{ acknowledgedAt: string }>;
}

export function SOPDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id ?? "";
  const userRole      = (session?.user as { role?: string })?.role ?? "EMPLOYEE";
  // EDITOR+ can edit content; MANAGER+ can create/delete/invite
  const canEdit       = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "EDITOR"].includes(userRole);
  const canDelete     = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"].includes(userRole);
  const canApprove    = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "APPROVER"].includes(userRole);
  const canInvite     = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"].includes(userRole);

  const [sop, setSop] = useState<SOPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"html" | "pdf" | "docx" | "md" | null>(null);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") ?? "editor");
  const [inviteOpen, setInviteOpen] = useState(false);

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

  const handleArchive = async () => {
    const isArchived = sop?.isArchived ?? false;
    const res = await fetch(`/api/sops/${id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: !isArchived }),
    });
    if (res.ok) {
      toast.success(isArchived ? "SOP restored" : "SOP archived");
      if (!isArchived) router.push("/sops");
      else fetchSOP();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this SOP permanently?")) return;
    await fetch(`/api/sops/${id}`, { method: "DELETE" });
    toast.success("SOP deleted");
    router.push("/sops");
  };

  const handleExport = async (format: "html" | "pdf" | "docx" | "md") => {
    if (exporting) return;
    setExporting(format);
    try {
      const res = await fetch(`/api/sops/${id}/export?format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sop?.title ?? "sop"}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handlePrint = () => {
    window.print();
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
    <div className="max-w-5xl mx-auto space-y-4">
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
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
          <Button variant="outline" size="sm" onClick={() => handleUpdate({ isFavorite: !sop.isFavorite })}>
            <Star className={`w-3.5 h-3.5 ${sop.isFavorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
          </Button>

          {/* Invite Staff button */}
          {canInvite && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Invite</span>
          </Button>
          )}

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!!exporting} className="gap-1">
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline text-xs">
                  {exporting ? `Exporting ${exporting.toUpperCase()}…` : "Export"}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Download as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={!!exporting} className="gap-2 text-sm cursor-pointer">
                <FileDown className="w-3.5 h-3.5 text-red-500" />PDF
                <span className="ml-auto text-[10px] text-muted-foreground">Recommended</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("docx")} disabled={!!exporting} className="gap-2 text-sm cursor-pointer">
                <FileType className="w-3.5 h-3.5 text-blue-500" />Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("html")} disabled={!!exporting} className="gap-2 text-sm cursor-pointer">
                <Globe className="w-3.5 h-3.5 text-green-500" />HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("md")} disabled={!!exporting} className="gap-2 text-sm cursor-pointer">
                <FileCode className="w-3.5 h-3.5 text-orange-500" />Markdown (.md)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Print button */}
          <Button variant="outline" size="sm" onClick={handlePrint} title="Print SOP">
            <Printer className="w-3.5 h-3.5" />
          </Button>

          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleArchive} title={sop.isArchived ? "Restore SOP" : "Archive SOP"}>
              <Archive className="w-3.5 h-3.5" />
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Acknowledgement Banner — shown for PUBLISHED SOPs */}
      <SOPAcknowledgementBanner
        sopId={id}
        sopStatus={sop.status}
        sopTitle={sop.title}
      />

      {/* AI Generation Tools — only for editors */}
      {canEdit && (
        <AIRewritePanel
          sopId={id}
          sopStatus={sop.status}
          onRefresh={fetchSOP}
          onApplySections={async (sections) => {
            await fetch(`/api/sops/${id}/sections`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sections }),
            });
          }}
          onApplyWorkflow={async (steps) => {
            await fetch(`/api/sops/${id}/workflow`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ steps }),
            });
          }}
          onApplyChecklist={async (items, mode) => {
            const existing = mode === "append" ? sop.checklistItems : [];
            const merged = [
              ...existing,
              ...items.map((item, i) => ({
                text: item.text,
                isRequired: item.isRequired,
                order: existing.length + i + 1,
              })),
            ];
            await fetch(`/api/sops/${id}/checklist`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: merged }),
            });
          }}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* 
          Primary tabs (always visible) + overflow tabs in a dropdown.
          This avoids the horizontal scroll issue entirely.
        */}
        <div className="flex items-center gap-1 border-b border-border pb-0">
          <TabsList className="h-9 bg-transparent p-0 gap-0 flex-wrap">
            {/* Always-visible primary tabs */}
            {[
              { value: "editor",           icon: FileText,         label: "Editor"          },
              { value: "workflow",         icon: BookOpen,         label: "Workflow"        },
              { value: "checklist",        icon: CheckSquare,      label: "Checklist"       },
              { value: "responsibilities", icon: Users,            label: "Roles"           },
              { value: "approval",         icon: GitMerge,         label: "Approval",       dot: sop.status === "REVIEW" },
              { value: "assistant",        icon: MessageSquareMore,label: "AI Assistant"    },
            ].map(({ value, icon: Icon, label, dot }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs gap-1.5 px-3"
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {dot && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Secondary tabs in a dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground rounded-none border-b-2 border-transparent data-[state=open]:border-primary px-3"
              >
                More <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {[
                { value: "safety",     icon: ShieldCheck,       label: "Safety"      },
                { value: "resources",  icon: Package,           label: "Resources"   },
                { value: "versions",   icon: History,           label: "Versions"    },
                { value: "insights",   icon: Lightbulb,         label: "Insights"    },
                { value: "comments",   icon: Users,             label: "Comments"    },
                { value: "activity",   icon: Activity,          label: "Activity"    },
                { value: "executions", icon: Play,              label: "Executions"  },
              ].map(({ value, icon: Icon, label }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={`gap-2 text-sm cursor-pointer ${activeTab === value ? "bg-accent" : ""}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {activeTab === value && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

        <TabsContent value="responsibilities" className="mt-4">
          <SOPResponsibilities
            sopId={id}
            responsibilities={sop.responsibilities}
            sopStatus={sop.status}
            onRefresh={fetchSOP}
          />
        </TabsContent>

        <TabsContent value="safety" className="mt-4">
          <SOPSafety
            sopId={id}
            sopStatus={sop.status}
            existingSafetyContent={sop.sections.find((s) => s.type === "safety")?.content}
            onRefresh={fetchSOP}
          />
        </TabsContent>

        <TabsContent value="resources" className="mt-4">
          <SOPResources
            sopId={id}
            resources={sop.resources}
            sopStatus={sop.status}
            onRefresh={fetchSOP}
          />
        </TabsContent>

        <TabsContent value="approval" className="mt-4">
          <SOPApproval
            sopId={id}
            sopStatus={sop.status}
            authorId={sop.authorId}
            currentUserId={currentUserId}
            canApprove={canApprove}
            approvals={sop.approvals ?? []}
            onRefresh={fetchSOP}
          />
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <SOPVersions sopId={id} currentVersion={sop.version} sopStatus={sop.status} onRefresh={fetchSOP} />
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <SOPInsights sopId={id} />
        </TabsContent>

        <TabsContent value="assistant" className="mt-4">
          <SOPAIAssistant sopId={id} />
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <SOPComments sopId={id} comments={sop.comments as never[]} onRefresh={fetchSOP} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <SOPActivityLog activities={sop.activities} />
        </TabsContent>

        <TabsContent value="executions" className="mt-4">
          <SOPInstancesList sopId={id} />
        </TabsContent>
      </Tabs>

      {/* ── Invite Staff dialog ─────────────────────────────── */}
      <InviteStaffDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        sopId={id}
        sopTitle={sop.title}
      />
    </div>
  );
}
