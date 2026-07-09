"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Save, Key, Cpu, User, Eye, EyeOff, CheckCircle,
  Building2, Users, Folder, Plus, Pencil, X, Check,
  ExternalLink, Zap, AlertTriangle, Globe, Bot, Workflow,
  Waves, Shuffle, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Provider icon map ──────────────────────────────────────────────────── */

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  openai:     <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.01 14.142a4.504 4.504 0 0 1-1.67-6.246zm16.597 3.855l-5.843-3.369 2.02-1.168a.076.076 0 0 1 .071 0l4.808 2.777a4.5 4.5 0 0 1-.689 8.117v-5.678a.79.79 0 0 0-.367-.679zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.808-2.773a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>,
  anthropic:  <Bot className="w-5 h-5" />,
  groq:       <Zap className="w-5 h-5" />,
  deepseek:   <Cpu className="w-5 h-5" />,
  mistral:    <Waves className="w-5 h-5" />,
  openrouter: <Shuffle className="w-5 h-5" />,
  custom:     <Settings2 className="w-5 h-5" />,
};

const PROVIDER_ICON_BG: Record<string, string> = {
  openai:     "bg-black text-white dark:bg-white dark:text-black",
  anthropic:  "bg-orange-500 text-white",
  groq:       "bg-yellow-400 text-black",
  deepseek:   "bg-blue-600 text-white",
  mistral:    "bg-cyan-500 text-white",
  openrouter: "bg-purple-600 text-white",
  custom:     "bg-muted text-muted-foreground",
};

/* ─── AI Provider definitions ────────────────────────────────────────────── */

interface ProviderDef {
  id: string; label: string; logo: string; color: string;
  docsUrl: string; keyHint: string; models: string[];
  baseUrl: string; supportsWhisper: boolean;
}

const PROVIDERS: ProviderDef[] = [
  { id: "openai",     label: "OpenAI",          logo: "openai",     color: "border-gray-200 dark:border-gray-700",     docsUrl: "https://platform.openai.com/api-keys",        keyHint: "sk-...",       baseUrl: "https://api.openai.com/v1",       supportsWhisper: true,  models: ["gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-4","gpt-3.5-turbo","o1","o1-mini","o3-mini"] },
  { id: "anthropic",  label: "Anthropic",        logo: "anthropic",  color: "border-orange-200 dark:border-orange-800", docsUrl: "https://console.anthropic.com/settings/keys",  keyHint: "sk-ant-...",   baseUrl: "https://api.anthropic.com/v1",    supportsWhisper: false, models: ["claude-opus-4-5","claude-sonnet-4-5","claude-3-5-sonnet-20241022","claude-3-5-haiku-20241022","claude-3-opus-20240229"] },
  { id: "groq",       label: "Groq",             logo: "groq",       color: "border-yellow-200 dark:border-yellow-800", docsUrl: "https://console.groq.com/keys",                keyHint: "gsk_...",      baseUrl: "https://api.groq.com/openai/v1",  supportsWhisper: true,  models: ["llama-3.3-70b-versatile","llama-3.1-70b-versatile","mixtral-8x7b-32768","gemma2-9b-it"] },
  { id: "deepseek",   label: "DeepSeek",         logo: "deepseek",   color: "border-blue-200 dark:border-blue-800",     docsUrl: "https://platform.deepseek.com/api_keys",      keyHint: "sk-...",       baseUrl: "https://api.deepseek.com/v1",     supportsWhisper: false, models: ["deepseek-chat","deepseek-coder","deepseek-reasoner"] },
  { id: "mistral",    label: "Mistral AI",       logo: "mistral",    color: "border-cyan-200 dark:border-cyan-800",     docsUrl: "https://console.mistral.ai/api-keys/",        keyHint: "...",          baseUrl: "https://api.mistral.ai/v1",       supportsWhisper: false, models: ["mistral-large-latest","mistral-medium-latest","mistral-small-latest","codestral-latest","open-mixtral-8x22b"] },
  { id: "openrouter", label: "OpenRouter",       logo: "openrouter", color: "border-purple-200 dark:border-purple-800", docsUrl: "https://openrouter.ai/keys",                  keyHint: "sk-or-...",    baseUrl: "https://openrouter.ai/api/v1",    supportsWhisper: false, models: ["openai/gpt-4o","openai/gpt-4o-mini","anthropic/claude-3.5-sonnet","google/gemini-pro-1.5","meta-llama/llama-3.1-70b-instruct"] },
  { id: "custom",     label: "Custom Endpoint",  logo: "custom",     color: "border-gray-200 dark:border-gray-700",     docsUrl: "",                                             keyHint: "your-api-key", baseUrl: "",                                supportsWhisper: false, models: [] },
];

/* ─── AI form state ──────────────────────────────────────────────────────── */

interface AIFormState {
  activeProvider: string; model: string; baseUrl: string;
  temperature: number; maxTokens: number;
  keys: Record<string, string>;
  savedProvider: string; savedModel: string;
  hasApiKey: boolean; apiKeyHint: string;
}

const DEFAULT_AI: AIFormState = {
  activeProvider: "openai", model: "gpt-4o-mini", baseUrl: "",
  temperature: 0.7, maxTokens: 4000, keys: {},
  savedProvider: "", savedModel: "", hasApiKey: false, apiKeyHint: "",
};

/* ─── Main SettingsClient ────────────────────────────────────────────────── */

export function SettingsClient({ defaultTab }: { defaultTab?: string }) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? "EMPLOYEE";
  const isAdmin  = userRole === "SUPER_ADMIN" || userRole === "ORG_ADMIN";
  const resolvedTab = defaultTab === "admin" && isAdmin ? "admin" : (defaultTab ?? "ai");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your AI provider and profile.</p>
      </div>

      <Tabs defaultValue={resolvedTab}>
        <TabsList>
          <TabsTrigger value="ai"      className="gap-1.5"><Cpu       className="w-3.5 h-3.5" /> AI Provider</TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5"><User      className="w-3.5 h-3.5" /> Profile</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Organization</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <AIProviderSettings />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="mt-6">
            <AdminSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ─── AI Provider Settings (full inline config) ──────────────────────────── */

function AIProviderSettings() {
  const [form,     setForm]     = useState<AIFormState>(DEFAULT_AI);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/ai/settings").then((r) => r.json()).then((data) => {
      setForm((prev) => ({
        ...prev,
        activeProvider: data.provider  ?? "openai",
        model:          data.model     ?? "gpt-4o-mini",
        baseUrl:        data.baseUrl   ?? "",
        temperature:    data.temperature ?? 0.7,
        maxTokens:      data.maxTokens   ?? 4000,
        savedProvider:  data.provider ?? "",
        savedModel:     data.model    ?? "",
        hasApiKey:      data.hasApiKey ?? false,
        apiKeyHint:     data.apiKeyHint ?? "",
      }));
    }).finally(() => setLoading(false));
  }, []);

  const activeProviderDef = PROVIDERS.find((p) => p.id === form.activeProvider) ?? PROVIDERS[0];

  const setProvider = (id: string) => {
    const def = PROVIDERS.find((p) => p.id === id)!;
    setForm((prev) => ({ ...prev, activeProvider: id, model: def.models[0] ?? "", baseUrl: def.baseUrl }));
  };

  const setKey = (id: string, v: string) =>
    setForm((prev) => ({ ...prev, keys: { ...prev.keys, [id]: v } }));

  const toggleShow = (id: string) =>
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    const key = form.keys[form.activeProvider]?.trim();
    if (!form.model) { toast.error("Select a model"); return; }
    if (!key && !form.hasApiKey) { toast.error(`Enter an API key for ${activeProviderDef.label}`); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        provider: form.activeProvider, model: form.model,
        baseUrl: form.baseUrl || activeProviderDef.baseUrl,
        temperature: form.temperature, maxTokens: form.maxTokens,
      };
      if (key) payload.apiKey = key;
      const res  = await fetch("/api/ai/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json() as { provider?: string; model?: string; hasApiKey?: boolean; error?: string };
      if (res.ok) {
        toast.success(`Saved — ${activeProviderDef.label} / ${form.model}`);
        setForm((prev) => ({
          ...prev,
          savedProvider: data.provider ?? prev.activeProvider,
          savedModel:    data.model    ?? prev.model,
          hasApiKey:     data.hasApiKey ?? true,
          apiKeyHint:    key ? `••••${key.slice(-4)}` : prev.apiKeyHint,
          keys: { ...prev.keys, [prev.activeProvider]: "" },
        }));
      } else {
        toast.error(data.error ?? "Failed to save");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Active gateway banner */}
      {form.savedProvider && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", PROVIDER_ICON_BG[form.savedProvider] ?? "bg-muted text-muted-foreground")}>
              {PROVIDER_ICONS[form.savedProvider] ?? <Cpu className="w-5 h-5" />}
            </div>
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
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: provider list */}
        <div className="lg:col-span-1 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Primary Gateway</p>
          {PROVIDERS.map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                form.activeProvider === p.id ? "border-primary bg-primary/5 ring-1 ring-primary" : `${p.color} hover:bg-muted/50`)}
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", PROVIDER_ICON_BG[p.id] ?? "bg-muted text-muted-foreground")}>
                {PROVIDER_ICONS[p.id] ?? <Cpu className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{p.models[0] ?? "Custom"}</p>
              </div>
              {form.savedProvider === p.id && (
                <Badge className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">Active</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Right: config */}
        <div className="lg:col-span-2 space-y-4">
          <Card className={cn("border-2 transition-colors", activeProviderDef.color)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", PROVIDER_ICON_BG[activeProviderDef.id] ?? "bg-muted text-muted-foreground")}>
                    {PROVIDER_ICONS[activeProviderDef.id] ?? <Cpu className="w-4 h-4" />}
                  </div>
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
                <Badge className="text-[10px] w-fit mt-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <Zap className="w-2.5 h-2.5 mr-1" /> Supports audio transcription
                </Badge>
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
                    placeholder={form.savedProvider === activeProviderDef.id && form.hasApiKey ? "Enter new key to replace saved key…" : activeProviderDef.keyHint}
                    className="pr-10 font-mono text-sm" autoComplete="off"
                  />
                  <button type="button" onClick={() => toggleShow(activeProviderDef.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKeys[activeProviderDef.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Keys are encrypted at rest and never exposed in responses.</p>
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><Cpu className="w-3.5 h-3.5" /> Model</Label>
                {activeProviderDef.models.length > 0 ? (
                  <Select value={form.model} onValueChange={(v) => setForm((prev) => ({ ...prev, model: v }))}>
                    <SelectTrigger className="font-mono text-sm"><SelectValue placeholder="Select a model" /></SelectTrigger>
                    <SelectContent>
                      {activeProviderDef.models.map((m) => (
                        <SelectItem key={m} value={m} className="font-mono text-sm">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.model} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g. my-custom-model" className="font-mono text-sm" />
                )}
              </div>

              {/* Base URL for custom / openrouter */}
              {(activeProviderDef.id === "custom" || activeProviderDef.id === "openrouter") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Base URL</Label>
                  <Input value={form.baseUrl} onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="https://api.example.com/v1" className="font-mono text-sm" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generation parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Generation Parameters</CardTitle>
              <CardDescription className="text-xs">Fine-tune how the AI generates SOP content and chat responses.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Temperature <span className="text-muted-foreground">(0 – 2)</span></Label>
                  <Input type="number" step="0.05" min="0" max="2" value={form.temperature}
                    onChange={(e) => setForm((prev) => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                    className="font-mono text-sm" />
                  <p className="text-[10px] text-muted-foreground">
                    {form.temperature < 0.5 ? "Focused & deterministic" : form.temperature > 1.2 ? "Creative & varied" : "Balanced"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Tokens</Label>
                  <Input type="number" step="500" min="256" max="128000" value={form.maxTokens}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 4000 }))}
                    className="font-mono text-sm" />
                  <p className="text-[10px] text-muted-foreground">Maximum response length</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No key warning */}
          {!form.hasApiKey && !form.keys[form.activeProvider] && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-400">
                No API key configured. AI features (SOP generation, chat, audio transcription) will not work until you add a key.
              </p>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Changes apply immediately to all AI features.</p>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Configuration</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Profile Settings ───────────────────────────────────────────────────── */

function ProfileSettings() {
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((data) => {
      setName(data.name ?? ""); setEmail(data.email ?? ""); setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (res.ok) toast.success("Profile updated"); else toast.error("Failed to update profile");
    } finally { setSaving(false); }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>Update your display name.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} disabled className="bg-muted/50" />
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        </div>
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" disabled={!loaded} />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !loaded}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Admin types ────────────────────────────────────────────────────────── */

interface Department { id: string; name: string; description: string | null; _count: { users: number; sops: number } }
interface Category   { id: string; name: string; color: string | null; _count: { sops: number } }
interface OrgUser    { id: string; name: string | null; email: string; role: string; departmentId: string | null; image: string | null }
interface OrgData    { id: string; name: string; description: string | null; departments: Department[]; categories: Category[]; users: OrgUser[]; _count: { users: number; sops: number } }

const ROLE_LABELS: Record<string, string> = { SUPER_ADMIN: "Super Admin", ORG_ADMIN: "Admin", MANAGER: "Manager", EMPLOYEE: "Employee" };
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ORG_ADMIN:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MANAGER:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  EMPLOYEE:    "bg-muted text-muted-foreground",
};
const PRESET_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16"];

/* ─── AdminSettings ──────────────────────────────────────────────────────── */

function AdminSettings() {
  const [org,       setOrg]       = useState<OrgData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "users">("departments");

  const fetchOrg = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/org");
      if (!res.ok) { setOrg(null); return; }
      setOrg(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrg(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!org) return (
    <Card>
      <CardContent className="py-12 text-center">
        <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No organization found.</p>
        <p className="text-xs text-muted-foreground mt-1">Contact your administrator to set up an organization.</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">{org.name}</p>
            {org.description && <p className="text-xs text-muted-foreground mt-0.5">{org.description}</p>}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {[["Members", org._count.users], ["SOPs", org._count.sops], ["Depts", org.departments.length]].map(([label, val]) => (
              <div key={String(label)} className="text-center">
                <p className="text-xl font-bold">{val}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["departments", "categories", "users"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === t ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            {t === "users" ? <Users className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "departments" && <DepartmentManager departments={org.departments} onRefresh={fetchOrg} />}
      {activeTab === "categories"  && <CategoryManager  categories={org.categories}   onRefresh={fetchOrg} />}
      {activeTab === "users"       && <UserManager       users={org.users} departments={org.departments} onRefresh={fetchOrg} />}
    </div>
  );
}

/* ─── DepartmentManager ──────────────────────────────────────────────────── */

function DepartmentManager({ departments, onRefresh }: { departments: Department[]; onRefresh: () => void }) {
  const [name,     setName]     = useState("");
  const [desc,     setDesc]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined }),
      });
      if (res.ok) { toast.success("Department created"); setName(""); setDesc(""); onRefresh(); }
      else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Folder className="w-4 h-4" /> Departments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" className="h-8 text-sm flex-1" />
          <Button size="sm" className="h-8 shrink-0" onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <div className="space-y-1.5">
          {departments.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No departments yet.</p>}
          {departments.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg border border-border">
              {editId === d.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs flex-1" autoFocus
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        await fetch(`/api/departments/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName }) });
                        setEditId(null); onRefresh(); toast.success("Saved");
                      }
                      if (e.key === "Escape") setEditId(null);
                    }} />
                  <button onClick={() => setEditId(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground">{d._count.users} member{d._count.users !== 1 ? "s" : ""} · {d._count.sops} SOP{d._count.sops !== 1 ? "s" : ""}</p>
                  </div>
                  <button onClick={() => { setEditId(d.id); setEditName(d.name); }} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── CategoryManager ────────────────────────────────────────────────────── */

function CategoryManager({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [name,   setName]   = useState("");
  const [color,  setColor]  = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (res.ok) { toast.success("Category created"); setName(""); onRefresh(); }
      else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Folder className="w-4 h-4" /> Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            <Button size="sm" className="h-8 shrink-0" onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Color:</span>
            {PRESET_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-1 ring-primary scale-125" : "hover:scale-110"}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {categories.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No categories yet.</p>}
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg border border-border">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color ?? "#94a3b8" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c._count.sops} SOP{c._count.sops !== 1 ? "s" : ""}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── UserManager ────────────────────────────────────────────────────────── */

function UserManager({ users, departments, onRefresh }: { users: OrgUser[]; departments: Department[]; onRefresh: () => void }) {
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editRole,   setEditRole]   = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");

  const filtered = users.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (u: OrgUser) => { setEditId(u.id); setEditRole(u.role); setEditDeptId(u.departmentId ?? ""); };

  const saveEdit = async (userId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newRole: editRole, departmentId: editDeptId || null }),
      });
      if (res.ok) { toast.success("User updated"); setEditId(null); onRefresh(); }
      else { const d = await res.json() as { error?: string }; toast.error(d.error ?? "Failed"); }
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Team Members ({users.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="h-8 text-sm" />
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 rounded-lg border border-border">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                {u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}
              </div>
              {editId === u.id ? (
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{u.name ?? u.email}</p>
                    <p className="text-[10px] text-muted-foreground">{u.email}</p>
                  </div>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={editDeptId} onValueChange={setEditDeptId}>
                    <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Dept" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">No Department</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 px-2" onClick={() => saveEdit(u.id)} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </Button>
                  <button onClick={() => setEditId(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.name ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={`text-[10px] px-1.5 py-0 ${ROLE_COLORS[u.role] ?? ROLE_COLORS.EMPLOYEE}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                    {u.departmentId && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {departments.find((d) => d.id === u.departmentId)?.name ?? "Dept"}
                      </Badge>
                    )}
                  </div>
                  <button onClick={() => startEdit(u)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No users found.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
