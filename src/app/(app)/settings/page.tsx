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
    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
      <PageTransition>
        <SettingsClient defaultTab={tab} />
      </PageTransition>
    </div>
  );
}
