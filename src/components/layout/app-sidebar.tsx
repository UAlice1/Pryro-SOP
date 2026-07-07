"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Plus, Settings, Star, Archive,
  BookOpen, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "next-auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sops", label: "All SOPs", icon: FileText },
  { href: "/sops/new", label: "New SOP", icon: Plus },
  { href: "/sops?filter=favorites", label: "Favorites", icon: Star },
  { href: "/sops?filter=archived", label: "Archived", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ user }: { user: User & { organizationId?: string } }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const initials = user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "U";

  return (
    <aside className={cn(
      "flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out shrink-0",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border h-14">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight truncate">Pryro SOP</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href.split("?")[0]) && item.href !== "/sops?filter=favorites" && item.href !== "/sops?filter=archived");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <div className={cn("flex items-center gap-2 px-2 py-2 rounded-lg", collapsed ? "justify-center" : "")}>
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarImage src={user.image ?? ""} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors mt-1"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
