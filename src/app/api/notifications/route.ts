import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — fetch notifications for the current user (from Activity feed, cross-user actions)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  // Notifications are derived from activities on SOPs the user authored or is an approver on
  const [approvalActivities, sopActivities] = await Promise.all([
    // Activities on SOPs where current user is an approver
    db.activity.findMany({
      where: {
        userId: { not: session.user.id }, // not my own actions
        sop: { approvals: { some: { approverId: session.user.id } } },
        action: { in: ["submitted", "approved", "rejected", "request_changes", "published", "acknowledged"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { sop: { select: { id: true, title: true } }, user: { select: { name: true, image: true } } },
    }),
    // Activities on SOPs the user authored, done by someone else
    db.activity.findMany({
      where: {
        userId: { not: session.user.id },
        sop: { authorId: session.user.id },
        action: { in: ["approved", "rejected", "request_changes", "comment_added", "acknowledged"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { sop: { select: { id: true, title: true } }, user: { select: { name: true, image: true } } },
    }),
  ]);

  // Merge and deduplicate by id, sort by date
  const seen = new Set<string>();
  const merged = [...approvalActivities, ...sopActivities]
    .filter((a) => { if (seen.has(a.id)) return false; seen.add(a.id); return true; })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40);

  // Map to notification shape
  const notificationTypeMap: Record<string, { type: string; icon: string }> = {
    submitted:        { type: "approval_needed",   icon: "clock" },
    approved:         { type: "sop_approved",       icon: "check-circle" },
    rejected:         { type: "sop_rejected",       icon: "x-circle" },
    request_changes:  { type: "changes_requested",  icon: "message-square" },
    published:        { type: "sop_published",      icon: "globe" },
    acknowledged:     { type: "acknowledged",        icon: "check-square" },
    comment_added:    { type: "comment",             icon: "message-circle" },
  };

  const notifications = merged.map((a) => ({
    id: a.id,
    type: notificationTypeMap[a.action]?.type ?? "info",
    icon: notificationTypeMap[a.action]?.icon ?? "bell",
    message: a.description ?? "",
    sopId: a.sopId,
    sopTitle: a.sop?.title ?? null,
    actor: a.user?.name ?? "Someone",
    actorImage: a.user?.image ?? null,
    createdAt: a.createdAt,
    // Mark as "read" if older than 24h (simple heuristic without a separate read table)
    read: new Date(a.createdAt).getTime() < Date.now() - 24 * 60 * 60 * 1000,
  }));

  const filtered = unreadOnly ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications: filtered, unreadCount });
}
