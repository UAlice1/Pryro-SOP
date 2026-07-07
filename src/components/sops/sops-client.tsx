"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, FileText, Sparkles, Star, MoreHorizontal,
  Copy, Archive, Trash2, Eye, Filter,
} from "lucide-react";import { STATUS_LABELS, STATUS_COLORS, timeAgo, truncate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface SOP {
  id: string;
  title: string;
  description: string | null;
  status: string;
  isAIGenerated: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  updatedAt: string;
  createdAt: string;
  department?: { id: string; name: string };
  category?: { id: string; name: string; color: string };
  author: { id: string; name: string; image?: string };
  _count: { comments: number; workflowSteps: number; checklistItems: number };
}

export function SOPsClient() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter") ?? "";

  const [sops, setSops] = useState<SOP[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const fetchSops = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("status", status);
    if (filterParam === "archived") params.set("archived", "true");

    const res = await fetch(`/api/sops?${params}`);
    const data = await res.json();
    let items = data.sops ?? [];
    if (filterParam === "favorites") items = items.filter((s: SOP) => s.isFavorite);
    setSops(items);
    setTotal(filterParam === "favorites" ? items.length : (data.total ?? 0));
    setLoading(false);
  }, [debouncedSearch, status, filterParam]);

  useEffect(() => { fetchSops(); }, [fetchSops]);

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/sops/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      toast.success("SOP duplicated");
      fetchSops();
    } else toast.error("Failed to duplicate");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this SOP permanently?")) return;
    const res = await fetch(`/api/sops/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("SOP deleted");
      fetchSops();
    } else toast.error("Failed to delete");
  };

  const handleArchive = async (id: string, isArchived: boolean) => {
    const res = await fetch(`/api/sops/${id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: !isArchived }),
    });
    if (res.ok) {
      toast.success(isArchived ? "SOP restored" : "SOP archived");
      fetchSops();
    } else toast.error("Failed");
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    const res = await fetch(`/api/sops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !current }),
    });
    if (res.ok) fetchSops();
  };

  const title = filterParam === "favorites" ? "Favorites" : filterParam === "archived" ? "Archived" : "All SOPs";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{total} SOP{total !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/sops/new"><Plus className="w-4 h-4 mr-2" /> New SOP</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SOPs..." className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : sops.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
            <FileText className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium">No SOPs found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new SOP.</p>
          <Button asChild size="sm"><Link href="/sops/new"><Plus className="w-4 h-4 mr-1.5" /> New SOP</Link></Button>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {sops.map((sop, i) => (
              <motion.div key={sop.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ delay: i * 0.03 }}>
                <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {sop.isAIGenerated
                      ? <Sparkles className="w-4 h-4 text-purple-500" />
                      : <FileText className="w-4 h-4 text-muted-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link href={`/sops/${sop.id}`} className="font-medium text-sm hover:text-primary truncate">
                        {sop.title}
                      </Link>
                      {sop.isFavorite && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {sop.description ? truncate(sop.description, 80) : "No description"}
                      {sop.department && ` · ${sop.department.name}`}
                      {` · Updated ${timeAgo(sop.updatedAt)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${STATUS_COLORS[sop.status]}`}>
                      {STATUS_LABELS[sop.status]}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/sops/${sop.id}`}><Eye className="w-4 h-4 mr-2" /> View</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleFavorite(sop.id, sop.isFavorite)}>
                          <Star className="w-4 h-4 mr-2" /> {sop.isFavorite ? "Unfavorite" : "Favorite"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(sop.id)}>
                          <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(sop.id, sop.isArchived ?? false)}>
                          <Archive className="w-4 h-4 mr-2" /> {sop.isArchived ? "Restore" : "Archive"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(sop.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
