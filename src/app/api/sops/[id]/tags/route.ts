import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const tags = await db.sOPTag.findMany({ where: { sopId: id } });
  return NextResponse.json(tags.map((t) => t.tag));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const userRole = (session.user as { role?: string })?.role ?? "EMPLOYEE";
  const canEdit = userRole === "SUPER_ADMIN" || userRole === "ORG_ADMIN" || userRole === "MANAGER";

  // Allow the SOP author OR any editor-role user to update tags
  const sop = await db.sOP.findFirst({
    where: {
      id,
      ...(canEdit ? {} : { authorId: session.user.id }),
    },
  });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tags } = await req.json() as { tags: string[] };
  const clean = [...new Set((tags ?? []).map((t: string) => t.trim().toLowerCase()).filter(Boolean))];

  await db.sOPTag.deleteMany({ where: { sopId: id } });
  if (clean.length) {
    await db.sOPTag.createMany({
      data: clean.map((tag) => ({ sopId: id, tag })),
    });
  }
  return NextResponse.json({ tags: clean });
}
