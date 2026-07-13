"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { GenerateSOPTool } from "@/components/sops/sop-tool";
import type { ReactNode } from "react";

/**
 * Wraps the entire app in AssistantRuntimeProvider so the AI thread list
 * sidebar and the generate_sop tool are available on every page.
 *
 * AssistantChatTransport extends DefaultChatTransport from the AI SDK and
 * accepts an `api` option to override the default /api/chat endpoint.
 */
export function AppLayoutClient({ children }: { children: ReactNode }) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/assistant" }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <GenerateSOPTool />
      {children}
    </AssistantRuntimeProvider>
  );
}
