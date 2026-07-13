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
    // Pull back the layout padding so the chat fills edge-to-edge
    <div className="-mx-6 -my-6 flex h-[calc(100vh-0px)] w-[calc(100%+3rem)] flex-col bg-background">
      <Thread />
    </div>
  );
}
