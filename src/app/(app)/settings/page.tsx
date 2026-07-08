import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings/settings-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return (
    <PageTransition>
      <SettingsClient defaultTab={tab} />
    </PageTransition>
  );
}
