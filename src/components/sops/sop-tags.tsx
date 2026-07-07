"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Tag } from "lucide-react";

export function SOPTags({ sopId }: { sopId: string }) {
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/sops/${sopId}/tags`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setTags(data));
  }, [sopId]);

  const addTag = () => {
    const t = input.trim().toLowerCase();
    if (!t || tags.includes(t)) { setInput(""); return; }
    setTags([...tags, t]);
    setInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !input && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  const saveTags = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (res.ok) toast.success("Tags saved");
      else toast.error("Failed to save tags");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap min-h-9 px-3 py-2 border border-input rounded-lg bg-background focus-within:ring-1 focus-within:ring-ring">
        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {tags.map((tag) => (
          <Badge key={tag} className="h-5 text-xs px-2 gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-destructive">
              <X className="w-2.5 h-2.5" />
            </button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={tags.length === 0 ? "Add tags (press Enter or comma)..." : ""}
          className="flex-1 min-w-24 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Press Enter or comma to add. Backspace to remove last.</p>
        <Button size="sm" variant="outline" onClick={saveTags} disabled={saving} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Save Tags
        </Button>
      </div>
    </div>
  );
}
