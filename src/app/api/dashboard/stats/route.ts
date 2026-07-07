import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [total, aiGenerated, drafts, published, pendingApprovals, recent, recentActivity] =
    await Promise.all([
      db.sOP.count({ where: { authorId: userId, isArchived: false } }),
      db.sOP.count({ where: { authorId: userId, isAIGenerated: true, isArchived: false } }),
      db.sOP.count({ where: { authorId: userId, status: "DRAFT", isArchived: false } }),
      db.sOP.count({ where: { authorId: userId, status: "PUBLISHED", isArchived: false } }),
      db.approval.count({ where: { approverId: userId, status: "PENDING" } }),
      db.sOP.findMany({
        where: { authorId: userId, isArchived: false },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true, title: true, status: true, isAIGenerated: true,
          updatedAt: true, createdAt: true,
          department: { select: { name: true } },
          category: { select: { name: true, color: true } },
        },
      }),
      db.activity.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          sop: { select: { id: true, title: true } },
          user: { select: { id: true, name: true, image: true } },
        },
      }),
    ]);

  const aiUsage = await db.aIGeneration.count({ where: { userId } });

  return NextResponse.json({
    total,
    aiGenerated,
    drafts,
    published,
    pendingApprovals,
    aiUsage,
    recent,
    recentActivity,
  });
}
