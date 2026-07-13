import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Permission } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const sopTags = await db.sOPTag.findMany({
    where: { sopId: id },
    include: { tag: { select: { id: true, name: true } } },
  });

  return NextResponse.json(sopTags.map((st) => st.tag.name));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const userRole = (session.user as { role?: string })?.role ?? "EMPLOYEE";
  const canEdit = Permission.canEditSOPs(userRole);

  const sop = await db.sOP.findFirst({
    where: { id, deletedAt: null, ...(canEdit ? {} : { authorId: session.user.id }) },
  });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "User has no organization" }, { status: 400 });

  const { tags } = (await req.json()) as { tags: string[] };
  const clean = [...new Set((tags ?? []).map((t: string) => t.trim().toLowerCase()).filter(Boolean))];

  // Upsert each tag into the org-scoped Tag table, then link to the SOP
  const tagRecords = await Promise.all(
    clean.map((name) =>
      db.tag.upsert({
        where: { organizationId_name: { organizationId: orgId, name } },
        create: { name, organizationId: orgId },
        update: {},
      })
    )
  );

  // Replace all SOPTag links for this SOP
  await db.sOPTag.deleteMany({ where: { sopId: id } });

  for (const tagRecord of tagRecords) {
    await db.sOPTag.create({ data: { sopId: id, tagId: tagRecord.id } });
  }

  return NextResponse.json({ tags: clean });
}
