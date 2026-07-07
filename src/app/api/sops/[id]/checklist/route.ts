import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sop = await db.sOP.findFirst({ where: { id, authorId: session.user.id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { items } = await req.json();
  await db.checklistItem.deleteMany({ where: { sopId: id } });

  if (items?.length) {
    await db.checklistItem.createMany({
      data: items.map((item: { text: string; isRequired: boolean; order: number }) => ({
        sopId: id,
        text: item.text,
        isRequired: item.isRequired,
        order: item.order,
      })),
    });
  }

  return NextResponse.json({ success: true });
}
