"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle, XCircle, MessageSquare, Send,
  Clock, AlertCircle, Loader2,
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

export function SOPApproval({ sopId, sopStatus, authorId, currentUserId, approvals, onRefresh }: SOPApprovalProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const isAuthor = currentUserId === authorId;
  const canSubmit = isAuthor && sopStatus === "DRAFT";
  const canReview = sopStatus === "REVIEW";

  const handleAction = async (action: string) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/sops/${sopId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const messages: Record<string, string> = {
        submit: "SOP submitted for review",
        approve: "SOP approved",
        reject: "SOP rejected — returned to draft",
        request_changes: "Changes requested",
      };
      toast.success(messages[action] ?? "Action completed");
      setComment("");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const approvalStatusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Clock className="w-3 h-3" /> },
    APPROVED: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle className="w-3 h-3" /> },
    REJECTED: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <XCircle className="w-3 h-3" /> },
    CHANGES_REQUESTED: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: <AlertCircle className="w-3 h-3" /> },
  };

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
        <div>
          <p className="text-sm font-medium">Current Status</p>
          <p className="text-xs text-muted-foreground mt-0.5">Change status through the approval workflow</p>
        </div>
        <Badge className={`${STATUS_COLORS[sopStatus]} text-xs`}>{STATUS_LABELS[sopStatus]}</Badge>
      </div>

      {/* Author Actions */}
      {canSubmit && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" /> Submit for Review
            </p>
            <p className="text-xs text-muted-foreground">Submit this SOP to be reviewed and approved. You can add a note below.</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional note for reviewers..."
              rows={2}
              className="text-sm"
            />
            <Button size="sm" onClick={() => handleAction("submit")} disabled={!!loading}>
              {loading === "submit" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Submit for Review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviewer Actions */}
      {canReview && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Review Decision</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your review comment (optional for approval, recommended for rejection)..."
              rows={3}
              className="text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => handleAction("approve")} disabled={!!loading} className="bg-green-600 hover:bg-green-700 text-white">
                {loading === "approve" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction("request_changes")} disabled={!!loading} className="border-orange-300 text-orange-700 hover:bg-orange-50">
                {loading === "request_changes" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5 mr-1.5" />}
                Request Changes
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction("reject")} disabled={!!loading} className="border-red-300 text-red-700 hover:bg-red-50">
                {loading === "reject" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      {approvals.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Approval History</p>
          {approvals.map((approval) => {
            const config = approvalStatusConfig[approval.status] ?? approvalStatusConfig.PENDING;
            return (
              <div key={approval.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={approval.approver.image ?? ""} />
                  <AvatarFallback className="text-xs">{approval.approver.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{approval.approver.name}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${config.color}`}>
                      {config.icon}{approval.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{timeAgo(approval.updatedAt)}</span>
                  </div>
                  {approval.comment && (
                    <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{approval.comment}&rdquo;</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sopStatus === "REVIEW" && approvals.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Awaiting review. Anyone with access can approve, reject, or request changes.
        </p>
      )}
    </div>
  );
}
