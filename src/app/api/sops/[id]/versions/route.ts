import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — list all versions
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

// POST — save a new version snapshot
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { changes } = (await req.json()) as { changes?: string };

  const sop = await db.sOP.findFirst({
    where: { id, authorId: session.user.id },
    include: {
      sections:      { orderBy: { order: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      checklistItems:{ orderBy: { order: "asc" } },
    },
  });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const latest = await db.sOPVersion.findFirst({
    where: { sopId: id },
    orderBy: { version: "desc" },
  });

  const newVersionNum = (latest?.version ?? 0) + 1;

  const snapshot = await db.sOPVersion.create({
    data: {
      sopId:     id,
      version:   newVersionNum,
      title:     sop.title,
      changes:   changes ?? `Version ${newVersionNum}`,
      createdBy: session.user.id,
      content: {
        title:         sop.title,
        description:   sop.description,
        purpose:       sop.purpose,
        scope:         sop.scope,
        sections:      sop.sections,
        workflowSteps: sop.workflowSteps,
        checklistItems:sop.checklistItems,
      },
    },
  });

  await db.sOP.update({ where: { id }, data: { version: newVersionNum } });
  await db.activity.create({
    data: { sopId: id, userId: session.user.id, action: "version_saved", description: `Saved version ${newVersionNum}${changes ? `: ${changes}` : ""}` },
  });

  return NextResponse.json(snapshot, { status: 201 });
}

// PATCH — revert to a specific version
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { versionId } = (await req.json()) as { versionId: string };
  if (!versionId) return NextResponse.json({ error: "versionId required" }, { status: 400 });

  const sop = await db.sOP.findFirst({ where: { id, authorId: session.user.id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sop.status === "APPROVED" || sop.status === "PUBLISHED") {
    return NextResponse.json({ error: "Cannot revert approved or published SOPs" }, { status: 403 });
  }

  const versionRecord = await db.sOPVersion.findFirst({ where: { id: versionId, sopId: id } });
  if (!versionRecord) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const snapshot = versionRecord.content as {
    title?: string;
    description?: string;
    purpose?: string;
    scope?: string;
    sections?: Array<{ type: string; title: string; content: string; order: number }>;
    workflowSteps?: Array<{ stepNumber: number; title: string; description: string | null; role: string | null; duration: string | null }>;
    checklistItems?: Array<{ text: string; isRequired: boolean; order: number }>;
  };

  // Restore SOP fields
  await db.sOP.update({
    where: { id },
    data: {
      title:       snapshot.title       ?? sop.title,
      description: snapshot.description ?? sop.description,
      purpose:     snapshot.purpose     ?? sop.purpose,
      scope:       snapshot.scope       ?? sop.scope,
    },
  });

  // Restore sections
  if (snapshot.sections?.length) {
    await db.sOPSection.deleteMany({ where: { sopId: id } });
    await db.sOPSection.createMany({
      data: snapshot.sections.map((s) => ({ sopId: id, type: s.type, title: s.title, content: s.content, order: s.order })),
    });
  }

  // Restore workflow
  if (snapshot.workflowSteps?.length) {
    await db.workflowStep.deleteMany({ where: { sopId: id } });
    await db.workflowStep.createMany({
      data: snapshot.workflowSteps.map((s) => ({
        sopId: id, stepNumber: s.stepNumber, title: s.title,
        description: s.description, role: s.role, duration: s.duration,
      })),
    });
  }

  // Restore checklist
  if (snapshot.checklistItems?.length) {
    await db.checklistItem.deleteMany({ where: { sopId: id } });
    await db.checklistItem.createMany({
      data: snapshot.checklistItems.map((c) => ({
        sopId: id, text: c.text, isRequired: c.isRequired, order: c.order,
      })),
    });
  }

  await db.activity.create({
    data: {
      sopId: id,
      userId: session.user.id,
      action: "version_reverted",
      description: `Reverted to version ${versionRecord.version}: ${versionRecord.title}`,
    },
  });

  return NextResponse.json({ success: true, revertedTo: versionRecord.version });
}
