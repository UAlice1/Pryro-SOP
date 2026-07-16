import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppLayoutClient } from "@/components/layout/app-layout-client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppLayoutClient>
      {/* Full-height flex row: sidebar + main workspace */}
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar user={session.user} />

        {/* Main content area — mobile gets top padding for hamburger */}
        <main className="flex-1 overflow-hidden min-w-0 bg-background flex flex-col pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </AppLayoutClient>
  );
}
