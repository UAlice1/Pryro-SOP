"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { SOPTags } from "@/components/sops/sop-tags";
import { STATUS_LABELS } from "@/lib/utils";

interface Section { id?: string; type: string; title: string; content: string; order: number }

interface SOPEditorProps {
  sop: {
    id: string;
    title: string;
    description: string | null;
    purpose: string | null;
    scope: string | null;
    status: string;
    sections: Section[];
  };
  onUpdate: (updates: Record<string, unknown>) => Promise<void>;
  onSaveSections: (sections: Section[]) => Promise<void>;
}

export function SOPEditor({ sop, onUpdate, onSaveSections }: SOPEditorProps) {
  const [title, setTitle] = useState(sop.title);
  const [description, setDescription] = useState(sop.description ?? "");
  const [purpose, setPurpose] = useState(sop.purpose ?? "");
  const [scope, setScope] = useState(sop.scope ?? "");
  const [status, setStatus] = useState(sop.status);

  const [sections, setSections] = useState<Section[]>(
    sop.sections.length > 0
      ? sop.sections
      : [
          { type: "purpose", title: "Purpose", content: purpose, order: 1 },
          { type: "scope", title: "Scope", content: scope, order: 2 },
          { type: "procedures", title: "Procedures", content: "", order: 3 },
          { type: "safety", title: "Safety & Compliance", content: "", order: 4 },
          { type: "notes", title: "Notes", content: "", order: 5 },
        ]
  );

  const handleSave = async () => {
    await onUpdate({ title, description, purpose, scope, status });
    await onSaveSections(sections);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief overview..." />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <SOPTags sopId={sop.id} />
        </CardContent>
      </Card>

      {sections.map((section, i) => (
        <Card key={section.type + i}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={section.content}
              onChange={(e) => {
                const updated = [...sections];
                updated[i] = { ...updated[i], content: e.target.value };
                setSections(updated);
              }}
              rows={4}
              placeholder={`Write the ${section.title.toLowerCase()} section here...`}
            />
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
