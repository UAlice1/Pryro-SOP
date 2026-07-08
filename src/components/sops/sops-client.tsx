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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, FileText, Sparkles, Star, MoreHorizontal,
  Copy, Archive, Trash2, Eye, Filter, X, Tag, ChevronDown,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, timeAgo, truncate } from "@/lib/utils";
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
  tags?: { tag: string }[];
  _count: { comments: number; workflowSteps: number; checklistItems: number };
}

interface FilterOption { id: string; name: string; color?: string }

const EMPTY_FILTERS = { status: "", departmentId: "", categoryId: "", tag: "" };

export function SOPsClient() {
  const searchParams = useSearchParams();
  const filterParam  = searchParams.get("filter") ?? "";

  const [sops,        setSops]        = useState<SOP[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filters,     setFilters]     = useState(EMPTY_FILTERS);
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [categories,  setCategories]  = useState<FilterOption[]>([]);
  const [allTags,     setAllTags]     = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  // Load filter options once
  useEffect(() => {
    Promise.all([
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([depts, cats]) => {
      setDepartments(Array.isArray(depts) ? depts : []);
      setCategories(Array.isArray(cats) ? cats : []);
    }).catch(() => {/* no org set up — silently ignore */});
  }, []);

  const fetchSops = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch)       params.set("search",       debouncedSearch);
    if (filters.status)        params.set("status",        filters.status);
    if (filters.departmentId)  params.set("departmentId",  filters.departmentId);
    if (filters.categoryId)    params.set("categoryId",    filters.categoryId);
    if (filters.tag)           params.set("tag",           filters.tag);
    if (filterParam === "archived") params.set("archived", "true");

    const res  = await fetch(`/api/sops?${params}`);
    const data = await res.json();
    let items: SOP[] = data.sops ?? [];

    // Client-side favorites filter
    if (filterParam === "favorites") items = items.filter((s) => s.isFavorite);

    setSops(items);
    setTotal(filterParam === "favorites" ? items.length : (data.total ?? 0));

    // Collect tags for the tag filter pill list
    const tags = new Set<string>();
    items.forEach((s) => s.tags?.forEach((t) => tags.add(t.tag)));
    setAllTags((prev) => {
      const merged = new Set([...prev, ...tags]);
      return Array.from(merged).sort();
    });

    setLoading(false);
  }, [debouncedSearch, filters, filterParam]);

  useEffect(() => { fetchSops(); }, [fetchSops]);

  const handleDuplicate      = async (id: string) => { const r = await fetch(`/api/sops/${id}/duplicate`, { method: "POST" }); if (r.ok) { toast.success("Duplicated"); fetchSops(); } else toast.error("Failed"); };
  const handleDelete         = async (id: string) => { if (!confirm("Delete permanently?")) return; const r = await fetch(`/api/sops/${id}`, { method: "DELETE" }); if (r.ok) { toast.success("Deleted"); fetchSops(); } else toast.error("Failed"); };
  const handleArchive        = async (id: string, isArchived: boolean) => { const r = await fetch(`/api/sops/${id}/archive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archive: !isArchived }) }); if (r.ok) { toast.success(isArchived ? "Restored" : "Archived"); fetchSops(); } else toast.error("Failed"); };
  const handleToggleFavorite = async (id: string, cur: boolean) => { const r = await fetch(`/api/sops/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isFavorite: !cur }) }); if (r.ok) fetchSops(); };

  const setFilter = (key: keyof typeof EMPTY_FILTERS, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilter = (key: keyof typeof EMPTY_FILTERS) => setFilter(key, "");
  const clearAll    = () => setFilters(EMPTY_FILTERS);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const title = filterParam === "favorites" ? "Favorites"
              : filterParam === "archived"  ? "Archived"
              : "All SOPs";

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{total} SOP{total !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/sops/new"><Plus className="w-4 h-4 mr-2" />New SOP</Link>
        </Button>
      </div>

      {/* Search + filter bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SOPs…" className="pl-9 h-9" />
            {search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Status */}
          <Select value={filters.status} onValueChange={(v) => setFilter("status", v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-36 h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* More filters toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0 ml-0.5">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </Button>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearAll}>
              <X className="w-3 h-3 mr-1" />Clear
            </Button>
          )}
        </div>

        {/* Expanded filter panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 flex-wrap pt-1">

                {/* Department */}
                {departments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Select value={filters.departmentId} onValueChange={(v) => setFilter("departmentId", v === "__all__" ? "" : v)}>
                      <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Departments</SelectItem>
                        {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {filters.departmentId && <button onClick={() => clearFilter("departmentId")}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>}
                  </div>
                )}

                {/* Category */}
                {categories.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Select value={filters.categoryId} onValueChange={(v) => setFilter("categoryId", v === "__all__" ? "" : v)}>
                      <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Categories</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              {c.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />}
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filters.categoryId && <button onClick={() => clearFilter("categoryId")}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>}
                  </div>
                )}

                {/* Tag filter — pill buttons */}
                {allTags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    {allTags.slice(0, 12).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilter("tag", filters.tag === t ? "" : t)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          filters.tag === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active filter pills */}
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="text-xs text-muted-foreground">Active:</span>
                  {filters.status && (
                    <Badge variant="secondary" className="text-xs gap-1 h-5">
                      {STATUS_LABELS[filters.status]}
                      <button onClick={() => clearFilter("status")}><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  )}
                  {filters.departmentId && (
                    <Badge variant="secondary" className="text-xs gap-1 h-5">
                      {departments.find((d) => d.id === filters.departmentId)?.name ?? "Dept"}
                      <button onClick={() => clearFilter("departmentId")}><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  )}
                  {filters.categoryId && (
                    <Badge variant="secondary" className="text-xs gap-1 h-5">
                      {categories.find((c) => c.id === filters.categoryId)?.name ?? "Cat"}
                      <button onClick={() => clearFilter("categoryId")}><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  )}
                  {filters.tag && (
                    <Badge variant="secondary" className="text-xs gap-1 h-5">
                      #{filters.tag}
                      <button onClick={() => clearFilter("tag")}><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SOP list */}
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
          <p className="text-sm text-muted-foreground">
            {activeFilterCount > 0 ? "Try adjusting or clearing your filters." : "Create your first SOP to get started."}
          </p>
          {activeFilterCount > 0
            ? <Button size="sm" variant="outline" onClick={clearAll}><X className="w-4 h-4 mr-1.5" />Clear filters</Button>
            : <Button asChild size="sm"><Link href="/sops/new"><Plus className="w-4 h-4 mr-1.5" />New SOP</Link></Button>}
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
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Link href={`/sops/${sop.id}`} className="font-medium text-sm hover:text-primary truncate">
                        {sop.title}
                      </Link>
                      {sop.isFavorite && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                      {/* Category badge */}
                      {sop.category && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                          style={{
                            background: sop.category.color ? `${sop.category.color}20` : undefined,
                            color: sop.category.color ?? undefined,
                            border: `1px solid ${sop.category.color ?? "#e2e8f0"}40`,
                          }}
                        >
                          {sop.category.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {sop.description ? truncate(sop.description, 80) : "No description"}
                      {sop.department && ` · ${sop.department.name}`}
                      {` · Updated ${timeAgo(sop.updatedAt)}`}
                    </p>
                    {/* Tags */}
                    {sop.tags && sop.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {sop.tags.slice(0, 4).map((t) => (
                          <button
                            key={t.tag}
                            onClick={() => setFilter("tag", t.tag)}
                            className="text-[10px] px-1.5 py-0.5 rounded-full border border-border bg-muted hover:border-primary/50 transition-colors"
                          >
                            #{t.tag}
                          </button>
                        ))}
                        {sop.tags.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">+{sop.tags.length - 4}</span>
                        )}
                      </div>
                    )}
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
                          <Link href={`/sops/${sop.id}`}><Eye className="w-4 h-4 mr-2" />View</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleFavorite(sop.id, sop.isFavorite)}>
                          <Star className="w-4 h-4 mr-2" />{sop.isFavorite ? "Unfavorite" : "Favorite"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(sop.id)}>
                          <Copy className="w-4 h-4 mr-2" />Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(sop.id, sop.isArchived ?? false)}>
                          <Archive className="w-4 h-4 mr-2" />{sop.isArchived ? "Restore" : "Archive"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(sop.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />Delete
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
