"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Sparkles, Loader2, Users } from "lucide-react";

interface Responsibility { id?: string; role: string; description: string; order: number }

export function SOPResponsibilities({
  sopId,
  responsibilities: init,
  sopStatus,
  onRefresh,
}: {
  sopId: string;
  responsibilities: Responsibility[];
  sopStatus: string;
  onRefresh: () => void;
}) {
  const [items, setItems] = useState<Responsibility[]>(
    init.length > 0 ? init : []
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const blocked = sopStatus === "APPROVED" || sopStatus === "PUBLISHED";

  const addItem = () =>
    setItems([...items, { role: "", description: "", order: items.length + 1 }]);

  const removeItem = (i: number) =>
    setItems(items.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, order: idx + 1 })));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/responsibilities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsibilities: items }),
      });
      if (res.ok) { toast.success("Responsibilities saved"); onRefresh(); }
      else toast.error("Failed to save");
    } finally { setSaving(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-responsibilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const generated: Responsibility[] = (data.result?.responsibilities ?? []).map(
        (r: { role: string; description: string }, i: number) => ({
          role: r.role,
          description: r.description,
          order: i + 1,
        })
      );
      setItems(generated);
      toast.success(`Generated ${generated.length} responsibilities — review and save`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Roles &amp; Responsibilities</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define who is responsible, accountable, consulted, or informed for this process.
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
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Role
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No responsibilities defined yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {blocked
                ? "This SOP is locked and cannot be edited."
                : "Click \"AI Generate\" to auto-detect roles, or \"Add Role\" to add manually."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Role table view */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                {items.length} role{items.length !== 1 ? "s" : ""} defined
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.role}
                      onChange={(e) => {
                        const u = [...items];
                        u[i].role = e.target.value;
                        setItems(u);
                      }}
                      placeholder="Role title (e.g. Process Owner, Department Manager)"
                      className="h-7 text-sm font-medium"
                      disabled={blocked}
                    />
                    <Textarea
                      value={item.description}
                      onChange={(e) => {
                        const u = [...items];
                        u[i].description = e.target.value;
                        setItems(u);
                      }}
                      placeholder="Specific responsibilities and duties for this role…"
                      rows={2}
                      className="text-xs resize-none"
                      disabled={blocked}
                    />
                  </div>
                  {!blocked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive hover:text-destructive shrink-0 mt-0.5"
                      onClick={() => removeItem(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* RACI legend */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Common roles:</span>
            {["Process Owner", "Reviewer", "Approver", "Executor", "Consultant"].map((r) => (
              <Badge
                key={r}
                variant="outline"
                className="text-[10px] cursor-pointer hover:bg-muted"
                onClick={() => !blocked && setItems([...items, { role: r, description: "", order: items.length + 1 }])}
              >
                + {r}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!blocked && items.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : "Save Responsibilities"}
          </Button>
        </div>
      )}
    </div>
  );
}
