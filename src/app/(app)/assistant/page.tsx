import type { Metadata } from "next";
import { Thread } from "@/components/assistant-ui/thread";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "AI Assistant — Pryro SOP" };

export default function AssistantPage() {
  return (
    <PageTransition>
      <div className="h-full">
        <Thread />
      </div>
    </PageTransition>
  );
}
