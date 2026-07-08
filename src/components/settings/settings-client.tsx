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
import {
  Loader2, Save, Key, Cpu, User, Eye, EyeOff, CheckCircle,
  Building2, Users, Folder, Plus, Trash2, Pencil, X, Check,
} from "lucide-react";
import { AI_PROVIDERS } from "@/lib/utils";

interface AIFormState {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  hasApiKey: boolean;
  apiKeyHint: string;
}

export function SettingsClient({ defaultTab }: { defaultTab?: string }) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? "EMPLOYEE";
  const isAdmin  = userRole === "SUPER_ADMIN" || userRole === "ORG_ADMIN";

  const resolvedTab = defaultTab === "admin" && isAdmin ? "admin" : (defaultTab ?? "ai");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState<AIFormState>({
    provider: "openai",
    model: "gpt-4o-mini",
    apiKey: "",
    baseUrl: "",
    temperature: 0.7,
    maxTokens: 4000,
    hasApiKey: false,
    apiKeyHint: "",
  });

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          provider: data.provider ?? "openai",
          model: data.model ?? "gpt-4o-mini",
          apiKey: "",
          baseUrl: data.baseUrl ?? "",
          temperature: data.temperature ?? 0.7,
          maxTokens: data.maxTokens ?? 4000,
          hasApiKey: data.hasApiKey ?? false,
          apiKeyHint: data.apiKeyHint ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  // When provider changes, auto-select the first model
  const handleProviderChange = (provider: string) => {
    const prov = AI_PROVIDERS.find((p) => p.value === provider);
    const firstModel = prov?.models[0] ?? "";
    setForm((prev) => ({ ...prev, provider, model: firstModel, baseUrl: "" }));
  };

  const handleSave = async () => {
    if (!form.model) {
      toast.error("Please select a model");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        provider: form.provider,
        model: form.model,
        baseUrl: form.baseUrl,
        temperature: form.temperature,
        maxTokens: form.maxTokens,
      };

      // Only send API key if user typed a new one
      if (form.apiKey.trim()) {
        payload.apiKey = form.apiKey.trim();
      }

      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`AI settings saved — ${data.provider} / ${data.model}`);
        setForm((prev) => ({
          ...prev,
          apiKey: "",
          hasApiKey: data.hasApiKey,
          apiKeyHint: form.apiKey ? `••••••••${form.apiKey.slice(-4)}` : prev.apiKeyHint,
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

  const currentProvider = AI_PROVIDERS.find((p) => p.value === form.provider);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your AI configuration and profile.</p>
      </div>

      <Tabs defaultValue={resolvedTab}>
        <TabsList>
          <TabsTrigger value="ai"      className="gap-1.5"><Cpu  className="w-3.5 h-3.5" /> AI Provider</TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" /> Profile</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Organization</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ai" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="w-4 h-4" /> AI Provider Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your AI provider. API keys are stored securely and never exposed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Provider selection cards */}
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AI_PROVIDERS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => handleProviderChange(p.value)}
                          className={`text-left p-3 rounded-xl border transition-all text-sm ${
                            form.provider === p.value
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          <p className="font-medium">{p.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {p.models[0] ?? "Custom endpoint"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model */}
                  <div className="space-y-2">
                    <Label>Model <span className="text-destructive">*</span></Label>
                    {currentProvider && currentProvider.models.length > 0 ? (
                      <Select
                        value={form.model}
                        onValueChange={(v) => setForm((prev) => ({ ...prev, model: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentProvider.models.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={form.model}
                        onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                        placeholder="e.g. gpt-4o-mini"
                      />
                    )}
                    {!form.model && (
                      <p className="text-xs text-destructive">A model is required for AI generation</p>
                    )}
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label>
                      API Key <span className="text-destructive">*</span>
                      {form.hasApiKey && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-normal">
                          <CheckCircle className="w-3 h-3" /> Key saved ({form.apiKeyHint})
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showKey ? "text" : "password"}
                        value={form.apiKey}
                        onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                        placeholder={form.hasApiKey ? "Enter a new key to replace the saved one" : "sk-... or your provider key"}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {form.provider === "groq" && "Get your free Groq key at console.groq.com"}
                      {form.provider === "openai" && "Get your OpenAI key at platform.openai.com"}
                      {form.provider === "anthropic" && "Get your Anthropic key at console.anthropic.com"}
                      {form.provider === "openrouter" && "Get your OpenRouter key at openrouter.ai/keys"}
                      {form.provider === "deepseek" && "Get your DeepSeek key at platform.deepseek.com"}
                      {form.provider === "mistral" && "Get your Mistral key at console.mistral.ai"}
                      {form.provider === "custom" && "Enter the API key for your custom endpoint"}
                    </p>
                  </div>

                  {/* Base URL for custom providers */}
                  {(form.provider === "custom" || form.provider === "openrouter") && (
                    <div className="space-y-2">
                      <Label>Base URL</Label>
                      <Input
                        value={form.baseUrl}
                        onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                        placeholder="https://api.example.com/v1"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Advanced settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Generation Settings</CardTitle>
                  <CardDescription>Fine-tune how the AI generates content.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temperature <span className="text-xs text-muted-foreground">(0–2)</span></Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={form.temperature}
                      onChange={(e) => setForm((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    />
                    <p className="text-xs text-muted-foreground">Lower = focused, higher = creative</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      step="100"
                      min="100"
                      max="32000"
                      value={form.maxTokens}
                      onChange={(e) => setForm((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    />
                    <p className="text-xs text-muted-foreground">Max response length</p>
                  </div>
                </CardContent>
              </Card>

              {/* Current config summary */}
              <Card className="bg-muted/40">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Current: <span className="text-primary">{currentProvider?.label ?? form.provider}</span>
                      {" / "}
                      <span className="text-primary">{form.model || "No model selected"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {form.hasApiKey ? "API key configured ✓" : "⚠ No API key — add one to enable AI generation"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || !form.model}>
                  {saving
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    : <><Save className="w-4 h-4 mr-2" /> Save Settings</>
                  }
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <ProfileSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="mt-4">
            <AdminSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ProfileSettings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        setLoaded(true);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) toast.success("Profile updated");
      else toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
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
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={!loaded}
          />
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface Department { id: string; name: string; description: string | null; _count: { users: number; sops: number } }
interface Category   { id: string; name: string; color: string | null; _count: { sops: number } }
interface OrgUser    { id: string; name: string | null; email: string; role: string; departmentId: string | null; image: string | null }

interface OrgData {
  id: string;
  name: string;
  description: string | null;
  departments: Department[];
  categories: Category[];
  users: OrgUser[];
  _count: { users: number; sops: number };
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN:   "Admin",
  MANAGER:     "Manager",
  EMPLOYEE:    "Employee",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ORG_ADMIN:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MANAGER:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  EMPLOYEE:    "bg-muted text-muted-foreground",
};

// ── AdminSettings component ───────────────────────────────────────────────────
function AdminSettings() {
  const [org,       setOrg]       = useState<OrgData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "users">("departments");

  const fetchOrg = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/org");
      if (!res.ok) { setOrg(null); return; }
      setOrg(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrg(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No organization found.</p>
          <p className="text-xs text-muted-foreground mt-1">Contact your administrator to set up an organization.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Org overview */}
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
            <div className="text-center">
              <p className="text-xl font-bold">{org._count.users}</p>
              <p className="text-[10px] text-muted-foreground">Members</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{org._count.sops}</p>
              <p className="text-[10px] text-muted-foreground">SOPs</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{org.departments.length}</p>
              <p className="text-[10px] text-muted-foreground">Depts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["departments", "categories", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === t
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            {t === "departments" && <Folder  className="w-3.5 h-3.5" />}
            {t === "categories"  && <Folder  className="w-3.5 h-3.5" />}
            {t === "users"       && <Users   className="w-3.5 h-3.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "departments" && (
        <DepartmentManager
          departments={org.departments}
          onRefresh={fetchOrg}
        />
      )}
      {activeTab === "categories" && (
        <CategoryManager
          categories={org.categories}
          onRefresh={fetchOrg}
        />
      )}
      {activeTab === "users" && (
        <UserManager
          users={org.users}
          departments={org.departments}
          onRefresh={fetchOrg}
        />
      )}
    </div>
  );
}

// ── Department Manager ────────────────────────────────────────────────────────
function DepartmentManager({ departments, onRefresh }: { departments: Department[]; onRefresh: () => void }) {
  const [name,    setName]    = useState("");
  const [desc,    setDesc]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [editName,setEditName]= useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || undefined }),
      });
      if (res.ok) { toast.success("Department created"); setName(""); setDesc(""); onRefresh(); }
      else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Folder className="w-4 h-4" /> Departments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create form */}
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" className="h-8 text-sm flex-1" />
          <Button size="sm" className="h-8 shrink-0" onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* List */}
        <div className="space-y-1.5">
          {departments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No departments yet. Create one above.</p>
          )}
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
                    }}
                  />
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

// ── Category Manager ──────────────────────────────────────────────────────────
const PRESET_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16"];

function CategoryManager({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [name,   setName]   = useState("");
  const [color,  setColor]  = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (res.ok) { toast.success("Category created"); setName(""); onRefresh(); }
      else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Folder className="w-4 h-4" /> Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create form */}
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
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-1 ring-primary scale-125" : "hover:scale-110"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-1.5">
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No categories yet. Create one above.</p>
          )}
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

// ── User Manager ──────────────────────────────────────────────────────────────
function UserManager({ users, departments, onRefresh }: { users: OrgUser[]; departments: Department[]; onRefresh: () => void }) {
  const [editId,      setEditId]      = useState<string | null>(null);
  const [editRole,    setEditRole]    = useState("");
  const [editDeptId,  setEditDeptId]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState("");

  const filtered = users.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (u: OrgUser) => {
    setEditId(u.id);
    setEditRole(u.role);
    setEditDeptId(u.departmentId ?? "");
  };

  const saveEdit = async (userId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newRole: editRole, departmentId: editDeptId || null }),
      });
      if (res.ok) { toast.success("User updated"); setEditId(null); onRefresh(); }
      else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
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
                /* Edit mode */
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{u.name ?? u.email}</p>
                    <p className="text-[10px] text-muted-foreground">{u.email}</p>
                  </div>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={editDeptId} onValueChange={setEditDeptId}>
                    <SelectTrigger className="h-7 w-36 text-xs">
                      <SelectValue placeholder="Dept" />
                    </SelectTrigger>
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
                /* View mode */
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
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No users found.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
