"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileCheck, Loader2, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface AcknowledgementBannerProps {
  sopId: string;
  sopStatus: string;
  sopTitle: string;
}

export function SOPAcknowledgementBanner({ sopId, sopStatus, sopTitle }: AcknowledgementBannerProps) {
  const [acknowledged,    setAcknowledged]    = useState(false);
  const [acknowledgedAt,  setAcknowledgedAt]  = useState<string | null>(null);
  const [totalCount,      setTotalCount]      = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [submitting,      setSubmitting]      = useState(false);
  const [checked,         setChecked]         = useState(false);
  const [dismissed,       setDismissed]       = useState(false);

  // Only show for PUBLISHED SOPs
  const shouldShow = sopStatus === "PUBLISHED";

  useEffect(() => {
    if (!shouldShow) return;
    fetch(`/api/sops/${sopId}/acknowledge`)
      .then((r) => r.json())
      .then((data) => {
        setAcknowledged(data.acknowledged);
        setAcknowledgedAt(data.acknowledgedAt);
        setTotalCount(data.totalCount ?? 0);
      })
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, [sopId, shouldShow]);

  const handleAcknowledge = async () => {
    if (!checked) { toast.error("Please check the box to confirm you have read this SOP"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAcknowledged(true);
      setAcknowledgedAt(data.acknowledgedAt);
      setTotalCount((c) => c + 1);
      toast.success("Acknowledgement recorded ✓");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record acknowledgement");
    } finally { setSubmitting(false); }
  };

  if (!shouldShow || loading || dismissed) return null;

  // ── Already acknowledged ──────────────────────────────────────
  if (acknowledged) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl text-sm">
        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        <span className="text-green-800 dark:text-green-400 flex-1">
          You acknowledged this SOP
          {acknowledgedAt && <span className="text-green-600 dark:text-green-500 text-xs ml-1">on {formatDateTime(acknowledgedAt)}</span>}
        </span>
        <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
          {totalCount} acknowledgement{totalCount !== 1 ? "s" : ""}
        </Badge>
      </div>
    );
  }

  // ── Pending acknowledgement ───────────────────────────────────
  return (
    <div className="relative px-4 py-3.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
      <button
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-2.5">
        <FileCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
            Acknowledgement Required
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 leading-relaxed">
            Please confirm you have read and understood <strong>&ldquo;{sopTitle}&rdquo;</strong> before proceeding.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <Checkbox
          id="ack-confirm"
          checked={checked}
          onCheckedChange={(v) => setChecked(!!v)}
          className="mt-0.5"
        />
        <label htmlFor="ack-confirm" className="text-xs text-blue-800 dark:text-blue-300 cursor-pointer leading-relaxed">
          I confirm that I have read, understood, and will follow this Standard Operating Procedure.
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={handleAcknowledge}
          disabled={submitting || !checked}
          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
        >
          {submitting
            ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Recording…</>
            : <><CheckCircle className="w-3 h-3 mr-1.5" />Acknowledge &amp; Confirm</>}
        </Button>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {totalCount} already acknowledged
        </span>
      </div>
    </div>
  );
}
