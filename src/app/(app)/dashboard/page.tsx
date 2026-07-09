import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Dashboard — Pryro SOP" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <PageTransition>
      <DashboardClient userName={session.user.name ?? "User"} />
    </PageTransition>
  );
}
