import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const original = await db.sOP.findFirst({
    where: { id, authorId: session.user.id },
    include: {
      sections:         true,
      workflowSteps:    true,
      checklistItems:   true,
      responsibilities: true,
      resources:        true,
      tags:             true,
    },
  });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await db.sOP.create({
    data: {
      title:          `${original.title} (Copy)`,
      description:    original.description,
      purpose:        original.purpose,
      scope:          original.scope,
      processName:    original.processName,
      status:         "DRAFT",
      isAIGenerated:  original.isAIGenerated,
      authorId:       session.user.id,
      organizationId: original.organizationId,
      departmentId:   original.departmentId,
      categoryId:     original.categoryId,
    },
  });

  // Sequential inserts — safe with PrismaNeonHttp adapter
  for (const s of original.sections) {
    await db.sOPSection.create({
      data: { sopId: copy.id, type: s.type, title: s.title, content: s.content, order: s.order },
    });
  }
  for (const s of original.workflowSteps) {
    await db.workflowStep.create({
      data: { sopId: copy.id, stepNumber: s.stepNumber, title: s.title, description: s.description, role: s.role, duration: s.duration },
    });
  }
  for (const c of original.checklistItems) {
    await db.checklistItem.create({
      data: { sopId: copy.id, text: c.text, isRequired: c.isRequired, order: c.order },
    });
  }
  for (const r of original.responsibilities) {
    await db.responsibility.create({
      data: { sopId: copy.id, role: r.role, description: r.description, order: r.order },
    });
  }
  for (const r of original.resources) {
    await db.resource.create({
      data: { sopId: copy.id, name: r.name, type: r.type, description: r.description, order: r.order },
    });
  }

  await db.activity.create({
    data: { sopId: copy.id, userId: session.user.id, action: "duplicated", description: `Duplicated from: ${original.title}` },
  });

  return NextResponse.json(copy, { status: 201 });
}
