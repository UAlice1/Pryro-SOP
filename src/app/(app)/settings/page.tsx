import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings/settings-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <PageTransition><SettingsClient /></PageTransition>;
}
