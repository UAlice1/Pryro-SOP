import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Permission } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Any authenticated user can read a SOP — authorship check was too restrictive
  // (employees need to read/acknowledge SOPs they didn't author)
  const sop = await db.sOP.findFirst({
    where: { id, deletedAt: null },
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
        orderBy: { updatedAt: "desc" },
        include: { approver: { select: { id: true, name: true, image: true } } },
      },
      tags: { include: { tag: { select: { id: true, name: true } } } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      acknowledgements: {
        where: { userId: session.user.id },
        select: { acknowledgedAt: true },
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

  const userRole = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const canEdit = Permission.canEditSOPs(userRole);

  // Authors can always edit their own SOPs; EDITOR+ can edit any SOP
  const sop = await db.sOP.findFirst({
    where: { id, deletedAt: null, ...(canEdit ? {} : { authorId: session.user.id }) },
  });
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

  const role = (session.user as { role?: string }).role ?? "EMPLOYEE";
  if (!Permission.canDeleteSOPs(role)) {
    return NextResponse.json({ error: "Insufficient permissions to delete SOPs" }, { status: 403 });
  }

  const { id } = await params;

  // DELETE is already role-gated above; allow any permitted role to soft-delete any SOP
  const sop = await db.sOP.findFirst({ where: { id, deletedAt: null } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete: set deletedAt instead of removing the record
  await db.sOP.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED", isArchived: true },
  });

  await db.activity.create({
    data: {
      sopId: id,
      userId: session.user.id,
      action: "deleted",
      description: `Deleted SOP: ${sop.title}`,
    },
  });

  return NextResponse.json({ success: true });
}
