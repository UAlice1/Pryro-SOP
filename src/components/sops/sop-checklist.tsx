"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Item { id?: string; text: string; isRequired: boolean; order: number }

export function SOPChecklist({ sopId, items: init, onRefresh }: { sopId: string; items: Item[]; onRefresh: () => void }) {
  const [items, setItems] = useState<Item[]>(init.length > 0 ? init : [{ text: "", isRequired: false, order: 1 }]);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { text: "", isRequired: false, order: items.length + 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/checklist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.ok) { toast.success("Checklist saved"); onRefresh(); }
      else toast.error("Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Checklist Items</h3>
        <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-4 h-4 mr-1.5" /> Add Item</Button>
      </div>
      <Card>
        <CardContent className="p-4 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <Checkbox
                checked={item.isRequired}
                onCheckedChange={(v) => { const u = [...items]; u[i].isRequired = !!v; setItems(u); }}
              />
              <Input
                value={item.text}
                onChange={(e) => { const u = [...items]; u[i].text = e.target.value; setItems(u); }}
                placeholder="Checklist item..."
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.isRequired ? "Required" : "Optional"}</span>
              <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive shrink-0" onClick={() => removeItem(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save Checklist</Button>
      </div>
    </div>
  );
}
