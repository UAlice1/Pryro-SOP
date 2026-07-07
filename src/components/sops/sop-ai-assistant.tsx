"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Sparkles, Loader2, BookOpen, Languages, Wand2,
  CheckSquare, FileText, Maximize2, Copy,
} from "lucide-react";

const LANGUAGES = [
  "Spanish", "French", "German", "Portuguese", "Arabic",
  "Chinese (Simplified)", "Japanese", "Korean", "Italian", "Dutch",
];

const IMPROVE_ACTIONS = [
  { value: "improve", label: "Improve Writing", icon: <Wand2 className="w-4 h-4" /> },
  { value: "rewrite", label: "Rewrite", icon: <FileText className="w-4 h-4" /> },
  { value: "grammar", label: "Fix Grammar", icon: <CheckSquare className="w-4 h-4" /> },
  { value: "summarize", label: "Summarize", icon: <Maximize2 className="w-4 h-4" /> },
  { value: "simplify", label: "Simplify", icon: <BookOpen className="w-4 h-4" /> },
];

export function SOPAIAssistant({ sopId }: { sopId: string }) {
  const [activeSection, setActiveSection] = useState<"explain" | "translate" | "improve">("explain");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("Spanish");
  const [textToProcess, setTextToProcess] = useState("");
  const [improveAction, setImproveAction] = useState("improve");

  const handleExplain = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!textToProcess.trim()) { toast.error("Paste some text to translate"); return; }
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "translate", content: textToProcess, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!textToProcess.trim()) { toast.error("Paste some text to process"); return; }
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: improveAction, content: textToProcess }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4">
      {/* Section Selector */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["explain", "translate", "improve"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setActiveSection(s); setResult(""); }}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              activeSection === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Explain */}
      {activeSection === "explain" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" /> Explain in Simple Language
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              AI will read the entire SOP and explain it in plain English that any employee can understand, without jargon.
            </p>
            <Button className="w-full" size="sm" onClick={handleExplain} disabled={loading}>
              {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Explaining...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Explain This SOP</>}
            </Button>
            {result && (
              <div className="space-y-2">
                <div className="bg-muted/60 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {result}
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={copyResult}>
                  <Copy className="w-3 h-3 mr-1.5" /> Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Translate */}
      {activeSection === "translate" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Languages className="w-4 h-4 text-green-500" /> Translate Section
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Target Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Text to Translate</Label>
              <Textarea
                value={textToProcess}
                onChange={(e) => setTextToProcess(e.target.value)}
                placeholder="Paste the section content here..."
                rows={4}
                className="text-sm"
              />
            </div>
            <Button className="w-full" size="sm" onClick={handleTranslate} disabled={loading || !textToProcess.trim()}>
              {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Translating...</> : <><Languages className="w-3.5 h-3.5 mr-1.5" />Translate to {language}</>}
            </Button>
            {result && (
              <div className="space-y-2">
                <div className="bg-muted/60 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {result}
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={copyResult}>
                  <Copy className="w-3 h-3 mr-1.5" /> Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Improve Writing */}
      {activeSection === "improve" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-500" /> Improve Writing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {IMPROVE_ACTIONS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setImproveAction(a.value)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-colors ${
                      improveAction === a.value ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:bg-muted"
                    }`}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Text to Process</Label>
              <Textarea
                value={textToProcess}
                onChange={(e) => setTextToProcess(e.target.value)}
                placeholder="Paste section content here..."
                rows={4}
                className="text-sm"
              />
            </div>
            <Button className="w-full" size="sm" onClick={handleImprove} disabled={loading || !textToProcess.trim()}>
              {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Processing...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Apply {IMPROVE_ACTIONS.find((a) => a.value === improveAction)?.label}</>}
            </Button>
            {result && (
              <div className="space-y-2">
                <div className="bg-muted/60 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {result}
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={copyResult}>
                  <Copy className="w-3 h-3 mr-1.5" /> Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
