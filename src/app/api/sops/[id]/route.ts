import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const sop = await db.sOP.findFirst({
    where: { id, authorId: session.user.id },
    include: {
      sections: { orderBy: { order: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      checklistItems: { orderBy: { order: "asc" } },
      responsibilities: { orderBy: { order: "asc" } },
      resources: { orderBy: { order: "asc" } },
      department: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      author: { select: { id: true, name: true, image: true } },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, image: true } },
          replies: {
            include: { author: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      approvals: {
        include: { approver: { select: { id: true, name: true, image: true } } },
      },
      tags: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sop);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const sop = await db.sOP.findFirst({ where: { id, authorId: session.user.id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = ["title", "description", "purpose", "scope", "processName", "status",
    "departmentId", "categoryId", "isFavorite", "isArchived"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const updated = await db.sOP.update({ where: { id }, data });

  await db.activity.create({
    data: { sopId: id, userId: session.user.id, action: "updated", description: `Updated SOP: ${sop.title}` },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const sop = await db.sOP.findFirst({ where: { id, authorId: session.user.id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.sOP.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
