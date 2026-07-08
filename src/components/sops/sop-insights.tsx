"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Lightbulb, Copy, Loader2, AlertTriangle,
  CheckCircle, Info, ChevronDown, ChevronUp,
  ArrowRight, X, ExternalLink, RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface Suggestion {
  priority: "high" | "medium" | "low";
  category: string;
  issue: string;
  suggestion: string;
}

interface SuggestionsResult {
  score: number;
  summary: string;
  suggestions: Suggestion[];
  missing: string[];
}

interface DuplicateItem {
  id: string;
  title: string;
  similarity: "high" | "medium" | "low";
  reason: string;
}

interface DuplicateResult {
  duplicates: DuplicateItem[];
  recommendation: string;
}

const PRIORITY_CONFIG = {
  high:   { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",     icon: <AlertTriangle className="w-3 h-3" />, label: "Critical" },
  medium: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Info className="w-3 h-3" />,          label: "Recommended" },
  low:    { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <CheckCircle className="w-3 h-3" />,   label: "Optional" },
};

const SIM_COLORS: Record<string, string> = {
  high:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const scoreGrade = (score: number) => {
  if (score >= 85) return { label: "Excellent", color: "text-green-500" };
  if (score >= 70) return { label: "Good",      color: "text-green-500" };
  if (score >= 55) return { label: "Fair",      color: "text-yellow-500" };
  return              { label: "Needs work",   color: "text-red-500" };
};

export function SOPInsights({ sopId }: { sopId: string }) {
  const [suggestions, setSuggestions] = useState<SuggestionsResult | null>(null);
  const [duplicates, setDuplicates]   = useState<DuplicateResult | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingDuplicates,  setLoadingDuplicates]  = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const [dismissed,          setDismissed]          = useState<Set<number>>(new Set());
  const [dismissedDups,      setDismissedDups]      = useState<Set<string>>(new Set());

  const runSuggestions = async () => {
    setLoadingSuggestions(true);
    setDismissed(new Set());
    try {
      const res  = await fetch("/api/ai/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sopId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuggestions(data.result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally { setLoadingSuggestions(false); }
  };

  const runDuplicates = async () => {
    setLoadingDuplicates(true);
    setDismissedDups(new Set());
    try {
      const res  = await fetch("/api/ai/detect-duplicates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sopId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDuplicates(data.result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Detection failed");
    } finally { setLoadingDuplicates(false); }
  };

  const dismissSuggestion = (i: number) => {
    setDismissed((prev) => new Set(prev).add(i));
    setExpandedSuggestion(null);
    toast.success("Suggestion dismissed");
  };

  const dismissDuplicate = (id: string) => {
    setDismissedDups((prev) => new Set(prev).add(id));
    toast.success("Marked as not a duplicate");
  };

  const visibleSuggestions = suggestions?.suggestions?.filter((_, i) => !dismissed.has(i)) ?? [];
  const visibleDuplicates  = duplicates?.duplicates?.filter((d) => !dismissedDups.has(d.id)) ?? [];

  const grade = suggestions ? scoreGrade(suggestions.score) : null;

  return (
    <div className="space-y-4">

      {/* ── Quality Analysis ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" /> Quality Analysis
          </CardTitle>
          <Button size="sm" variant="outline" onClick={runSuggestions} disabled={loadingSuggestions} className="gap-1.5">
            {loadingSuggestions
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing…</>
              : suggestions
                ? <><RefreshCw className="w-3.5 h-3.5" />Re-analyze</>
                : "Analyze SOP"}
          </Button>
        </CardHeader>

        <CardContent className="pt-0">
          {!suggestions ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Click &ldquo;Analyze SOP&rdquo; to get AI-powered quality suggestions and improvement recommendations.
            </p>
          ) : (
            <div className="space-y-4">

              {/* Score */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-center min-w-[56px]">
                  <p className={`text-3xl font-bold tabular-nums ${grade?.color}`}>{suggestions.score}</p>
                  <p className="text-[10px] text-muted-foreground">/ 100</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <Progress value={suggestions.score} className="h-2 flex-1 mr-3" />
                    <Badge className={`text-[10px] shrink-0 ${
                      suggestions.score >= 70
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : suggestions.score >= 55
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {grade?.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{suggestions.summary}</p>
                </div>
              </div>

              {/* Missing items */}
              {suggestions.missing?.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-red-800 dark:text-red-400">Missing sections:</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {suggestions.missing.map((m, i) => (
                        <Badge key={i} className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{m}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Stats bar */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  {suggestions.suggestions?.filter((s) => s.priority === "high").length ?? 0} critical
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  {suggestions.suggestions?.filter((s) => s.priority === "medium").length ?? 0} recommended
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  {suggestions.suggestions?.filter((s) => s.priority === "low").length ?? 0} optional
                </span>
                {dismissed.size > 0 && (
                  <span className="ml-auto text-[10px]">{dismissed.size} dismissed</span>
                )}
              </div>

              {/* Suggestion list */}
              {visibleSuggestions.length === 0 ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {dismissed.size > 0 ? "All suggestions dismissed." : "No suggestions — looks great!"}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {suggestions.suggestions?.map((s, i) => {
                    if (dismissed.has(i)) return null;
                    const config = PRIORITY_CONFIG[s.priority] ?? PRIORITY_CONFIG.low;
                    const isOpen = expandedSuggestion === i;
                    return (
                      <div key={i} className="border border-border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedSuggestion(isOpen ? null : i)}
                        >
                          <Badge className={`text-[10px] flex items-center gap-1 shrink-0 mt-0.5 ${config.color}`}>
                            {config.icon} {config.label}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{s.issue}</p>
                            <p className="text-[10px] text-muted-foreground">{s.category}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isOpen
                              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/20">
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                              <strong className="text-foreground">Fix: </strong>{s.suggestion}
                            </p>
                            <div className="flex justify-end mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                                onClick={() => dismissSuggestion(i)}
                              >
                                <X className="w-3 h-3" /> Dismiss
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Duplicate Detection ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Copy className="w-4 h-4 text-orange-500" /> Duplicate Detection
          </CardTitle>
          <Button size="sm" variant="outline" onClick={runDuplicates} disabled={loadingDuplicates} className="gap-1.5">
            {loadingDuplicates
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Checking…</>
              : duplicates
                ? <><RefreshCw className="w-3.5 h-3.5" />Re-check</>
                : "Check Duplicates"}
          </Button>
        </CardHeader>

        <CardContent className="pt-0">
          {!duplicates ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Click &ldquo;Check Duplicates&rdquo; to find similar SOPs that could be consolidated.
            </p>
          ) : visibleDuplicates.length === 0 ? (
            <div className="flex items-center gap-2.5 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-xs text-green-800 dark:text-green-400">
                {dismissedDups.size > 0
                  ? `All ${dismissedDups.size} potential duplicate${dismissedDups.size > 1 ? "s" : ""} dismissed.`
                  : "No duplicates found — this SOP appears to be unique."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicates.recommendation && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800 dark:text-orange-400">{duplicates.recommendation}</p>
                </div>
              )}

              {duplicates.duplicates.map((dup) => {
                if (dismissedDups.has(dup.id)) return null;
                return (
                  <div key={dup.id} className="p-3 bg-card border border-border rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-medium truncate">{dup.title}</p>
                          <Badge className={`text-[10px] shrink-0 ${SIM_COLORS[dup.similarity] ?? SIM_COLORS.low}`}>
                            {dup.similarity} similarity
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{dup.reason}</p>
                      </div>
                    </div>
                    {/* Action row */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border">
                      <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" asChild>
                        <Link href={`/sops/${dup.id}`} target="_blank">
                          <ExternalLink className="w-3 h-3" /> View SOP
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground ml-auto"
                        onClick={() => dismissDuplicate(dup.id)}
                      >
                        <X className="w-3 h-3" /> Not a duplicate
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" asChild>
                        <Link href={`/sops/${dup.id}`}>
                          <ArrowRight className="w-3 h-3" /> Open &amp; compare
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
