"use client";

import { makeAssistantTool } from "@assistant-ui/react";
import { useState, useCallback, type FC } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen, CheckSquare, Users, FileText,
  Save, Loader2, ArrowRight,
  ShieldCheck, Clock, AlertTriangle, CheckCircle,
  FileDown, UserPlus, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InviteStaffDialog } from "@/components/sops/invite-staff-dialog";

/* ─── Parameter schema ───────────────────────────────────────────────────── */

const parameters = z.object({
  title:               z.string().describe("The SOP title"),
  industry:            z.string().optional().describe("Industry vertical"),
  complianceFramework: z.string().optional().describe("Compliance framework (e.g. ISO 9001, OSHA)"),
  description:         z.string().optional().describe("Brief overview of the process"),
  workflow: z.array(z.object({
    stepNumber:  z.number(),
    phase:       z.string().optional(),
    title:       z.string(),
    description: z.string().optional(),
    role:        z.string().optional(),
    duration:    z.string().optional(),
    dependsOn:   z.array(z.number()).optional(),
  })).describe("Ordered workflow steps"),
  checklist: z.array(z.object({
    text:         z.string(),
    assignedRole: z.string().optional(),
    priority:     z.enum(["High", "Medium", "Low"]).optional(),
    isRequired:   z.boolean().optional(),
  })).describe("Actionable checklist items"),
  responsibilities: z.array(z.object({
    role:            z.string(),
    roleName:        z.string().optional(),
    coreDutySummary: z.string().optional(),
    description:     z.string().optional(),
  })).describe("Role-based responsibilities"),
  documentation: z.object({
    objective:                 z.string().optional(),
    scope:                     z.string().optional(),
    detailedProcedureMarkdown: z.string().optional(),
    safetyOrComplianceNotes:   z.string().optional(),
  }).optional().describe("Long-form documentation"),
});

type SOPArgs   = z.infer<typeof parameters>;
type SOPResult = { sopId: string; error?: undefined } | { sopId: null; error: string };

/* ─── Render component ───────────────────────────────────────────────────── */

const SOPGenerativePanel: FC<ToolCallMessagePartProps<SOPArgs, SOPResult>> = ({
  args, result, status,
}) => {
  const router = useRouter();
  const sopId = result?.sopId ?? null;

  const [published,  setPublished]  = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [checked,    setChecked]    = useState<Record<number, boolean>>({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | "html" | null>(null);

  const isStreaming = status.type === "running";

  const handlePublish = useCallback(async () => {
    if (!sopId) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/sops/${sopId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (res.ok) {
        setPublished(true);
        toast.success("SOP published successfully");
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to publish");
      }
    } catch {
      toast.error("Network error — could not publish");
    } finally { setPublishing(false); }
  }, [sopId]);

  const handleDownload = useCallback(async (format: "pdf" | "docx" | "html") => {
    if (!sopId || downloading) return;
    setDownloading(format);
    try {
      const res = await fetch(`/api/sops/${sopId}/export?format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Export failed");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${args?.title ?? "sop"}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }, [sopId, downloading, args?.title]);

  if (!args) return null;

  return (
    /*
      Panel outer shell:
      Light: white card on #f4f4f4 background, #e3e3e3 border
      Dark:  #2f2f2f surface, #3c3c3c border
    */
    <div className={cn(
      "my-3 w-full max-w-2xl rounded-xl overflow-hidden",
      "bg-card",
      "border border-border",
      "shadow-card",
    )}>

      {/* ── Panel header ────────────────────────────────────── */}
      <div className={cn(
        "flex items-center justify-between gap-3 px-4 py-3",
        "border-b border-border",
        "bg-muted",
      )}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {/* AI Generated badge */}
            <Badge variant="secondary" className="text-[10px]">
              AI Generated
            </Badge>
            {args.industry && (
              <Badge variant="secondary" className="text-[10px]">
                {args.industry}
              </Badge>
            )}
            {args.complianceFramework && (
              <Badge variant="secondary" className="text-[10px]">
                {args.complianceFramework}
              </Badge>
            )}
            {published && (
              <Badge className="text-[10px]">
                <CheckCircle className="w-2.5 h-2.5 mr-1" /> Published
              </Badge>
            )}
          </div>
          <h2 className="font-semibold text-sm leading-tight truncate text-foreground">
            {args.title || "Generating SOP…"}
          </h2>
          {args.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {args.description}
            </p>
          )}
        </div>
        {isStreaming && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
        )}
      </div>

      {/* ── 4 tabs ───────────────────────────────────────────── */}
      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className={cn(
          "w-full rounded-none h-9 px-2 justify-start gap-0.5 overflow-x-auto",
          "border-b border-border",
          "bg-muted",
        )}>
          {[
            { value: "workflow",         icon: BookOpen,    label: "Workflow"    },
            { value: "checklist",        icon: CheckSquare, label: "Checklist"   },
            { value: "responsibilities", icon: Users,       label: "Roles"       },
            { value: "documentation",    icon: FileText,    label: "Manual"      },
          ].map(({ value, icon: Icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "text-xs gap-1.5 h-7 rounded-md px-2.5",
                "text-muted-foreground",
                "data-[state=active]:bg-background data-[state=active]:text-primary",
                "data-[state=active]:shadow-none",
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1: Workflow */}
        <TabsContent value="workflow" className="mt-0 p-4 max-h-80 overflow-y-auto space-y-2">
          {!args.workflow?.length ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {isStreaming ? "Generating workflow…" : "No workflow steps"}
            </p>
          ) : (
            <div className="relative">
              {/* Timeline spine */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {args.workflow.map((step, i) => (
                  <div key={i} className="relative flex gap-3 pl-1">
                    {/* Step number circle — primary blue */}
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 z-10",
                      "bg-primary text-primary-foreground",
                      "ring-2 ring-background",
                    )}>
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-foreground">{step.title}</span>
                        {step.phase && (
                          <Badge variant="secondary" className="text-[10px]">
                            {step.phase}
                          </Badge>
                        )}
                        {step.role && (
                          <Badge variant="secondary" className="text-[10px]">
                            {step.role}
                          </Badge>
                        )}
                        {step.duration && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {step.duration}
                          </span>
                        )}
                      </div>
                      {step.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      )}
                      {step.dependsOn && step.dependsOn.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Depends on step{step.dependsOn.length > 1 ? "s" : ""}: {step.dependsOn.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Checklist */}
        <TabsContent value="checklist" className="mt-0 p-4 max-h-80 overflow-y-auto">
          {!args.checklist?.length ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {isStreaming ? "Generating checklist…" : "No checklist items"}
            </p>
          ) : (
            <div className="space-y-1.5">
              {(["High", "Medium", "Low", undefined] as const).map((priority) => {
                const items = args.checklist!.filter((c) =>
                  priority ? c.priority === priority : !c.priority,
                );
                if (!items.length) return null;
                return (
                  <div key={priority ?? "other"} className="space-y-1">
                    {priority && (
                      <div className="flex items-center gap-1.5 mb-1 mt-2 first:mt-0">
                        <AlertTriangle className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {priority} Priority
                        </span>
                      </div>
                    )}
                    {items.map((item, i) => {
                      const key = `${priority ?? "none"}-${i}`;
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex items-start gap-2.5 px-3 py-2 rounded-lg border transition-colors",
                            "border-[#e3e3e3] dark:border-[#3c3c3c]",
                            checked[i]
                              ? "bg-muted"
                              : "bg-card",
                          )}
                        >
                          <Checkbox
                            id={key}
                            checked={!!checked[i]}
                            onCheckedChange={(v) => setChecked((p) => ({ ...p, [i]: !!v }))}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={key}
                              className={cn(
                                "text-xs leading-relaxed cursor-pointer text-foreground",
                                checked[i] && "line-through text-[#b4b4b4]",
                              )}
                            >
                              {item.text}

                            </label>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {item.assignedRole && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                                  {item.assignedRole}
                                </Badge>
                              )}
                              {item.priority && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                                  {item.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Responsibilities */}
        <TabsContent value="responsibilities" className="mt-0 p-4 max-h-80 overflow-y-auto">
          {!args.responsibilities?.length ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {isStreaming ? "Generating responsibilities…" : "No responsibilities defined"}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {args.responsibilities.map((r, i) => (
                <Card
                  key={i}
                  className="shadow-none"
                >
                  <CardHeader className="pb-1.5 pt-3 px-3">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      {/* Role avatar — primary blue */}
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                        "bg-primary text-primary-foreground",
                      )}>
                        {(r.roleName ?? r.role)[0].toUpperCase()}
                      </div>
                      {r.roleName ?? r.role}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {r.coreDutySummary ?? r.description ?? "—"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Manual / Documentation */}
        <TabsContent value="documentation" className="mt-0 p-4 max-h-80 overflow-y-auto">
          {!args.documentation ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {isStreaming ? "Generating documentation…" : "No documentation yet"}
            </p>
          ) : (
            <div className="space-y-4 text-sm">
              {args.documentation.objective && (
                <section>
                  <h3 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                    Objective
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground">
                    {args.documentation.objective}
                  </p>
                </section>
              )}
              {args.documentation.scope && (
                <section>
                  <h3 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                    Scope
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground">
                    {args.documentation.scope}
                  </p>
                </section>
              )}
              {args.documentation.safetyOrComplianceNotes && (
                <section className="rounded-lg p-3 bg-muted border border-border">
                  <h3 className="font-semibold text-[10px] flex items-center gap-1.5 uppercase tracking-widest text-muted-foreground mb-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Safety &amp; Compliance
                  </h3>
                  <p className="text-xs text-foreground leading-relaxed">
                    {args.documentation.safetyOrComplianceNotes}
                  </p>
                </section>
              )}
              {args.documentation.detailedProcedureMarkdown && (
                <section>
                  <h3 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Detailed Procedure
                  </h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {args.documentation.detailedProcedureMarkdown}
                    </ReactMarkdown>
                  </div>
                </section>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Action footer — shown once streaming completes ────── */}
      {!isStreaming && (
        <div className={cn(
          "flex items-center gap-2 flex-wrap px-4 py-3",
          "border-t border-border",
          "bg-muted",
        )}>
          {/* Publish button */}
          {!published ? (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing || !sopId}
              className="h-7 text-xs gap-1.5 rounded-lg"
            >
              {publishing
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Save className="w-3 h-3" />}
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] px-3 h-7 rounded-lg font-medium bg-primary-light text-primary">
              <CheckCircle className="w-3 h-3" /> Published
            </span>
          )}

          {/* Invite staff button */}
          <Button
            size="sm"
            variant="outline"
            disabled={!sopId}
            onClick={() => setInviteOpen(true)}
            className="h-7 text-xs gap-1.5 rounded-lg"
          >
            <UserPlus className="w-3 h-3" />
            Invite Staff
          </Button>

          {/* Download dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={!sopId || !!downloading}
                className="h-7 text-xs gap-1 rounded-lg"
              >
                {downloading
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <FileDown className="w-3 h-3" />}
                {downloading ? `Downloading ${downloading.toUpperCase()}…` : "Download"}
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider px-2.5 pb-1">
                Download as
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDownload("pdf")}
                disabled={!!downloading}
                className="gap-2 text-xs cursor-pointer rounded-lg mx-1 px-2.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                PDF
                <span className="ml-auto text-[10px] text-muted-foreground">Recommended</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("docx")}
                disabled={!!downloading}
                className="gap-2 text-xs cursor-pointer rounded-lg mx-1 px-2.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("html")}
                disabled={!!downloading}
                className="gap-2 text-xs cursor-pointer rounded-lg mx-1 px-2.5 mb-1"
              >
                <FileDown className="w-3.5 h-3.5" />
                HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View in library */}
          {sopId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5 ml-auto"
              asChild
            >
              <Link href={`/sops/${sopId}`}>
                View in Library <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          )}

          {!sopId && result?.error && (
            <p className="text-xs text-destructive ml-auto">⚠ {result.error}</p>
          )}
        </div>
      )}

      {/* ── Invite dialog ─────────────────────────────────────── */}
      {sopId && (
        <InviteStaffDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          sopId={sopId}
          sopTitle={args?.title}
        />
      )}
    </div>
  );
};

/* ─── Tool registration ──────────────────────────────────────────────────── */

export const GenerateSOPTool = makeAssistantTool({
  toolName:    "generate_sop",
  description:
    "Generate a complete, structured Standard Operating Procedure with workflow, " +
    "checklist, responsibilities, and long-form documentation. " +
    "ALWAYS use this tool when a user asks to create, generate, draft, or build any SOP.",
  parameters,

  type: "frontend",

  execute: async (args) => {
    try {
      const res = await fetch("/api/generate-sop", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        return { sopId: null, error: err.detail ?? err.error ?? "Failed to save SOP" };
      }
      const data = await res.json() as { sopId: string };
      return { sopId: data.sopId };
    } catch {
      return { sopId: null, error: "Network error saving SOP" };
    }
  },

  render: SOPGenerativePanel,
});
