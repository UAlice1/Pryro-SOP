"use client";

import { PanelLeft } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

export function SidebarToggle({ className }: { className?: string }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();

  return (
    <button
      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={cn(
        "hidden md:flex items-center justify-center w-8 h-8 rounded-md",
        "text-muted-foreground hover:text-foreground hover:bg-accent",
        "transition-colors shrink-0",
        className,
      )}
    >
      <PanelLeft className="w-4 h-4" />
    </button>
  );
}
