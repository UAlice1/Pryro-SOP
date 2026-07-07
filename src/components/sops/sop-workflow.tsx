"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Step { id?: string; stepNumber: number; title: string; description: string | null; role: string | null; duration: string | null }

export function SOPWorkflow({ sopId, steps: initialSteps, onRefresh }: { sopId: string; steps: Step[]; onRefresh: () => void }) {
  const [steps, setSteps] = useState<Step[]>(initialSteps.length > 0 ? initialSteps : [{ stepNumber: 1, title: "", description: "", role: "", duration: "" }]);
  const [saving, setSaving] = useState(false);

  const addStep = () => setSteps([...steps, { stepNumber: steps.length + 1, title: "", description: "", role: "", duration: "" }]);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stepNumber: idx + 1 })));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/workflow`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      if (res.ok) { toast.success("Workflow saved"); onRefresh(); }
      else toast.error("Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Workflow Steps</h3>
        <Button size="sm" variant="outline" onClick={addStep}><Plus className="w-4 h-4 mr-1.5" /> Add Step</Button>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-1">{step.stepNumber}</div>
                <div className="flex-1 space-y-2">
                  <Input value={step.title} onChange={(e) => { const u = [...steps]; u[i].title = e.target.value; setSteps(u); }} placeholder="Step title" />
                  <Textarea value={step.description ?? ""} onChange={(e) => { const u = [...steps]; u[i].description = e.target.value; setSteps(u); }} placeholder="Step description" rows={2} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={step.role ?? ""} onChange={(e) => { const u = [...steps]; u[i].role = e.target.value; setSteps(u); }} placeholder="Responsible role" />
                    <Input value={step.duration ?? ""} onChange={(e) => { const u = [...steps]; u[i].duration = e.target.value; setSteps(u); }} placeholder="Duration (e.g. 30 min)" />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => removeStep(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" /> Save Workflow</Button>
      </div>
    </div>
  );
}
