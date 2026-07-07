"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Key, Cpu, User, Eye, EyeOff, CheckCircle } from "lucide-react";
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

export function SettingsClient() {
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

      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai" className="gap-1.5"><Cpu className="w-3.5 h-3.5" /> AI Provider</TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" /> Profile</TabsTrigger>
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
