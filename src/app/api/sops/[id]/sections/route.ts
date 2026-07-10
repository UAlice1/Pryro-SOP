import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sop = await db.sOP.findFirst({ where: { id, authorId: session.user.id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { sections } = await req.json();

  await db.sOPSection.deleteMany({ where: { sopId: id } });

  if (sections?.length) {
    for (const s of sections as { type: string; title: string; content: string; order: number }[]) {
      await db.sOPSection.create({
        data: { sopId: id, type: s.type, title: s.title, content: s.content, order: s.order },
      });
    }
  }

  return NextResponse.json({ success: true });
}
