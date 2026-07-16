"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ShieldCheck, AlertTriangle, CheckCircle, Info, Check, X } from "lucide-react";

interface SafetyRequirement {
  category: string;
  description: string;
}

interface SafetyResult {
  overview: string;
  requirements: SafetyRequirement[];
  regulations: string[];
  training: string;
}

const CATEGORY_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  "Health & Safety": { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <AlertTriangle className="w-3 h-3" /> },
  "Compliance":      { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <CheckCircle className="w-3 h-3" /> },
  "Data Privacy":    { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <ShieldCheck className="w-3 h-3" /> },
  "Risk":            { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: <AlertTriangle className="w-3 h-3" /> },
  "Audit":           { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Info className="w-3 h-3" /> },
};

const getStyle = (cat: string) =>
  CATEGORY_STYLES[cat] ?? { color: "bg-muted text-muted-foreground", icon: <Info className="w-3 h-3" /> };

export function SOPSafety({
  sopId,
  sopStatus,
  existingSafetyContent,
  onRefresh,
}: {
  sopId: string;
  sopStatus: string;
  existingSafetyContent?: string;
  onRefresh: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SafetyResult | null>(null);
  const blocked = sopStatus === "APPROVED" || sopStatus === "PUBLISHED";

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/generate-safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setResult(data.result?.safety ?? data.result);
      toast.success("Safety guidelines generated — review and apply");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally { setGenerating(false); }
  };

  const handleApply = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const content = [
        result.overview,
        "",
        ...(result.requirements ?? []).map((r) => `[${r.category}] ${r.description}`),
        ...(result.regulations?.length ? ["", "Applicable Regulations:", ...result.regulations.map((reg) => `• ${reg}`)] : []),
        ...(result.training ? ["", `Training Required: ${result.training}`] : []),
      ].join("\n");

      const res = await fetch(`/api/sops/${sopId}/sections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: [{ type: "safety", title: "Safety & Compliance", content, order: 99 }],
        }),
      });
      if (res.ok) {
        toast.success("Safety section saved to SOP");
        setResult(null);
        onRefresh();
      } else {
        throw new Error("Failed to save");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Safety &amp; Compliance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-extracted safety requirements, regulations, and compliance notes for this process.
          </p>
        </div>
        {!blocked && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
            className="gap-1.5 text-orange-700 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950/30"
          >
            {generating
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
              : <><Sparkles className="w-3.5 h-3.5" />AI Generate</>}
          </Button>
        )}
      </div>

      {/* Existing safety content */}
      {existingSafetyContent && !result && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Current Safety Section
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-amber-900 dark:text-amber-300 whitespace-pre-wrap leading-relaxed">
              {existingSafetyContent}
            </p>
            {!blocked && (
              <p className="text-[10px] text-muted-foreground mt-3">
                Click &ldquo;AI Generate&rdquo; to regenerate with updated analysis.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!existingSafetyContent && !result && !generating && (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No safety guidelines defined yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {blocked
                ? "This SOP is locked and cannot be edited."
                : "Click \"AI Generate\" to extract safety requirements from the SOP content."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI result preview */}
      {result && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Generated Safety Guidelines
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleApply}
                disabled={saving}
                className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                Save to SOP
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setResult(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Overview */}
            <div className="p-3 bg-white dark:bg-background rounded-lg border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Overview</p>
              <p className="text-sm text-foreground leading-relaxed">{result.overview}</p>
            </div>

            {/* Requirements by category */}
            {result.requirements?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Requirements</p>
                {result.requirements.map((req, i) => {
                  const style = getStyle(req.category);
                  return (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-card">
                      <Badge className={`text-[10px] flex items-center gap-1 shrink-0 mt-0.5 ${style.color}`}>
                        {style.icon} {req.category}
                      </Badge>
                      <p className="text-xs text-muted-foreground flex-1">{req.description}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Regulations */}
            {result.regulations?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Applicable Regulations</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.regulations.map((reg, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{reg}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Training */}
            {result.training && (
              <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-400">Training Required</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">{result.training}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
