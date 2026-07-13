"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, Tag } from "lucide-react";

interface OrgTag {
  id: string;
  name: string;
}

export function SOPTags({ sopId }: { sopId: string }) {
  const [tags, setTags]         = useState<string[]>([]);
  const [orgTags, setOrgTags]   = useState<OrgTag[]>([]);
  const [input, setInput]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load current SOP tags
  useEffect(() => {
    fetch(`/api/sops/${sopId}/tags`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setTags(data));
  }, [sopId]);

  // Load org-level tags for autocomplete
  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setOrgTags(data))
      .catch(() => {}); // silently ignore if no org
  }, []);

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const addTag = (value?: string) => {
    const t = (value ?? input).trim().toLowerCase();
    if (!t || tags.includes(t)) { setInput(""); setShowSuggestions(false); return; }
    setTags([...tags, t]);
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !input && tags.length) {
      setTags(tags.slice(0, -1));
    }
    if (e.key === "Escape") setShowSuggestions(false);
  };

  const suggestions = orgTags.filter(
    (t) => t.name.includes(input.trim().toLowerCase()) && !tags.includes(t.name)
  );

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
    <div className="space-y-2" ref={containerRef}>
      <div className="relative">
        <div className="flex items-center gap-1.5 flex-wrap min-h-9 px-3 py-2 border border-input rounded-lg bg-background focus-within:ring-1 focus-within:ring-ring">
          <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {tags.map((tag) => (
            <Badge
              key={tag}
              className="h-5 text-xs px-2 gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onKeyDown={handleKey}
            onFocus={() => setShowSuggestions(true)}
            placeholder={tags.length === 0 ? "Add tags (press Enter or comma)..." : ""}
            className="flex-1 min-w-24 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>

        {/* Autocomplete suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-md overflow-hidden">
            {suggestions.slice(0, 8).map((t) => (
              <button
                key={t.id}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                onMouseDown={(e) => { e.preventDefault(); addTag(t.name); }}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press Enter or comma to add. Backspace to remove last.
        </p>
        <Button size="sm" variant="outline" onClick={saveTags} disabled={saving} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Save Tags
        </Button>
      </div>
    </div>
  );
}
