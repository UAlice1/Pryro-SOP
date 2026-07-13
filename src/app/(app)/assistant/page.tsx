import type { Metadata } from "next";
import { AssistantPageClient } from "@/components/assistant-ui/assistant-page-client";

export const metadata: Metadata = { title: "AI Assistant — Pryro SOP" };

export default function AssistantPage() {
  return <AssistantPageClient />;
}
