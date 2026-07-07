"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Lightbulb, Copy, Loader2, AlertTriangle,
  CheckCircle, Info, ChevronDown, ChevronUp, ArrowRight,
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

interface DuplicateResult {
  duplicates: Array<{ id: string; title: string; similarity: string; reason: string }>;
  recommendation: string;
}

const PRIORITY_CONFIG = {
  high: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <AlertTriangle className="w-3 h-3" /> },
  medium: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: <Info className="w-3 h-3" /> },
  low: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <CheckCircle className="w-3 h-3" /> },
};

const SIM_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export function SOPInsights({ sopId }: { sopId: string }) {
  const [suggestions, setSuggestions] = useState<SuggestionsResult | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateResult | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

  const runSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuggestions(data.result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const runDuplicates = async () => {
    setLoadingDuplicates(true);
    try {
      const res = await fetch("/api/ai/detect-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDuplicates(data.result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="space-y-4">
      {/* Quality Analysis */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" /> Quality Analysis
          </CardTitle>
          <Button size="sm" variant="outline" onClick={runSuggestions} disabled={loadingSuggestions}>
            {loadingSuggestions ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Analyzing...</> : "Analyze SOP"}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {!suggestions ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Click &ldquo;Analyze SOP&rdquo; to get AI-powered quality suggestions and improvement recommendations.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Score */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${scoreColor(suggestions.score)}`}>{suggestions.score}</p>
                  <p className="text-[10px] text-muted-foreground">/ 100</p>
                </div>
                <div className="flex-1">
                  <Progress value={suggestions.score} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">{suggestions.summary}</p>
                </div>
              </div>

              {/* Missing items */}
              {suggestions.missing?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <p className="text-xs font-medium w-full">Missing:</p>
                  {suggestions.missing.map((m, i) => (
                    <Badge key={i} className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              <div className="space-y-2">
                {suggestions.suggestions?.map((s, i) => {
                  const config = PRIORITY_CONFIG[s.priority] ?? PRIORITY_CONFIG.low;
                  return (
                    <div key={i} className="border border-border rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedSuggestion(expandedSuggestion === i ? null : i)}
                      >
                        <Badge className={`text-[10px] flex items-center gap-1 shrink-0 mt-0.5 ${config.color}`}>
                          {config.icon}{s.priority}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{s.issue}</p>
                          <p className="text-[10px] text-muted-foreground">{s.category}</p>
                        </div>
                        {expandedSuggestion === i
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                      </button>
                      {expandedSuggestion === i && (
                        <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/30">
                          <p className="text-xs text-muted-foreground mt-2">
                            <strong className="text-foreground">Fix:</strong> {s.suggestion}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate Detection */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Copy className="w-4 h-4 text-orange-500" /> Duplicate Detection
          </CardTitle>
          <Button size="sm" variant="outline" onClick={runDuplicates} disabled={loadingDuplicates}>
            {loadingDuplicates ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Checking...</> : "Check Duplicates"}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {!duplicates ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Click &ldquo;Check Duplicates&rdquo; to find similar SOPs that could be consolidated.
            </p>
          ) : duplicates.duplicates?.length === 0 ? (
            <div className="flex items-center gap-2 py-4">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm text-muted-foreground">No duplicates found — this SOP appears to be unique.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicates.recommendation && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800 dark:text-orange-400">{duplicates.recommendation}</p>
                </div>
              )}
              {duplicates.duplicates.map((dup) => (
                <div key={dup.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{dup.title}</p>
                      <Badge className={`text-[10px] shrink-0 ${SIM_COLORS[dup.similarity] ?? SIM_COLORS.low}`}>
                        {dup.similarity} similarity
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{dup.reason}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 shrink-0" asChild>
                    <Link href={`/sops/${dup.id}`}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
