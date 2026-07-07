"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Search, LogOut, User, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import type { User as AuthUser } from "next-auth";
import { CommandPalette } from "@/components/command-palette";
import { useState } from "react";

export function AppHeader({ user }: { user: AuthUser }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [cmdOpen, setCmdOpen] = useState(false);
  const initials = user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "U";

  return (
    <>
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 sticky top-0 z-40">
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors hover:bg-accent w-64"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search SOPs...</span>
          <kbd className="ml-auto text-[10px] border border-border rounded px-1 py-0.5 bg-muted">⌘K</kbd>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="w-4 h-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0 transition-all" />
            <Moon className="absolute w-4 h-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100 transition-all" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarImage src={user.image ?? ""} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                <User className="w-4 h-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
