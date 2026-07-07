import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  return <DashboardClient userName={session?.user?.name ?? "there"} />;
}
