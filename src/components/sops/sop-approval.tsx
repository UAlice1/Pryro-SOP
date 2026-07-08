"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle, XCircle, MessageSquare, Send,
  Clock, AlertCircle, Loader2, Globe, ArrowLeft,
  ShieldCheck, FileCheck,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, timeAgo } from "@/lib/utils";

interface Approval {
  id: string;
  status: string;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  approver: { id: string; name: string | null; image: string | null };
}

interface SOPApprovalProps {
  sopId: string;
  sopStatus: string;
  authorId: string;
  currentUserId: string;
  approvals: Approval[];
  onRefresh: () => void;
}

// State machine: what transitions are allowed from each status
const TRANSITIONS: Record<string, string[]> = {
  DRAFT:     ["submit"],
  REVIEW:    ["approve", "reject", "request_changes"],
  APPROVED:  ["publish", "withdraw"],
  PUBLISHED: ["withdraw"],
  ARCHIVED:  [],
};

const APPROVAL_STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING:           { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",  icon: <Clock className="w-3 h-3" />,         label: "Pending" },
  APPROVED:          { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",      icon: <CheckCircle className="w-3 h-3" />,    label: "Approved" },
  REJECTED:          { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",              icon: <XCircle className="w-3 h-3" />,        label: "Rejected" },
  CHANGES_REQUESTED: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: <AlertCircle className="w-3 h-3" />,    label: "Changes Requested" },
};

// Visual state machine flow steps
const FLOW_STEPS = [
  { status: "DRAFT",     label: "Draft",    icon: <FileCheck className="w-3.5 h-3.5" /> },
  { status: "REVIEW",    label: "Review",   icon: <Clock className="w-3.5 h-3.5" /> },
  { status: "APPROVED",  label: "Approved", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { status: "PUBLISHED", label: "Published",icon: <Globe className="w-3.5 h-3.5" /> },
];

const STEP_ORDER: Record<string, number> = { DRAFT: 0, REVIEW: 1, APPROVED: 2, PUBLISHED: 3 };

export function SOPApproval({
  sopId, sopStatus, authorId, currentUserId, approvals, onRefresh,
}: SOPApprovalProps) {
  const [comment, setComment]   = useState("");
  const [loading, setLoading]   = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const isAuthor      = currentUserId === authorId;
  const allowedActions = TRANSITIONS[sopStatus] ?? [];
  const currentStep   = STEP_ORDER[sopStatus] ?? 0;

  const handleAction = async (action: string) => {
    // Destructive actions need confirmation
    if ((action === "reject" || action === "withdraw") && !confirmAction) {
      setConfirmAction(action);
      return;
    }
    setConfirmAction(null);
    setLoading(action);

    try {
      const res = await fetch(`/api/sops/${sopId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const labels: Record<string, string> = {
        submit:           "Submitted for review",
        approve:          "SOP approved ✓",
        reject:           "SOP returned to draft",
        request_changes:  "Changes requested",
        publish:          "SOP published 🎉",
        withdraw:         "SOP withdrawn to draft",
      };
      toast.success(labels[action] ?? "Done");
      setComment("");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── State machine progress bar ──────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Workflow Progress</p>
            <Badge className={`text-[10px] ${STATUS_COLORS[sopStatus]}`}>{STATUS_LABELS[sopStatus]}</Badge>
          </div>

          <div className="relative mt-4">
            {/* connector line */}
            <div className="absolute top-3.5 left-0 right-0 h-px bg-border" />
            <div
              className="absolute top-3.5 left-0 h-px bg-primary transition-all duration-500"
              style={{ width: `${(currentStep / (FLOW_STEPS.length - 1)) * 100}%` }}
            />

            <div className="relative flex justify-between">
              {FLOW_STEPS.map((step, i) => {
                const done    = i < currentStep;
                const current = i === currentStep;
                return (
                  <div key={step.status} className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 ring-2 ring-background transition-colors ${
                      done    ? "bg-primary text-primary-foreground" :
                      current ? "bg-primary text-primary-foreground ring-primary/30 ring-4" :
                                "bg-muted text-muted-foreground"
                    }`}>
                      {step.icon}
                    </div>
                    <span className={`text-[10px] font-medium ${current ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Confirmation dialog for destructive actions ─────── */}
      {confirmAction && (
        <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-red-800 dark:text-red-400">
              {confirmAction === "reject"   ? "Reject this SOP?" :
               confirmAction === "withdraw" ? "Withdraw this SOP?" : "Confirm action?"}
            </p>
            <p className="text-xs text-muted-foreground">
              {confirmAction === "reject"
                ? "This will return the SOP to Draft status. The author will need to resubmit."
                : "This will move the SOP back to Draft status."}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => handleAction(confirmAction)} disabled={!!loading}>
                {loading === confirmAction
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : "Confirm"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Action panel ────────────────────────────────────── */}
      {!confirmAction && allowedActions.length > 0 && (
        <>
          {/* SUBMIT */}
          {allowedActions.includes("submit") && isAuthor && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-500" /> Submit for Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Submit this SOP to reviewers. Add an optional note explaining what changed.
                </p>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional note for reviewers…"
                  rows={2}
                  className="text-sm"
                />
                <Button size="sm" onClick={() => handleAction("submit")} disabled={!!loading}>
                  {loading === "submit"
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting…</>
                    : <><Send className="w-3.5 h-3.5 mr-1.5" />Submit for Review</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* REVIEW ACTIONS */}
          {allowedActions.includes("approve") && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Review Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Review the SOP content and make a decision. Your comment will be visible to the author.
                </p>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add review comment (optional for approval, recommended for rejection)…"
                  rows={3}
                  className="text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAction("approve")}
                    disabled={!!loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading === "approve"
                      ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("request_changes")}
                    disabled={!!loading}
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
                  >
                    {loading === "request_changes"
                      ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      : <MessageSquare className="w-3.5 h-3.5 mr-1.5" />}
                    Request Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("reject")}
                    disabled={!!loading}
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                  >
                    {loading === "reject"
                      ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PUBLISH */}
          {allowedActions.includes("publish") && (
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-500" /> Publish SOP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Publishing makes this SOP live and visible to all employees. It will prompt acknowledgement.
                </p>
                <Button
                  size="sm"
                  onClick={() => handleAction("publish")}
                  disabled={!!loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loading === "publish"
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Publishing…</>
                    : <><Globe className="w-3.5 h-3.5 mr-1.5" />Publish SOP</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* WITHDRAW */}
          {allowedActions.includes("withdraw") && isAuthor && (
            <div className="flex items-center justify-between px-4 py-3 bg-muted/40 rounded-lg border border-border">
              <div>
                <p className="text-xs font-medium">Withdraw SOP</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Return to draft for further editing.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("withdraw")}
                disabled={!!loading}
                className="text-xs border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              >
                {loading === "withdraw"
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <ArrowLeft className="w-3.5 h-3.5 mr-1" />}
                Withdraw
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── No actions available ─────────────────────────────── */}
      {allowedActions.length === 0 && (
        <div className="flex items-center gap-2.5 p-3 bg-muted/40 rounded-lg border border-border">
          <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            No actions available for this status. Archived SOPs cannot be modified.
          </p>
        </div>
      )}

      {/* ── Approval history ─────────────────────────────────── */}
      {approvals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approval History</p>
          {approvals.map((approval) => {
            const config = APPROVAL_STATUS_CONFIG[approval.status] ?? APPROVAL_STATUS_CONFIG.PENDING;
            return (
              <div key={approval.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={approval.approver.image ?? ""} />
                  <AvatarFallback className="text-[10px]">{approval.approver.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{approval.approver.name ?? "Unknown"}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${config.color}`}>
                      {config.icon} {config.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(approval.updatedAt)}</span>
                  </div>
                  {approval.comment && (
                    <p className="text-xs text-muted-foreground mt-1 italic leading-relaxed">
                      &ldquo;{approval.comment}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Awaiting message ────────────────────────────────── */}
      {sopStatus === "REVIEW" && approvals.length === 0 && (
        <div className="flex items-center gap-2.5 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-800 dark:text-yellow-400">
            Awaiting review. Managers can approve, reject, or request changes from this page.
          </p>
        </div>
      )}
    </div>
  );
}
