"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, BookOpen, Languages, Wand2,
  CheckSquare, FileText, Maximize2, Copy, Send,
  MessageSquare, ChevronDown, ChevronUp, Bot, User,
} from "lucide-react";

const LANGUAGES = [
  "Spanish", "French", "German", "Portuguese", "Arabic",
  "Chinese (Simplified)", "Japanese", "Korean", "Italian", "Dutch",
];

const IMPROVE_ACTIONS = [
  { value: "improve",   label: "Improve Writing", icon: <Wand2 className="w-3.5 h-3.5" /> },
  { value: "rewrite",   label: "Rewrite",          icon: <FileText className="w-3.5 h-3.5" /> },
  { value: "grammar",   label: "Fix Grammar",      icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { value: "summarize", label: "Summarize",         icon: <Maximize2 className="w-3.5 h-3.5" /> },
  { value: "simplify",  label: "Simplify",          icon: <BookOpen className="w-3.5 h-3.5" /> },
];

type Tab = "explain" | "chat" | "translate" | "improve";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ sopId: string; title: string; section: string }>;
  isLoading?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "What is the main purpose of this SOP?",
  "Who is responsible for this process?",
  "What are the key steps I need to follow?",
  "What safety precautions should I take?",
  "What resources do I need?",
];

export function SOPAIAssistant({ sopId }: { sopId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("explain");

  // Explain state
  const [explainResult, setExplainResult] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainExpanded, setExplainExpanded] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I can answer questions about this SOP. What would you like to know?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Translate state
  const [language, setLanguage] = useState("Spanish");
  const [translateText, setTranslateText] = useState("");
  const [translateResult, setTranslateResult] = useState("");
  const [translateLoading, setTranslateLoading] = useState(false);

  // Improve state
  const [improveText, setImproveText] = useState("");
  const [improveResult, setImproveResult] = useState("");
  const [improveLoading, setImproveLoading] = useState(false);
  const [improveAction, setImproveAction] = useState("improve");

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Explain ────────────────────────────────────────────────────
  const handleExplain = async () => {
    setExplainLoading(true);
    setExplainResult("");
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExplainResult(data.result);
      setExplainExpanded(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setExplainLoading(false); }
  };

  // ── Chat ───────────────────────────────────────────────────────
  const sendChat = async (questionOverride?: string) => {
    const question = (questionOverride ?? chatInput).trim();
    if (!question) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: question },
      { role: "assistant", content: "", isLoading: true },
    ];
    setMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId, messages: newMessages.filter((m) => !m.isLoading) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");

      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? { role: "assistant" as const, content: data.answer, sources: data.sources }
            : m
        )
      );
    } catch (err: unknown) {
      setMessages((prev) =>
        prev.map((m) =>
          m.isLoading
            ? { role: "assistant" as const, content: "Sorry, I couldn't process that. Please try again." }
            : m
        )
      );
      toast.error(err instanceof Error ? err.message : "Chat failed");
    } finally { setChatLoading(false); }
  };

  // ── Translate ──────────────────────────────────────────────────
  const handleTranslate = async () => {
    if (!translateText.trim()) { toast.error("Paste some text to translate"); return; }
    setTranslateLoading(true);
    setTranslateResult("");
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "translate", content: translateText, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTranslateResult(data.result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setTranslateLoading(false); }
  };

  // ── Improve ────────────────────────────────────────────────────
  const handleImprove = async () => {
    if (!improveText.trim()) { toast.error("Paste some text to process"); return; }
    setImproveLoading(true);
    setImproveResult("");
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: improveAction, content: improveText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImproveResult(data.result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setImproveLoading(false); }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "explain",   label: "Plain English",  icon: <BookOpen className="w-3.5 h-3.5" /> },
    { key: "chat",      label: "Ask AI",          icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: "translate", label: "Translate",       icon: <Languages className="w-3.5 h-3.5" /> },
    { key: "improve",   label: "Improve",         icon: <Wand2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
              activeTab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Plain English ─────────────────────────────────────── */}
      {activeTab === "explain" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" /> Plain English Explanation
              </CardTitle>
              {explainResult && (
                <button
                  onClick={() => setExplainExpanded(!explainExpanded)}
                  className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
                >
                  {explainExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {explainExpanded ? "Collapse" : "Expand"}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              AI reads the entire SOP and explains it in simple language any employee can understand — no jargon.
            </p>

            <Button className="w-full" size="sm" onClick={handleExplain} disabled={explainLoading}>
              {explainLoading
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Explaining…</>
                : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />{explainResult ? "Regenerate Explanation" : "Explain This SOP"}</>}
            </Button>

            {explainResult && explainExpanded && (
              <div className="space-y-2">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto text-blue-900 dark:text-blue-200">
                  {explainResult}
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => copyText(explainResult)}>
                  <Copy className="w-3 h-3 mr-1.5" /> Copy explanation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Ask AI (Chat) ─────────────────────────────────────── */}
      {activeTab === "chat" && (
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-500" /> Ask about this SOP
              <Badge className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                Context-aware
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Message thread */}
            <div className="border border-border rounded-lg bg-muted/20 p-3 space-y-3 max-h-80 overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-purple-100 dark:bg-purple-900/30"
                  }`}>
                    {msg.role === "user"
                      ? <User className="w-3.5 h-3.5" />
                      : <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                  </div>
                  <div className={`flex-1 min-w-0 ${msg.role === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border text-foreground"
                    }`}>
                      {msg.isLoading
                        ? <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Thinking…</span>
                        : msg.content}
                    </div>
                    {/* Source citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {msg.sources.map((s, si) => (
                          <Badge key={si} variant="outline" className="text-[9px]">
                            📄 {s.section}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Suggested questions (show only at start) */}
            {messages.length <= 1 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Suggested questions</p>
                <div className="flex flex-col gap-1">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendChat(q)}
                      disabled={chatLoading}
                      className="text-left text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Ask anything about this SOP…"
                className="text-sm h-9"
                disabled={chatLoading}
              />
              <Button size="sm" className="h-9 px-3" onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()}>
                {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Translate ─────────────────────────────────────────── */}
      {activeTab === "translate" && (
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
              <Textarea value={translateText} onChange={(e) => setTranslateText(e.target.value)} placeholder="Paste section content here…" rows={4} className="text-sm" />
            </div>
            <Button className="w-full" size="sm" onClick={handleTranslate} disabled={translateLoading || !translateText.trim()}>
              {translateLoading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Translating…</> : <><Languages className="w-3.5 h-3.5 mr-1.5" />Translate to {language}</>}
            </Button>
            {translateResult && (
              <div className="space-y-2">
                <div className="bg-muted/60 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{translateResult}</div>
                <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => copyText(translateResult)}>
                  <Copy className="w-3 h-3 mr-1.5" /> Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Improve ───────────────────────────────────────────── */}
      {activeTab === "improve" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-500" /> Improve Writing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Text to Process</Label>
              <Textarea value={improveText} onChange={(e) => setImproveText(e.target.value)} placeholder="Paste section content here…" rows={4} className="text-sm" />
            </div>
            <Button className="w-full" size="sm" onClick={handleImprove} disabled={improveLoading || !improveText.trim()}>
              {improveLoading
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Processing…</>
                : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Apply {IMPROVE_ACTIONS.find((a) => a.value === improveAction)?.label}</>}
            </Button>
            {improveResult && (
              <div className="space-y-2">
                <div className="bg-muted/60 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">{improveResult}</div>
                <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => copyText(improveResult)}>
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
