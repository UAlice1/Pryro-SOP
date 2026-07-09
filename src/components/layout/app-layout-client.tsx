"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { GenerateSOPTool } from "@/components/sops/sop-tool";
import type { ReactNode } from "react";

/**
 * Wraps the entire app in AssistantRuntimeProvider so the AI thread list
 * sidebar and the generate_sop tool are available on every page.
 */
export function AppLayoutClient({ children }: { children: ReactNode }) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/assistant" }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Register the generate_sop tool globally — available in every chat thread */}
      <GenerateSOPTool />
      {children}
    </AssistantRuntimeProvider>
  );
}
