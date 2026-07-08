"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell, CheckCircle, XCircle, MessageSquare, Globe,
  Clock, CheckSquare, ArrowRight, Loader2, BellOff,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  icon: string;
  message: string;
  sopId: string | null;
  sopTitle: string | null;
  actor: string;
  actorImage: string | null;
  createdAt: string;
  read: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  "check-circle":   <CheckCircle  className="w-3.5 h-3.5 text-green-500"  />,
  "x-circle":       <XCircle      className="w-3.5 h-3.5 text-red-500"    />,
  "message-square": <MessageSquare className="w-3.5 h-3.5 text-orange-500" />,
  "globe":          <Globe        className="w-3.5 h-3.5 text-purple-500" />,
  "clock":          <Clock        className="w-3.5 h-3.5 text-yellow-500" />,
  "check-square":   <CheckSquare  className="w-3.5 h-3.5 text-blue-500"   />,
  "message-circle": <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />,
  "bell":           <Bell         className="w-3.5 h-3.5 text-muted-foreground" />,
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [open,          setOpen]          = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  // Poll every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Refresh when panel opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <BellOff className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground text-center px-6">
                You&apos;ll see updates when SOPs are submitted, approved, or acknowledged.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationRow key={n.id} n={n} onClose={() => setOpen(false)} />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/30">
            <p className="text-[10px] text-muted-foreground text-center">
              Showing last 40 notifications · Auto-refreshes every 60s
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({ n, onClose }: { n: Notification; onClose: () => void }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${!n.read ? "bg-blue-50/40 dark:bg-blue-950/10" : ""}`}>
      <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
        <Avatar className="w-6 h-6">
          <AvatarImage src={n.actorImage ?? ""} />
          <AvatarFallback className="text-[10px]">{n.actor?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div>{ICON_MAP[n.icon] ?? ICON_MAP.bell}</div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug text-foreground">{n.message}</p>
        {n.sopTitle && (
          <p className="text-[10px] text-primary truncate mt-0.5">{n.sopTitle}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
      </div>

      {n.sopId && (
        <Link
          href={`/sops/${n.sopId}`}
          onClick={onClose}
          className="shrink-0 mt-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}

      {!n.read && (
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
      )}
    </div>
  );
}
