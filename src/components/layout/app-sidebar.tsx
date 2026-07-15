"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Settings,
  ChevronLeft, ChevronRight, Building2, LogOut, User,
  Plus, Search, Menu, X, ChevronDown, Sun, Moon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CommandPalette } from "@/components/command-palette";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { User as NextAuthUser } from "next-auth";

/* ─── Nav items ─────────────────────────────────────────────────────────── */

const BASE_NAV = [
  { href: "/sops/new",  label: "New SOP",  icon: Plus     },
  { href: "/sops",      label: "My SOPs",  icon: FileText },
  { href: "/settings",  label: "Settings", icon: Settings },
];

function NavItem({
  href, label, icon: Icon, onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (() => {
    if (href.includes("?")) return false;
    if (href === "/sops/new") return pathname === "/sops/new";
    if (href === "/sops") return pathname === "/sops" || (pathname.startsWith("/sops/") && pathname !== "/sops/new");
    return pathname === href || pathname.startsWith(href + "/");
  })();

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)] font-medium"
          : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/* ─── Shared sidebar content ─────────────────────────────────────────────── */

export function AppSidebarContent({
  user,
  onNavigate,
  onCollapse,
}: {
  user: NextAuthUser;
  onNavigate?: () => void;
  onCollapse?: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const userRole = (session?.user as { role?: string })?.role ?? "EMPLOYEE";
  const isAdmin  = userRole === "SUPER_ADMIN" || userRole === "ORG_ADMIN";
  const [cmdOpen, setCmdOpen] = useState(false);

  const navItems = [
    ...BASE_NAV,
    ...(isAdmin ? [{ href: "/settings?tab=admin", label: "Admin", icon: Building2 }] : []),
  ];

  const initials = user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "U";

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--sidebar)" }}>

      {/* ── Top header: Logo + collapse button ─────────────────── */}
      <div className="flex items-center justify-between px-3 py-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm tracking-tight text-[var(--sidebar-foreground)]">Pryro SOP</span>
        </div>
        {onCollapse && (
          <button
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="flex items-center justify-center w-6 h-6 rounded-md text-[var(--sidebar-foreground)]/40 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Search bar ──────────────────────────────────────── */}
      <div className="px-3 pb-2 shrink-0">
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 text-sm text-[var(--sidebar-foreground)]/50 hover:text-[var(--sidebar-foreground)] rounded-lg px-3 py-2 transition-colors hover:bg-[var(--sidebar-accent)] w-full"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Search SOPs...</span>
          <kbd className="ml-auto text-[10px] border border-[var(--sidebar-border)] rounded px-1 py-0.5 bg-[var(--sidebar-accent)] hidden sm:block">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── App navigation ──────────────────────────────────── */}
      <nav className="px-2 pb-1 space-y-0.5 flex-1 shrink-0">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* ── User footer — borderless, flat ───────────────────── */}
      <div className="px-2 py-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--sidebar-accent)] transition-colors text-left group"
              aria-label="User menu"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={user.image ?? ""} />
                <AvatarFallback className="text-xs bg-[#2f2f2f] text-[#ffffff] dark:bg-[#3c3c3c] dark:text-[#ffffff] font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-[var(--sidebar-foreground)]">
                  {user.name}
                </p>
                <p className="text-[11px] text-[var(--sidebar-foreground)]/50 truncate">
                  {user.email}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--sidebar-foreground)]/40 group-hover:text-[var(--sidebar-foreground)]/70 transition-colors shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-52 mb-1">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <User className="w-4 h-4 mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark"
                ? <><Sun className="w-4 h-4 mr-2" /> Light mode</>
                : <><Moon className="w-4 h-4 mr-2" /> Dark mode</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}

/* ─── Collapsed sidebar ─────────────────────────────────────────────────── */

function CollapsedSidebar({ user, onExpand }: { user: NextAuthUser; onExpand?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const initials = user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "U";

  return (
    <div className="flex flex-col h-full items-center py-3 gap-1">
      {/* Expand button at top */}
      <button
        onClick={onExpand}
        aria-label="Expand sidebar"
        className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--sidebar-foreground)]/40 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors mb-2"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
      {/* Nav icons */}
      {BASE_NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
              isActive
                ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]"
                : "text-[var(--sidebar-foreground)]/60 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]",
            )}
          >
            <Icon className="w-4 h-4" />
          </Link>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User avatar with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title={`${user.name} — ${user.email}`}
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--sidebar-accent)] transition-colors mb-1"
            aria-label="User menu"
          >
            <Avatar className="w-7 h-7">
              <AvatarImage src={user.image ?? ""} />
              <AvatarFallback className="text-xs bg-[#2f2f2f] text-white font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-52 mb-1">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <User className="w-4 h-4 mr-2" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="w-4 h-4 mr-2" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark"
              ? <><Sun className="w-4 h-4 mr-2" /> Light mode</>
              : <><Moon className="w-4 h-4 mr-2" /> Dark mode</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ─── Desktop sidebar ───────────────────────────────────────────────────── */

export function AppSidebar({ user }: { user: NextAuthUser }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const reduced = useReducedMotion();

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-40 h-9 w-9 md:hidden bg-background/80 backdrop-blur-sm border border-border shadow-sm"
        aria-label="Open navigation menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Desktop sidebar — fixed 260 px wide */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r transition-all duration-300 ease-in-out shrink-0 relative",
          collapsed ? "w-16" : "w-[200px]",
        )}
        style={{
          background: "var(--sidebar)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        {collapsed ? (
          /* Collapsed strip — icons + avatar at bottom */
          <CollapsedSidebar user={user} onExpand={() => setCollapsed(false)} />
        ) : (
          <AppSidebarContent user={user} onCollapse={() => setCollapsed(true)} />
        )}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.05 : 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              key="drawer"
              initial={{ x: reduced ? 0 : "-100%", opacity: reduced ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduced ? 0 : "-100%", opacity: reduced ? 0 : 1 }}
              transition={{ duration: reduced ? 0.05 : 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed top-0 left-0 z-50 h-full w-[260px] shadow-xl md:hidden"
              style={{ background: "var(--sidebar)" }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="absolute top-3 right-3 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <AppSidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
