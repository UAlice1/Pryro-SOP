"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Pencil, Eye } from "lucide-react";
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

/* Sections that benefit from a markdown preview (long-form prose) */
const MARKDOWN_SECTIONS = new Set(["procedures", "documentation", "notes", "safety", "quality", "review"]);

function SectionEditor({
  section,
  onChange,
}: {
  section:  Section;
  onChange: (content: string) => void;
}) {
  const useMarkdown = MARKDOWN_SECTIONS.has(section.type);

  if (!useMarkdown) {
    return (
      <Textarea
        value={section.content}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={`Write the ${section.title.toLowerCase()} section here…`}
      />
    );
  }

  return (
    <Tabs defaultValue="write" className="w-full">
      <TabsList className="h-7 mb-2">
        <TabsTrigger value="write" className="h-6 text-xs gap-1.5">
          <Pencil className="w-3 h-3" /> Write
        </TabsTrigger>
        <TabsTrigger value="preview" className="h-6 text-xs gap-1.5">
          <Eye className="w-3 h-3" /> Preview
        </TabsTrigger>
      </TabsList>

      <TabsContent value="write" className="mt-0">
        <Textarea
          value={section.content}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder={`Write ${section.title.toLowerCase()} in Markdown…`}
          className="font-mono text-sm"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Supports Markdown: **bold**, *italic*, ## headings, - lists, `code`
        </p>
      </TabsContent>

      <TabsContent value="preview" className="mt-0">
        {section.content.trim() ? (
          <article className="prose prose-sm dark:prose-invert max-w-none min-h-[150px] px-3 py-2 rounded-lg border border-border bg-muted/20">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.content}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="min-h-[150px] flex items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground text-xs">
            Nothing to preview yet — write some content in the Write tab.
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export function SOPEditor({ sop, onUpdate, onSaveSections }: SOPEditorProps) {
  const [title,       setTitle]       = useState(sop.title);
  const [description, setDescription] = useState(sop.description ?? "");
  const [status,      setStatus]      = useState(sop.status);

  const [sections, setSections] = useState<Section[]>(
    sop.sections.length > 0
      ? sop.sections
      : [
          { type: "purpose",    title: "Purpose",             content: sop.purpose ?? "", order: 1 },
          { type: "scope",      title: "Scope",               content: sop.scope   ?? "", order: 2 },
          { type: "procedures", title: "Procedures",          content: "",               order: 3 },
          { type: "safety",     title: "Safety & Compliance", content: "",               order: 4 },
          { type: "notes",      title: "Notes",               content: "",               order: 5 },
        ],
  );

  const handleSave = async () => {
    await onUpdate({ title, description, status });
    await onSaveSections(sections);
  };

  return (
    <div className="space-y-4">
      {/* Basic info */}
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
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief overview of this process…"
            />
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

      {/* Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <SOPTags sopId={sop.id} />
        </CardContent>
      </Card>

      {/* Sections — plain textarea for short fields, Write/Preview for prose */}
      {sections.map((section, i) => (
        <Card key={section.type + i}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {section.title}
              {MARKDOWN_SECTIONS.has(section.type) && (
                <span className="text-[10px] text-muted-foreground font-normal border border-border rounded px-1.5 py-0.5">
                  Markdown
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SectionEditor
              section={section}
              onChange={(content) => {
                setSections((prev) => {
                  const updated = [...prev];
                  updated[i] = { ...updated[i], content };
                  return updated;
                });
              }}
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
