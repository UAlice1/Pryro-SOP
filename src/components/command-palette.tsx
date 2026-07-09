"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Settings, Search, LayoutDashboard } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SOPResult {
  id: string;
  title: string;
  status: string;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SOPResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!debouncedQuery) { setResults([]); return; }
    setLoading(true);
    fetch(`/api/sops?search=${encodeURIComponent(debouncedQuery)}&limit=5`)
      .then((r) => r.json())
      .then((d) => setResults(d.sops ?? []))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const navigate = (href: string) => {
    router.push(href);
    onOpenChange(false);
    setQuery("");
  };

  const staticItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "New SOP", icon: Plus, href: "/dashboard" },
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-lg" aria-describedby={undefined}>
        <div className="flex items-center border-b border-border px-4">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SOPs or navigate..."
            className="border-0 shadow-none focus-visible:ring-0 h-12"
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <p className="text-xs text-muted-foreground text-center py-4">Searching...</p>
          )}
          {!loading && results.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">SOPs</p>
              {results.map((sop) => (
                <button
                  key={sop.id}
                  onClick={() => navigate(`/sops/${sop.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left text-sm"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{sop.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{sop.status}</span>
                </button>
              ))}
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">Navigation</p>
            {staticItems.map((item) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left text-sm"
              >
                <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
