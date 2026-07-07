"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Plus, Tag, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Version {
  id: string;
  version: number;
  title: string;
  changes: string | null;
  createdBy: string;
  createdAt: string;
}

export function SOPVersions({ sopId, currentVersion, onRefresh }: { sopId: string; currentVersion: number; onRefresh: () => void }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    fetch(`/api/sops/${sopId}/versions`)
      .then((r) => r.json())
      .then(setVersions)
      .finally(() => setLoading(false));
  }, [sopId]);

  const saveVersion = async () => {
    if (!changeNote.trim()) { toast.error("Please describe the changes"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: changeNote }),
      });
      if (res.ok) {
        const v = await res.json();
        setVersions([v, ...versions]);
        setChangeNote("");
        setShowSaveForm(false);
        toast.success(`Version ${v.version} saved`);
        onRefresh();
      } else {
        toast.error("Failed to save version");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">
            <History className="w-4 h-4" /> Version History
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Current version: v{currentVersion}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowSaveForm(!showSaveForm)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Save Version
        </Button>
      </div>

      {showSaveForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">What changed in this version?</Label>
              <Input
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="e.g. Updated workflow steps, added safety requirements..."
                onKeyDown={(e) => e.key === "Enter" && saveVersion()}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveVersion} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Tag className="w-3.5 h-3.5 mr-1.5" />}
                Save Snapshot
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSaveForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10">
          <History className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No versions saved yet.</p>
          <p className="text-xs text-muted-foreground">Save a version snapshot to track changes over time.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-0">
            {versions.map((v, i) => (
              <div key={v.id} className="relative flex items-start gap-4 pb-4 pl-1">
                <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 z-10 ring-2 ring-background ${i === 0 ? "bg-primary" : "bg-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${i === 0 ? "text-primary" : "text-foreground"}`}>v{v.version}</span>
                    {i === 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Latest</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{v.changes ?? "No change description"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(v.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
