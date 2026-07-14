"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Save, Eye, EyeOff, CheckCircle, ExternalLink,
  Cpu, Key, Zap, AlertTriangle, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ─── Provider definitions ───────────────────────────────────────────────── */

interface ProviderDef {
  id:       string;
  label:    string;
  logo:     string;        // emoji stand-in
  color:    string;
  docsUrl:  string;
  keyHint:  string;
  models:   string[];
  baseUrl:  string;
  supportsWhisper: boolean;
}

const PROVIDERS: ProviderDef[] = [
  { id: "openai",     label: "OpenAI",          logo: "openai",     color: "border-border", docsUrl: "https://platform.openai.com/api-keys",        keyHint: "sk-...",       baseUrl: "https://api.openai.com/v1",       supportsWhisper: true,  models: ["gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-4","gpt-3.5-turbo","o1","o1-mini","o3-mini"] },
  { id: "anthropic",  label: "Anthropic",        logo: "anthropic",  color: "border-border", docsUrl: "https://console.anthropic.com/settings/keys",  keyHint: "sk-ant-...",   baseUrl: "https://api.anthropic.com/v1",    supportsWhisper: false, models: ["claude-opus-4-5","claude-sonnet-4-5","claude-3-5-sonnet-20241022","claude-3-5-haiku-20241022","claude-3-opus-20240229"] },
  { id: "groq",       label: "Groq",             logo: "groq",       color: "border-border", docsUrl: "https://console.groq.com/keys",                keyHint: "gsk_...",      baseUrl: "https://api.groq.com/openai/v1",  supportsWhisper: true,  models: ["llama-3.3-70b-versatile","llama-3.1-70b-versatile","mixtral-8x7b-32768","gemma2-9b-it"] },
  { id: "deepseek",   label: "DeepSeek",         logo: "deepseek",   color: "border-border", docsUrl: "https://platform.deepseek.com/api_keys",      keyHint: "sk-...",       baseUrl: "https://api.deepseek.com/v1",     supportsWhisper: false, models: ["deepseek-chat","deepseek-coder","deepseek-reasoner"] },
  { id: "mistral",    label: "Mistral AI",       logo: "mistral",    color: "border-border", docsUrl: "https://console.mistral.ai/api-keys/",        keyHint: "...",          baseUrl: "https://api.mistral.ai/v1",       supportsWhisper: false, models: ["mistral-large-latest","mistral-medium-latest","mistral-small-latest","codestral-latest","open-mixtral-8x22b"] },
  { id: "openrouter", label: "OpenRouter",       logo: "openrouter", color: "border-border", docsUrl: "https://openrouter.ai/keys",                  keyHint: "sk-or-...",    baseUrl: "https://openrouter.ai/api/v1",    supportsWhisper: false, models: ["openai/gpt-4o","openai/gpt-4o-mini","anthropic/claude-3.5-sonnet","google/gemini-pro-1.5","meta-llama/llama-3.1-70b-instruct","mistralai/mixtral-8x7b-instruct"] },
  { id: "custom",     label: "Custom Endpoint",  logo: "custom",     color: "border-border", docsUrl: "",                                             keyHint: "your-api-key", baseUrl: "",                                supportsWhisper: false, models: [] },
];

/* ─── State types ────────────────────────────────────────────────────────── */

interface FormState {
  activeProvider: string;
  model:          string;
  baseUrl:        string;
  temperature:    number;
  maxTokens:      number;
  /* per-provider key fields (not sent to server until save) */
  keys: Record<string, string>;
  /* what's saved in DB */
  savedProvider: string;
  savedModel:    string;
  hasApiKey:     boolean;
  apiKeyHint:    string;
}

const DEFAULT_FORM: FormState = {
  activeProvider: "openai",
  model:          "gpt-4o-mini",
  baseUrl:        "",
  temperature:    0.7,
  maxTokens:      4000,
  keys:           {},
  savedProvider:  "",
  savedModel:     "",
  hasApiKey:      false,
  apiKeyHint:     "",
};

/* ─── Component ─────────────────────────────────────────────────────────── */

export function AISettingsClient() {
  const [form,    setForm]    = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  /* load current settings */
  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm((prev) => ({
          ...prev,
          activeProvider: data.provider ?? "openai",
          model:          data.model    ?? "gpt-4o-mini",
          baseUrl:        data.baseUrl  ?? "",
          temperature:    data.temperature ?? 0.7,
          maxTokens:      data.maxTokens   ?? 4000,
          savedProvider:  data.provider ?? "",
          savedModel:     data.model    ?? "",
          hasApiKey:      data.hasApiKey ?? false,
          apiKeyHint:     data.apiKeyHint ?? "",
        }));
      })
      .finally(() => setLoading(false));
  }, []);

  const activeProviderDef = PROVIDERS.find((p) => p.id === form.activeProvider)!;

  const setProvider = (id: string) => {
    const def = PROVIDERS.find((p) => p.id === id)!;
    setForm((prev) => ({
      ...prev,
      activeProvider: id,
      model:   def.models[0] ?? "",
      baseUrl: def.baseUrl,
    }));
  };

  const setKey = (providerId: string, value: string) =>
    setForm((prev) => ({ ...prev, keys: { ...prev.keys, [providerId]: value } }));

  const toggleShow = (id: string) =>
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    const key = form.keys[form.activeProvider]?.trim();

    if (!form.model) { toast.error("Please select a model"); return; }
    if (!key && !form.hasApiKey) {
      toast.error(`Enter an API key for ${activeProviderDef.label}`);
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        provider:    form.activeProvider,
        model:       form.model,
        baseUrl:     form.baseUrl || activeProviderDef.baseUrl,
        temperature: form.temperature,
        maxTokens:   form.maxTokens,
      };
      if (key) payload.apiKey = key;

      const res = await fetch("/api/ai/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json() as { provider?: string; model?: string; hasApiKey?: boolean; error?: string };

      if (res.ok) {
        toast.success(`Saved — ${activeProviderDef.label} / ${form.model}`);
        setForm((prev) => ({
          ...prev,
          savedProvider: data.provider ?? prev.activeProvider,
          savedModel:    data.model    ?? prev.model,
          hasApiKey:     data.hasApiKey ?? true,
          apiKeyHint:    key ? `••••${key.slice(-4)}` : prev.apiKeyHint,
          keys:          { ...prev.keys, [prev.activeProvider]: "" }, // clear input after save
        }));
      } else {
        toast.error(data.error ?? "Failed to save settings");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Provider Configuration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure the AI model gateway used for SOP generation, chat, and analysis.
          </p>
        </div>
      </div>

      {/* Active gateway summary */}
      {form.savedProvider && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">
                  Active: {PROVIDERS.find((p) => p.id === form.savedProvider)?.label ?? form.savedProvider}
                </p>
                <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="w-2.5 h-2.5 mr-1" /> Live
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Model: <span className="font-mono text-foreground">{form.savedModel}</span>
                {form.hasApiKey
                  ? <span className="ml-2 text-green-600 dark:text-green-400">· API key saved ({form.apiKeyHint})</span>
                  : <span className="ml-2 text-destructive">· No API key — add one below</span>}
                {form.savedProvider !== form.activeProvider && (
                  <span className="ml-2 text-amber-600">· Unsaved changes pending</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Provider selector ────────────────────────────── */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Primary Gateway
          </h2>
          <div className="space-y-1.5">
            {PROVIDERS.map((p) => {
              const isActive  = form.activeProvider === p.id;
              const isSaved   = form.savedProvider  === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                    isActive
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.models[0] ?? "Custom"}</p>
                  </div>
                  {isSaved && (
                    <Badge className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                      Active
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Config form ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Provider info card */}
          <Card className="border transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {activeProviderDef.label}
                </CardTitle>
                {activeProviderDef.docsUrl && (
                  <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1 text-muted-foreground">
                    <a href={activeProviderDef.docsUrl} target="_blank" rel="noopener noreferrer">
                      Get API Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                )}
              </div>
              {activeProviderDef.supportsWhisper && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <Zap className="w-2.5 h-2.5 mr-1" /> Supports audio transcription
                  </Badge>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">

              {/* API Key */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Key className="w-3.5 h-3.5" /> API Key
                  {form.savedProvider === activeProviderDef.id && form.hasApiKey && (
                    <span className="text-green-600 dark:text-green-400 font-normal flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Saved ({form.apiKeyHint})
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    type={showKeys[activeProviderDef.id] ? "text" : "password"}
                    value={form.keys[activeProviderDef.id] ?? ""}
                    onChange={(e) => setKey(activeProviderDef.id, e.target.value)}
                    placeholder={
                      form.savedProvider === activeProviderDef.id && form.hasApiKey
                        ? "Enter new key to replace saved key…"
                        : activeProviderDef.keyHint
                    }
                    className="pr-10 font-mono text-sm"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow(activeProviderDef.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showKeys[activeProviderDef.id] ? "Hide key" : "Show key"}
                  >
                    {showKeys[activeProviderDef.id]
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Keys are encrypted at rest and never exposed in responses.
                </p>
              </div>

              {/* Model selector */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Cpu className="w-3.5 h-3.5" /> Model
                </Label>
                {activeProviderDef.models.length > 0 ? (
                  <Select
                    value={form.model}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, model: v }))}
                  >
                    <SelectTrigger className="font-mono text-sm">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProviderDef.models.map((m) => (
                        <SelectItem key={m} value={m} className="font-mono text-sm">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.model}
                    onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g. my-custom-model"
                    className="font-mono text-sm"
                  />
                )}
              </div>

              {/* Custom base URL */}
              {(activeProviderDef.id === "custom" || activeProviderDef.id === "openrouter") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Base URL</Label>
                  <Input
                    value={form.baseUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="https://api.example.com/v1"
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generation tuning */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Generation Parameters</CardTitle>
              <CardDescription className="text-xs">
                Fine-tune how the AI generates SOP content and chat responses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Temperature <span className="text-muted-foreground">(0 – 2)</span></Label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={form.temperature}
                    onChange={(e) => setForm((prev) => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {form.temperature < 0.5 ? "More focused & deterministic" : form.temperature > 1.2 ? "More creative & varied" : "Balanced"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Tokens</Label>
                  <Input
                    type="number"
                    step="500"
                    min="256"
                    max="128000"
                    value={form.maxTokens}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 4000 }))}
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Maximum response length</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning if no key */}
          {!form.hasApiKey && form.savedProvider !== form.activeProvider && !form.keys[form.activeProvider] && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-400">
                No API key configured. AI features (SOP generation, chat, audio transcription) will not work until you add a key.
              </p>
            </div>
          )}

          <Separator />

          {/* Save button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Changes apply immediately to all AI features across the platform.
            </p>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save Configuration</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
