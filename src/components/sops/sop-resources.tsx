"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, Sparkles, Loader2, Package } from "lucide-react";

interface Resource { id?: string; name: string; type: string | null; description: string | null; order: number }

const RESOURCE_TYPES = ["Software", "Equipment", "Document", "Access", "Human", "External", "Other"];

const TYPE_COLORS: Record<string, string> = {
  Software:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Equipment: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Document:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Access:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Human:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  External:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Other:     "bg-muted text-muted-foreground",
};

export function SOPResources({
  sopId,
  resources: init,
  sopStatus,
  onRefresh,
}: {
  sopId: string;
  resources: Resource[];
  sopStatus: string;
  onRefresh: () => void;
}) {
  const [items, setItems] = useState<Resource[]>(init.length > 0 ? init : []);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const blocked = sopStatus === "APPROVED" || sopStatus === "PUBLISHED";

  // Group by type for display
  const grouped = RESOURCE_TYPES.reduce<Record<string, Resource[]>>((acc, type) => {
    const matching = items.filter((r) => r.type === type);
    if (matching.length) acc[type] = matching;
    return acc;
  }, {});
  const ungrouped = items.filter((r) => !r.type || !RESOURCE_TYPES.includes(r.type));
  if (ungrouped.length) grouped["Other"] = [...(grouped["Other"] ?? []), ...ungrouped];

  const addItem = () =>
    setItems([...items, { name: "", type: "Software", description: "", order: items.length + 1 }]);

  const removeItem = (i: number) =>
    setItems(items.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, order: idx + 1 })));

  const updateItem = (i: number, field: keyof Resource, value: string) => {
    const u = [...items];
    (u[i] as Record<string, unknown>)[field] = value;
    setItems(u);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/resources`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resources: items }),
      });
      if (res.ok) { toast.success("Resources saved"); onRefresh(); }
      else toast.error("Failed to save");
    } finally { setSaving(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const generated: Resource[] = (data.result?.resources ?? []).map(
        (r: { name: string; type: string; description: string }, i: number) => ({
          name: r.name,
          type: r.type,
          description: r.description,
          order: i + 1,
        })
      );
      setItems(generated);
      toast.success(`Generated ${generated.length} resources — review and save`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Required Resources</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tools, software, equipment, and materials needed to execute this process.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!blocked && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generating}
              className="gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/30"
            >
              {generating
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
                : <><Sparkles className="w-3.5 h-3.5" />AI Generate</>}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={addItem} disabled={blocked}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Resource
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No resources defined yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {blocked
                ? "This SOP is locked and cannot be edited."
                : "Click \"AI Generate\" to detect resources from steps, or add manually."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Grouped view */}
          {Object.keys(grouped).length > 0 && (
            <div className="space-y-3">
              {Object.entries(grouped).map(([type, groupItems]) => (
                <Card key={type}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Badge className={`text-[10px] ${TYPE_COLORS[type] ?? TYPE_COLORS.Other}`}>{type}</Badge>
                      <span className="text-muted-foreground font-normal">{groupItems.length} item{groupItems.length !== 1 ? "s" : ""}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {groupItems.map((item) => {
                      const i = items.indexOf(item);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1 grid grid-cols-[1fr_140px_1fr] gap-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(i, "name", e.target.value)}
                              placeholder="Resource name"
                              className="h-7 text-xs"
                              disabled={blocked}
                            />
                            <Select
                              value={item.type ?? "Other"}
                              onValueChange={(v) => updateItem(i, "type", v)}
                              disabled={blocked}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RESOURCE_TYPES.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={item.description ?? ""}
                              onChange={(e) => updateItem(i, "description", e.target.value)}
                              placeholder="How it's used…"
                              className="h-7 text-xs"
                              disabled={blocked}
                            />
                          </div>
                          {!blocked && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-destructive hover:text-destructive shrink-0"
                              onClick={() => removeItem(i)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Ungrouped flat list if grouped is empty */}
          {Object.keys(grouped).length === 0 && items.length > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(i, "name", e.target.value)}
                      placeholder="Resource name"
                      className="h-7 text-xs"
                      disabled={blocked}
                    />
                    <Select
                      value={item.type ?? "Other"}
                      onValueChange={(v) => updateItem(i, "type", v)}
                      disabled={blocked}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={item.description ?? ""}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      placeholder="Description…"
                      className="h-7 text-xs flex-1"
                      disabled={blocked}
                    />
                    {!blocked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-destructive shrink-0"
                        onClick={() => removeItem(i)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!blocked && items.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : "Save Resources"}
          </Button>
        </div>
      )}
    </div>
  );
}
