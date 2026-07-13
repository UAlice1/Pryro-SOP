"use client";

import { Thread } from "@/components/assistant-ui/thread";

/* ─────────────────────────────────────────────────────────────────────────
   AssistantPageClient
   Renders the chat thread. The AssistantRuntimeProvider is already mounted
   in AppLayoutClient (the (app) layout wrapper), so we just render Thread
   directly — the sidebar's thread history and new-chat button stay in sync.
──────────────────────────────────────────────────────────────────────────── */
export function AssistantPageClient() {
  return (
    <div className="flex h-full w-full flex-col bg-background">
      <Thread />
    </div>
  );
}
