"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Wand2, CheckSquare, Users, BookOpen,
  Languages, Lightbulb, Loader2,
} from "lucide-react";
import { toast } from "sonner";

const AI_ACTIONS = [
  { value: "improve", label: "Improve Writing", icon: Wand2 },
  { value: "grammar", label: "Fix Grammar", icon: CheckSquare },
  { value: "rewrite", label: "Rewrite", icon: Sparkles },
  { value: "summarize", label: "Summarize", icon: BookOpen },
  { value: "simplify", label: "Simplify Language", icon: Lightbulb },
  { value: "translate", label: "Translate", icon: Languages },
];

export function AIToolbar({ sopId, onRefresh }: { sopId: string; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("improve");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("Spanish");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleRun = async () => {
    if (!content.trim()) { toast.error("Please enter some text"); return; }
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success("Copied to clipboard");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30">
          <Sparkles className="w-3.5 h-3.5" /> AI Tools
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4 space-y-3" align="start">
        <div>
          <p className="font-medium text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-500" /> AI Writing Tools</p>
          <p className="text-xs text-muted-foreground">Paste any section of your SOP to improve it with AI.</p>
        </div>

        <div className="space-y-2">
          <Label>Action</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {AI_ACTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => setAction(a.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs border transition-colors ${action === a.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}
              >
                <a.icon className="w-4 h-4" />
                {a.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {action === "translate" && (
          <div className="space-y-2">
            <Label>Target Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Spanish", "French", "German", "Portuguese", "Arabic", "Chinese", "Japanese"].map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Text to Process</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Paste the section text here..." className="text-xs" />
        </div>

        <Button className="w-full" size="sm" onClick={handleRun} disabled={loading || !content.trim()}>
          {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Run AI</>}
        </Button>

        {result && (
          <div className="space-y-2">
            <Label>Result</Label>
            <div className="text-xs bg-muted/60 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap">{result}</div>
            <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={handleCopy}>Copy Result</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
