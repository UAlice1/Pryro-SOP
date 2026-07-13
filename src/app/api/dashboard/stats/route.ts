import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Permission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const role   = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const orgId  = (session.user as { organizationId?: string }).organizationId;

  const canViewAll  = Permission.canViewAllOrgSOPs(role);
  const canApprove  = Permission.canApprove(role);

  // Scope: org-wide for EDITOR+, own SOPs only for EMPLOYEE
  const sopScope = canViewAll
    ? { organizationId: orgId ?? undefined, isArchived: false, deletedAt: null }
    : { authorId: userId, isArchived: false, deletedAt: null };

  const [
    total,
    aiGenerated,
    drafts,
    inReview,
    approved,
    published,
    pendingApprovalCount,
    recent,
    pendingApprovalSOPs,
    recentActivity,
    aiUsage,
  ] = await Promise.all([
    // ── Counts ───────────────────────────────────────────────────────────────
    db.sOP.count({ where: sopScope }),
    db.sOP.count({ where: { ...sopScope, isAIGenerated: true } }),
    db.sOP.count({ where: { ...sopScope, status: "DRAFT" } }),
    db.sOP.count({ where: { ...sopScope, status: "REVIEW" } }),
    db.sOP.count({ where: { ...sopScope, status: "APPROVED" } }),
    db.sOP.count({ where: { ...sopScope, status: "PUBLISHED" } }),

    // ── Pending approvals for APPROVER+ ──────────────────────────────────────
    canApprove
      ? db.sOP.count({ where: { ...(orgId ? { organizationId: orgId } : {}), status: "REVIEW", deletedAt: null } })
      : Promise.resolve(0),

    // ── Recent SOPs (last 6) ─────────────────────────────────────────────────
    db.sOP.findMany({
      where:   sopScope,
      orderBy: { updatedAt: "desc" },
      take:    6,
      select:  {
        id: true, title: true, status: true, isAIGenerated: true,
        updatedAt: true, createdAt: true, version: true,
        author:     { select: { id: true, name: true, image: true } },
        department: { select: { name: true } },
        category:   { select: { name: true, color: true } },
      },
    }),

    // ── SOPs awaiting approval (for APPROVER+) — up to 5 ────────────────────
    canApprove
      ? db.sOP.findMany({
          where:   { ...(orgId ? { organizationId: orgId } : {}), status: "REVIEW", deletedAt: null },
          orderBy: { updatedAt: "asc" }, // oldest first — most urgent
          take:    5,
          select:  {
            id: true, title: true, status: true, updatedAt: true,
            author:     { select: { id: true, name: true, image: true } },
            department: { select: { name: true } },
          },
        })
      : Promise.resolve([]),

    // ── Recent activity ──────────────────────────────────────────────────────
    // Managers+ see org activity; employees see own activity
    db.activity.findMany({
      where:   canViewAll && orgId
        ? { sop: { organizationId: orgId } }
        : { userId },
      orderBy: { createdAt: "desc" },
      take:    10,
      include: {
        sop:  { select: { id: true, title: true } },
        user: { select: { id: true, name: true, image: true } },
      },
    }),

    // ── AI usage ─────────────────────────────────────────────────────────────
    db.aIGeneration.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    // Counts
    total,
    aiGenerated,
    drafts,
    inReview,
    approved,
    published,
    pendingApprovalCount,
    aiUsage,
    // Lists
    recent,
    pendingApprovalSOPs,
    recentActivity,
    // Meta
    role,
    canViewAll,
    canApprove,
  });
}
