"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Item {
  id?:          string;
  text:         string;
  isRequired:   boolean;
  order:        number;
  priority?:    string | null;
  assignedRole?: string | null;
}

const PRIORITY_OPTIONS = [
  { value: "High",   label: "High",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "Medium", label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "Low",    label: "Low",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
];

export function SOPChecklist({
  sopId,
  items: init,
  onRefresh,
}: {
  sopId:     string;
  items:     Item[];
  onRefresh: () => void;
}) {
  const [items,  setItems]  = useState<Item[]>(
    init.length > 0 ? init : [{ text: "", isRequired: false, order: 1, priority: null, assignedRole: null }],
  );
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof Item>(i: number, key: K, value: Item[K]) => {
    setItems((prev) => {
      const u = [...prev];
      u[i] = { ...u[i], [key]: value };
      return u;
    });
  };

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { text: "", isRequired: false, order: prev.length + 1, priority: null, assignedRole: null },
    ]);

  const removeItem = (i: number) =>
    setItems((prev) =>
      prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })),
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/checklist`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ items }),
      });
      if (res.ok) { toast.success("Checklist saved", { description: "Your checklist has been updated." }); onRefresh(); }
      else toast.error("Failed to save checklist", { description: "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Checklist Items</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" variant="outline" onClick={addItem}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Item
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => {
          const priorityConf = PRIORITY_OPTIONS.find((p) => p.value === item.priority);
          return (
            <Card key={i} className="border-border/60">
              <CardContent className="p-3 space-y-2">
                {/* Row 1: required checkbox + text */}
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                  <Checkbox
                    checked={item.isRequired}
                    onCheckedChange={(v) => update(i, "isRequired", !!v)}
                    title="Mark as required"
                  />
                  <Input
                    value={item.text}
                    onChange={(e) => update(i, "text", e.target.value)}
                    placeholder="Checklist item…"
                    className="flex-1 h-8 text-sm"
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {item.isRequired ? "Required" : "Optional"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeItem(i)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Row 2: priority + assignedRole */}
                <div className="flex items-center gap-2 pl-10">
                  {/* Priority */}
                  <Select
                    value={item.priority ?? "__none__"}
                    onValueChange={(v) => update(i, "priority", v === "__none__" ? null : v)}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-muted-foreground">
                        No priority
                      </SelectItem>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Assigned Role */}
                  <Input
                    value={item.assignedRole ?? ""}
                    onChange={(e) => update(i, "assignedRole", e.target.value || null)}
                    placeholder="Assigned role (e.g. Manager)"
                    className="h-7 text-xs flex-1 max-w-48"
                  />

                  {/* Live badge preview */}
                  {priorityConf && (
                    <Badge className={cn("text-[10px] h-5 px-1.5", priorityConf.color)}>
                      {priorityConf.label}
                    </Badge>
                  )}
                  {item.assignedRole && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                      {item.assignedRole}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving…" : "Save Checklist"}
        </Button>
      </div>
    </div>
  );
}
