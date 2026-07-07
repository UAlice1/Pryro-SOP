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
      sections: true,
      workflowSteps: true,
      checklistItems: true,
      responsibilities: true,
      resources: true,
      tags: true,
    },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await db.sOP.create({
    data: {
      title: `${original.title} (Copy)`,
      description: original.description,
      purpose: original.purpose,
      scope: original.scope,
      processName: original.processName,
      status: "DRAFT",
      isAIGenerated: original.isAIGenerated,
      authorId: session.user.id,
      organizationId: original.organizationId,
      departmentId: original.departmentId,
      categoryId: original.categoryId,
    },
  });

  if (original.sections.length) {
    await db.sOPSection.createMany({
      data: original.sections.map((s: { type: string; title: string; content: string; order: number }) => ({ sopId: copy.id, type: s.type, title: s.title, content: s.content, order: s.order })),
    });
  }
  if (original.workflowSteps.length) {
    await db.workflowStep.createMany({
      data: original.workflowSteps.map((s: { stepNumber: number; title: string; description: string | null; role: string | null; duration: string | null }) => ({ sopId: copy.id, stepNumber: s.stepNumber, title: s.title, description: s.description, role: s.role, duration: s.duration })),
    });
  }
  if (original.checklistItems.length) {
    await db.checklistItem.createMany({
      data: original.checklistItems.map((c: { text: string; isRequired: boolean; order: number }) => ({ sopId: copy.id, text: c.text, isRequired: c.isRequired, order: c.order })),
    });
  }
  if (original.responsibilities.length) {
    await db.responsibility.createMany({
      data: original.responsibilities.map((r: { role: string; description: string; order: number }) => ({ sopId: copy.id, role: r.role, description: r.description, order: r.order })),
    });
  }
  if (original.resources.length) {
    await db.resource.createMany({
      data: original.resources.map((r: { name: string; type: string | null; description: string | null; order: number }) => ({ sopId: copy.id, name: r.name, type: r.type, description: r.description, order: r.order })),
    });
  }

  await db.activity.create({
    data: { sopId: copy.id, userId: session.user.id, action: "duplicated", description: `Duplicated from: ${original.title}` },
  });

  return NextResponse.json(copy, { status: 201 });
}
