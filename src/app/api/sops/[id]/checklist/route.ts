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

  // Delete all existing items first (single query)
  await db.checklistItem.deleteMany({ where: { sopId: id } });

  // Sequential inserts — safe with PrismaNeonHttp adapter
  if (items?.length) {
    for (const item of items as { text: string; isRequired: boolean; order: number }[]) {
      await db.checklistItem.create({
        data: { sopId: id, text: item.text, isRequired: item.isRequired, order: item.order },
      });
    }
  }

  return NextResponse.json({ success: true });
}
