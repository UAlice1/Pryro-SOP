import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { archive } = await req.json(); // true = archive, false = unarchive

  const sop = await db.sOP.findFirst({ where: { id, authorId: session.user.id, deletedAt: null } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.sOP.update({
    where: { id },
    data: {
      isArchived: archive,
      status: archive ? "ARCHIVED" : "DRAFT",
    },
  });

  await db.activity.create({
    data: {
      sopId: id,
      userId: session.user.id,
      action: archive ? "archived" : "unarchived",
      description: `${archive ? "Archived" : "Restored"}: ${sop.title}`,
    },
  });

  return NextResponse.json({ success: true, isArchived: archive });
}
