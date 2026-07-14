"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { User as AuthUser } from "next-auth";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function AppHeader({ user }: { user: AuthUser }) {
  const { theme, setTheme } = useTheme();
  const initials = user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "U";

  return (
    <header className="h-12 bg-transparent flex items-center justify-end px-4 shrink-0">
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
        </Button>

        <NotificationBell />

        <Avatar className="w-8 h-8 ml-1 cursor-pointer">
          <AvatarImage src={user.image ?? ""} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
