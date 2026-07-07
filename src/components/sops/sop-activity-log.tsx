"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/utils";

interface Activity {
  id: string;
  action: string;
  description: string | null;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
}

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-500",
  updated: "bg-blue-500",
  deleted: "bg-red-500",
  duplicated: "bg-purple-500",
  archived: "bg-gray-500",
};

export function SOPActivityLog({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No activity recorded.</p>;
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />
      {activities.map((act) => (
        <div key={act.id} className="relative flex items-start gap-4 pb-5 pl-1">
          <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 z-10 ring-2 ring-background ${ACTION_COLORS[act.action] ?? "bg-muted-foreground"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Avatar className="w-5 h-5">
                <AvatarImage src={act.user.image ?? ""} />
                <AvatarFallback className="text-[9px]">{act.user.name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{act.description}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(act.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
