"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, Star, Copy, Archive, Trash2,
  FileText, CheckSquare, Users, Activity, MessageSquareMore,
  History, Lightbulb, Play, UserPlus, FileDown, ChevronDown,
  Loader2, MoreHorizontal, GitMerge, Shield, Package,
  Globe, Calendar, Tag, Plus, Send,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDateTime } from "@/lib/utils";
import { SOPWorkflow } from "@/components/sops/sop-workflow";
import { SOPChecklist } from "@/components/sops/sop-checklist";
import { SOPComments } from "@/components/sops/sop-comments";
import { SOPActivityLog } from "@/components/sops/sop-activity-log";
import { SOPApproval } from "@/components/sops/sop-approval";
import { SOPVersions } from "@/components/sops/sop-versions";
import { SOPInsights } from "@/components/sops/sop-insights";
import { SOPAIAssistant } from "@/components/sops/sop-ai-assistant";
import { SOPResponsibilities } from "@/components/sops/sop-responsibilities";
import { SOPSafety } from "@/components/sops/sop-safety";
import { SOPResources } from "@/components/sops/sop-resources";
import { SOPEditor } from "@/components/sops/sop-editor";
import { SOPAcknowledgementBanner } from "@/components/sops/sop-acknowledgement";
import { SOPInstancesList } from "@/components/sops/sop-instances-list";
import { InviteStaffDialog } from "@/components/sops/invite-staff-dialog";
import { AIRewritePanel } from "@/components/sops/ai-rewrite-panel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SOPData {
  id: string; title: string; description: string | null;
  purpose: string | null; scope: string | null;
  status: string; authorId: string; isAIGenerated: boolean;
  isFavorite: boolean; isArchived: boolean; version: number;
  updatedAt: string; createdAt: string; publishedAt?: string | null;
  industry?: string | null; complianceFramework?: string | null;
  sections: Array<{ id: string; type: string; title: string; content: string; order: number }>;
  workflowSteps: Array<{ id: string; stepNumber: number; title: string; description: string | null; role: string | null; duration: string | null }>;
  checklistItems: Array<{ id: string; text: string; isRequired: boolean; order: number }>;
  responsibilities: Array<{ id: string; role: string; roleName?: string | null; description: string; order: number }>;
  resources: Array<{ id: string; name: string; type: string | null; description: string | null; order: number }>;
  comments: unknown[];
  approvals: Array<{ id: string; status: string; comment: string | null; createdAt: string; updatedAt: string; approver: { id: string; name: string | null; image: string | null } }>;
  activities: Array<{ id: string; action: string; description: string | null; createdAt: string; user: { id: string; name: string | null; image: string | null } }>;
  department?: { name: string }; category?: { name: string; color: string };
  author: { name: string | null; image: string | null };
  acknowledgements?: Array<{ acknowledgedAt: string }>;
  tags?: Array<{ tag: { id: string; name: string } }>;
  documentation?: { objective?: string | null; scope?: string | null; detailedProcedureMarkdown?: string | null; safetyOrComplianceNotes?: string | null } | null;
}

const TABS = [
  { id: "workflow",  label: "Workflow",   icon: GitMerge },
  { id: "checklist", label: "Checklist",  icon: CheckSquare },
  { id: "roles",     label: "Roles",      icon: Users },
  { id: "editor",    label: "Details",    icon: FileText },
  { id: "activity",  label: "Activity",   icon: Activity },
  { id: "comments",  label: "Comments",   icon: MessageSquareMore },
];

const SIDE_TABS = [
  { id: "details",  label: "Details"    },
  { id: "insights", label: "AI Insights" },
];

export function SOPDetailV2({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const userRole  = (session?.user as { role?: string })?.role ?? "EMPLOYEE";
  const canEdit   = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "EDITOR"].includes(userRole);
  const canDelete = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"].includes(userRole);
  const canInvite = ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"].includes(userRole);

  const [sop,        setSop]       = useState<SOPData | null>(null);
  const [loading,    setLoading]   = useState(true);
  const [saving,     setSaving]    = useState(false);
  const [exporting,  setExporting] = useState<string | null>(null);
  const [activeTab,  setActiveTab] = useState(() => searchParams.get("tab") ?? "workflow");
  const [sideTab,    setSideTab]   = useState("details");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [aiMsg,      setAiMsg]     = useState("");
  const [publishing, setPublishing] = useState(false);

  const fetchSOP = useCallback(async () => {
    const res = await fetch(`/api/sops/${id}`);
    if (!res.ok) { router.push("/sops"); return; }
    setSop(await res.json());
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchSOP(); }, [fetchSOP]);

  const handleExport = async (format: "html" | "pdf" | "docx" | "md") => {
    if (exporting) return;
    setExporting(format);
    try {
      const res = await fetch(`/api/sops/${id}/export?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${sop?.title ?? "sop"}.${format}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch { toast.error("Export failed"); }
    finally { setExporting(null); }
  };

  const handlePublish = async () => {
    if (!sop) return;
    setPublishing(true);
    const action = sop.status === "DRAFT" ? "submit" : sop.status === "APPROVED" ? "publish" : null;
    if (!action) { setPublishing(false); return; }
    const res = await fetch(`/api/sops/${id}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) { toast.success("Status updated"); fetchSOP(); }
    else toast.error("Failed");
    setPublishing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this SOP permanently?")) return;
    await fetch(`/api/sops/${id}`, { method: "DELETE" });
    toast.success("Deleted"); router.push("/sops");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
  if (!sop) return null;

  const publishLabel = sop.status === "DRAFT" ? "Submit for Review"
    : sop.status === "APPROVED" ? "Publish SOP" : "Published";

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-3 md:px-6 border-b border-border shrink-0">
        <button onClick={() => router.push("/assistant")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to AI Assistant
        </button>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
          <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
            <Users className="w-3.5 h-3.5" /> Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                <Star className="w-3.5 h-3.5" /> Edit <ChevronDown className="w-3 h-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveTab("editor")}>Edit Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("html")}>Export HTML</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("docx")}>Export DOCX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("md")}>Export Markdown</DropdownMenuItem>
              <DropdownMenuSeparator />
              {canDelete && <DropdownMenuItem onClick={handleDelete} className="text-destructive">Delete SOP</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/sops/${id}/execute/new`)}>
                <Play className="w-4 h-4 mr-2" /> Execute SOP
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("versions")}>
                <History className="w-4 h-4 mr-2" /> Version History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── SOP title block ─────────────────────────────────────── */}
      <div className="px-3 pt-4 pb-2 md:px-6 shrink-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {sop.isAIGenerated && <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs">AI Generated</Badge>}
          {sop.industry && <Badge variant="outline" className="text-xs">{sop.industry}</Badge>}
          {sop.complianceFramework && <Badge variant="outline" className="text-xs">{sop.complianceFramework}</Badge>}
        </div>
        <h1 className="text-2xl font-bold text-foreground leading-tight">{sop.title}</h1>
        {sop.description && <p className="text-sm text-muted-foreground mt-1">{sop.description}</p>}
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar className="w-5 h-5"><AvatarImage src={sop.author.image ?? ""} /><AvatarFallback className="text-[9px]">{sop.author.name?.[0]}</AvatarFallback></Avatar>
            Created by {sop.author.name}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(sop.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
          {sop.department && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="w-3.5 h-3.5" /> {sop.department.name}
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">Updated {formatDateTime(sop.updatedAt)}</span>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="px-3 md:px-6 border-b border-border shrink-0 overflow-x-auto">
        <div className="flex gap-0">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button key={tid} onClick={() => setActiveTab(tid)}
              className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors",
                activeTab === tid
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}>
              <Icon className="w-3.5 h-3.5" />
              {label}
              {tid === "comments" && Array.isArray(sop.comments) && sop.comments.length > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full">{sop.comments.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: main content + right panel ────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 min-w-0">
          <SOPAcknowledgementBanner sopId={id} sopStatus={sop.status} sopTitle={sop.title} />

          {activeTab === "workflow"  && <SOPWorkflow sopId={id} steps={sop.workflowSteps} onRefresh={fetchSOP} />}
          {activeTab === "checklist" && <SOPChecklist sopId={id} items={sop.checklistItems} onRefresh={fetchSOP} />}
          {activeTab === "roles"     && <SOPResponsibilities sopId={id} responsibilities={sop.responsibilities} sopStatus={sop.status} onRefresh={fetchSOP} />}
          {activeTab === "editor"    && <SOPEditor sop={sop} onUpdate={fetchSOP} onSaveSections={async (sections) => {
            await fetch(`/api/sops/${id}/sections`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sections }) });
            fetchSOP();
          }} />}
          {activeTab === "activity"  && <SOPActivityLog activities={sop.activities} />}
          {activeTab === "comments"  && <SOPComments sopId={id} comments={sop.comments as never} onRefresh={fetchSOP} />}
          {activeTab === "approval"  && <SOPApproval sopId={id} sopStatus={sop.status} authorId={sop.authorId} currentUserId={(session?.user as { id?: string })?.id ?? ""} canApprove={["SUPER_ADMIN","ORG_ADMIN","MANAGER","APPROVER"].includes(userRole)} approvals={sop.approvals ?? []} onRefresh={fetchSOP} />}
          {activeTab === "versions"  && <SOPVersions sopId={id} currentVersion={sop.version} sopStatus={sop.status} onRefresh={fetchSOP} />}
          {activeTab === "insights"  && <SOPInsights sopId={id} />}
          {activeTab === "safety"    && <SOPSafety sopId={id} sopStatus={sop.status} existingSafetyContent={sop.sections.find((s) => s.type === "safety")?.content} onRefresh={fetchSOP} />}
          {activeTab === "resources" && <SOPResources sopId={id} resources={sop.resources} sopStatus={sop.status} onRefresh={fetchSOP} />}
          {activeTab === "executions"&& <SOPInstancesList sopId={id} />}
          {activeTab === "assistant" && <SOPAIAssistant sopId={id} />}
        </div>

        {/* Right side panel — hidden on mobile */}
        <div className="hidden lg:block w-72 shrink-0 border-l border-border overflow-y-auto">
          {/* Side tab switcher */}
          <div className="flex border-b border-border">
            {SIDE_TABS.map((st) => (
              <button key={st.id} onClick={() => setSideTab(st.id)}
                className={cn("flex-1 py-2.5 text-xs font-medium transition-colors",
                  sideTab === st.id ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}>
                {st.label}
              </button>
            ))}
          </div>

          {sideTab === "details" && (
            <div className="p-4 space-y-5 text-sm">
              {/* Status */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
                <Badge className={cn("text-xs", STATUS_COLORS[sop.status])}>{STATUS_LABELS[sop.status]}</Badge>
              </div>
              {/* Owner */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">SOP Owner</p>
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6"><AvatarImage src={sop.author.image ?? ""} /><AvatarFallback className="text-[9px]">{sop.author.name?.[0]}</AvatarFallback></Avatar>
                  <span className="text-sm">{sop.author.name}</span>
                </div>
              </div>
              {/* Department */}
              {sop.department && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Department</p>
                  <div className="flex items-center gap-1.5 text-sm"><Globe className="w-3.5 h-3.5 text-muted-foreground" />{sop.department.name}</div>
                </div>
              )}
              {/* Version */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Version</p>
                <span className="text-sm font-mono">{sop.version}.0</span>
              </div>
              {/* Reviewers */}
              {sop.approvals.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Reviewers</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {sop.approvals.slice(0, 3).map((a) => (
                      <Avatar key={a.id} className="w-6 h-6 border-2 border-background -ml-1 first:ml-0">
                        <AvatarImage src={a.approver.image ?? ""} /><AvatarFallback className="text-[9px]">{a.approver.name?.[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                    {sop.approvals.length > 3 && <span className="text-xs text-muted-foreground ml-1">+{sop.approvals.length - 3}</span>}
                  </div>
                </div>
              )}
              {/* Tags */}
              {sop.tags && sop.tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {sop.tags.map((t) => <Badge key={t.tag.id} variant="secondary" className="text-xs">{t.tag.name}</Badge>)}
                  </div>
                </div>
              )}
              {/* More actions */}
              <div className="pt-2 space-y-1.5">
                <button onClick={() => setActiveTab("approval")} className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1.5 flex items-center gap-2"><GitMerge className="w-3.5 h-3.5" />Approval workflow</button>
                <button onClick={() => setActiveTab("versions")} className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1.5 flex items-center gap-2"><History className="w-3.5 h-3.5" />Version history</button>
                <button onClick={() => setActiveTab("safety")} className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1.5 flex items-center gap-2"><Shield className="w-3.5 h-3.5" />Safety & compliance</button>
                <button onClick={() => setActiveTab("resources")} className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1.5 flex items-center gap-2"><Package className="w-3.5 h-3.5" />Resources</button>
                <button onClick={() => setActiveTab("executions")} className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1.5 flex items-center gap-2"><Play className="w-3.5 h-3.5" />Executions</button>
              </div>
            </div>
          )}

          {sideTab === "insights" && (
            <div className="p-4">
              <SOPInsights sopId={id} />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom action bar ───────────────────────────────────── */}
      <div className="border-t border-border bg-background shrink-0">
        {/* Action buttons */}
        <div className="flex items-center gap-2 px-3 py-3 md:px-6 border-b border-border flex-wrap">
          <Button
            onClick={handlePublish}
            disabled={publishing || sop.status === "PUBLISHED" || sop.status === "REVIEW"}
            className="gap-1.5 bg-primary text-primary-foreground"
            size="sm"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            {publishLabel}
          </Button>

          {canInvite && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" /> Invite Staff
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={!!exporting}>
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                Download PDF <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("html")}>HTML</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("docx")}>Word (DOCX)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("md")}>Markdown</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={() => router.push("/sops")}>
            View in Library →
          </Button>
        </div>

        {/* AI chat bar */}
        <div className="px-3 py-3 md:px-6">
          <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-4 py-2.5">
            <input
              value={aiMsg}
              onChange={(e) => setAiMsg(e.target.value)}
              placeholder="Ask AI to improve, expand, or generate SOP content…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => { if (e.key === "Enter" && aiMsg.trim()) { setActiveTab("assistant"); setAiMsg(""); } }}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { label: "Improve this SOP", action: () => setActiveTab("assistant") },
                { label: "Add checklist",    action: () => setActiveTab("checklist") },
                { label: "Generate workflow", action: () => setActiveTab("workflow") },
                { label: "Summarize",        action: () => setActiveTab("insights") },
              ].map((btn) => (
                <button key={btn.label} onClick={btn.action}
                  className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 hover:bg-background transition-colors whitespace-nowrap">
                  {btn.label}
                </button>
              ))}
              <button
                onClick={() => { if (aiMsg.trim()) { setActiveTab("assistant"); setAiMsg(""); } }}
                className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">AI can make mistakes. Verify important information.</p>
        </div>
      </div>

      <InviteStaffDialog open={inviteOpen} onOpenChange={setInviteOpen} sopId={id} responsibilities={sop.responsibilities} />
    </div>
  );
}
