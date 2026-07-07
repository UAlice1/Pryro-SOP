import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sop = await db.sOP.findFirst({ where: { id, authorId: session.user.id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { responsibilities } = await req.json();

  await db.responsibility.deleteMany({ where: { sopId: id } });

  if (responsibilities?.length) {
    await db.responsibility.createMany({
      data: responsibilities.map((r: { role: string; description: string; order: number }) => ({
        sopId: id,
        role: r.role,
        description: r.description,
        order: r.order,
      })),
    });
  }

  await db.activity.create({
    data: { sopId: id, userId: session.user.id, action: "updated", description: "Updated responsibilities" },
  });

  return NextResponse.json({ success: true });
}
