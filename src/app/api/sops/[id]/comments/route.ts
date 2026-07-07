import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content, parentId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const comment = await db.comment.create({
    data: { sopId: id, authorId: session.user.id, content, parentId },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
