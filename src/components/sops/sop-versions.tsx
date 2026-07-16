"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History, Plus, Tag, Loader2, RotateCcw,
  Eye, ChevronDown, ChevronUp, GitCompare, X,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Version {
  id: string;
  version: number;
  title: string;
  changes: string | null;
  createdBy: string;
  createdAt: string;
  content?: {
    title?: string;
    description?: string;
    sections?: Array<{ title: string; content: string }>;
    workflowSteps?: Array<{ stepNumber: number; title: string; description: string | null }>;
    checklistItems?: Array<{ text: string; isRequired: boolean }>;
  };
}

export function SOPVersions({
  sopId,
  currentVersion,
  sopStatus,
  onRefresh,
}: {
  sopId: string;
  currentVersion: number;
  sopStatus?: string;
  onRefresh: () => void;
}) {
  const [versions, setVersions]         = useState<Version[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [reverting, setReverting]       = useState<string | null>(null);
  const [changeNote, setChangeNote]     = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [previewId, setPreviewId]       = useState<string | null>(null);
  const [confirmRevert, setConfirmRevert] = useState<string | null>(null);

  const canEdit = !["APPROVED", "PUBLISHED"].includes(sopStatus ?? "");

  useEffect(() => {
    fetch(`/api/sops/${sopId}/versions`)
      .then((r) => r.json())
      .then(setVersions)
      .catch(() => toast.error("Failed to load versions"))
      .finally(() => setLoading(false));
  }, [sopId]);

  const saveVersion = async () => {
    if (!changeNote.trim()) { toast.error("Describe what changed"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: changeNote }),
      });
      if (!res.ok) throw new Error("Failed to save version");
      const v = await res.json();
      setVersions([v, ...versions]);
      setChangeNote("");
      setShowSaveForm(false);
      toast.success(`Version ${v.version} saved`);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };

  const revertVersion = async (versionId: string) => {
    setConfirmRevert(null);
    setReverting(versionId);
    try {
      const res = await fetch(`/api/sops/${sopId}/versions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Revert failed");
      toast.success(`Reverted to version ${data.revertedTo}`);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Revert failed");
    } finally { setReverting(null); }
  };

  const previewedVersion = versions.find((v) => v.id === previewId);

  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <History className="w-4 h-4" /> Version History
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Current: <span className="font-semibold text-foreground">v{currentVersion}</span>
            {!canEdit && <span className="ml-2 text-yellow-600 dark:text-yellow-400">• Locked</span>}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setShowSaveForm(!showSaveForm)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Save Snapshot
          </Button>
        )}
      </div>

      {/* ── Save form ────────────────────────────────────────── */}
      {showSaveForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">What changed in this version?</Label>
              <Input
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="e.g. Updated safety section, added 3 workflow steps…"
                onKeyDown={(e) => e.key === "Enter" && saveVersion()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveVersion} disabled={saving}>
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
                  : <><Tag className="w-3.5 h-3.5 mr-1.5" />Save Snapshot</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSaveForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Version preview modal ────────────────────────────── */}
      {previewedVersion && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              Preview: v{previewedVersion.version} — {previewedVersion.changes}
            </CardTitle>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreviewId(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0 max-h-72 overflow-y-auto space-y-3">
            {previewedVersion.content?.title && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Title</p>
                <p className="text-sm font-medium">{previewedVersion.content.title}</p>
              </div>
            )}
            {previewedVersion.content?.sections?.map((s, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{s.content}</p>
              </div>
            ))}
            {previewedVersion.content?.workflowSteps && previewedVersion.content.workflowSteps.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Workflow</p>
                {previewedVersion.content.workflowSteps.map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{s.stepNumber}. {s.title}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Confirm revert dialog ─────────────────────────────── */}
      {confirmRevert && (
        <Card className="border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-400">Revert to this version?</p>
            <p className="text-xs text-muted-foreground">
              This will replace current sections, workflow, and checklist with the snapshot content.
              The action is reversible — save a snapshot first if needed.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => revertVersion(confirmRevert)}
                disabled={!!reverting}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {reverting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                Revert
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRevert(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Version list ──────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10">
          <History className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No snapshots saved yet.</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Save a version snapshot to track changes over time and enable rollback.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-0">
            {versions.map((v, i) => {
              const isCurrent = v.version === currentVersion;
              const isPreview = previewId === v.id;

              return (
                <VersionRow
                  key={v.id}
                  v={v}
                  isCurrent={isCurrent}
                  isFirst={i === 0}
                  isPreview={isPreview}
                  canEdit={canEdit}
                  reverting={reverting}
                  onPreview={() => setPreviewId(isPreview ? null : v.id)}
                  onConfirmRevert={() => setConfirmRevert(v.id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function VersionRow({
  v, isCurrent, isFirst, isPreview, canEdit, reverting, onPreview, onConfirmRevert,
}: {
  v: Version;
  isCurrent: boolean;
  isFirst: boolean;
  isPreview: boolean;
  canEdit: boolean;
  reverting: string | null;
  onPreview: () => void;
  onConfirmRevert: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative flex items-start gap-4 pb-4 pl-1">
      <div className={`w-3 h-3 rounded-full mt-2 shrink-0 z-10 ring-2 ring-background transition-colors ${
        isFirst ? "bg-primary" : "bg-muted-foreground/50"
      }`} />

      <div className="flex-1 min-w-0">
        <button
          className="w-full flex items-start gap-2 text-left hover:bg-muted/40 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${isFirst ? "text-primary" : "text-foreground"}`}>
                v{v.version}
              </span>
              {isCurrent && (
                <Badge className="text-[10px] bg-primary/10 text-primary border-0">Current</Badge>
              )}
              <span className="text-xs text-muted-foreground truncate flex-1">{v.changes ?? "No description"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(v.createdAt)}</p>
          </div>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />}
        </button>

        {expanded && (
          <div className="flex items-center gap-2 mt-1.5 ml-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1"
              onClick={onPreview}
            >
              {isPreview ? <X className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {isPreview ? "Close" : "Preview"}
            </Button>

            {!isCurrent && canEdit && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] gap-1 text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700"
                onClick={onConfirmRevert}
                disabled={!!reverting}
              >
                {reverting === v.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <RotateCcw className="w-3 h-3" />}
                Revert to this
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] gap-1 text-muted-foreground"
              disabled
              title="Compare view coming soon"
            >
              <GitCompare className="w-3 h-3" />
              Compare
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
