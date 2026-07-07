import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const versions = await db.sOPVersion.findMany({
    where: { sopId: id },
    orderBy: { version: "desc" },
  });

  return NextResponse.json(versions);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { changes } = await req.json();

  const sop = await db.sOP.findFirst({
    where: { id, authorId: session.user.id },
    include: {
      sections: { orderBy: { order: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      checklistItems: { orderBy: { order: "asc" } },
    },
  });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const latestVersion = await db.sOPVersion.findFirst({
    where: { sopId: id },
    orderBy: { version: "desc" },
  });

  const newVersion = (latestVersion?.version ?? 0) + 1;

  const snapshot = await db.sOPVersion.create({
    data: {
      sopId: id,
      version: newVersion,
      title: sop.title,
      changes: changes ?? `Version ${newVersion}`,
      createdBy: session.user.id,
      content: {
        sections: sop.sections,
        workflowSteps: sop.workflowSteps,
        checklistItems: sop.checklistItems,
        title: sop.title,
        description: sop.description,
        purpose: sop.purpose,
        scope: sop.scope,
      },
    },
  });

  await db.sOP.update({ where: { id }, data: { version: newVersion } });

  await db.activity.create({
    data: { sopId: id, userId: session.user.id, action: "version_saved", description: `Saved version ${newVersion}: ${changes ?? ""}` },
  });

  return NextResponse.json(snapshot, { status: 201 });
}
