import type { Metadata } from "next";
import { AISettingsClient } from "@/components/settings/ai-settings-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "AI Provider Settings" };

export default function AISettingsPage() {
  return (
    <PageTransition>
      <AISettingsClient />
    </PageTransition>
  );
}
