"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Plus, Settings, Star, Archive,
  ChevronLeft, ChevronRight, Sparkles, Building2,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "next-auth";

const BASE_NAV = [
  { href: "/dashboard",              label: "Dashboard", icon: LayoutDashboard },
  { href: "/sops",                   label: "All SOPs",  icon: FileText        },
  { href: "/sops/new",               label: "New SOP",   icon: Plus            },
  { href: "/sops?filter=favorites",  label: "Favorites", icon: Star            },
  { href: "/sops?filter=archived",   label: "Archived",  icon: Archive         },
  { href: "/settings",               label: "Settings",  icon: Settings        },
];

function NavItem({ href, label, icon: Icon, collapsed, onNavigate }: {
  href: string; label: string; icon: React.ElementType;
  collapsed: boolean; onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = href.split("?")[0];
  const active =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(base) &&
      href !== "/sops?filter=favorites" && href !== "/sops?filter=archived");

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

/* Shared content used by both desktop sidebar and mobile sheet */
export function AppSidebarContent({
  user,
  collapsed = false,
  onNavigate,
}: {
  user: User;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? "EMPLOYEE";
  const isAdmin  = userRole === "SUPER_ADMIN" || userRole === "ORG_ADMIN";

  const navItems = [
    ...BASE_NAV,
    ...(isAdmin ? [{ href: "/settings?tab=admin", label: "Admin", icon: Building2 }] : []),
  ];

  const initials = user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "U";

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border h-14 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight truncate">Pryro SOP</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 shrink-0">
        <div className={cn(
          "flex items-center gap-2 px-2 py-2 rounded-lg",
          collapsed ? "justify-center" : ""
        )}>
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
      </div>
    </div>
  );
}

/* Desktop sidebar with collapse toggle */
export function AppSidebar({ user }: { user: User & { organizationId?: string } }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out shrink-0",
      collapsed ? "w-16" : "w-56"
    )}>
      <AppSidebarContent user={user} collapsed={collapsed} />

      {/* Collapse toggle */}
      <div className="border-t border-border p-2 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
