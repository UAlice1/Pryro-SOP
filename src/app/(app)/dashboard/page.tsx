import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  return (
    <PageTransition>
      <DashboardClient userName={session?.user?.name ?? "there"} />
    </PageTransition>
  );
}
