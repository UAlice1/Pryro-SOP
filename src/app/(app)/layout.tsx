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

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-background px-6 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </main>
      </div>
    </AppLayoutClient>
  );
}
