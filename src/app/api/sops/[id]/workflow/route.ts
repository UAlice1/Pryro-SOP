import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sop = await db.sOP.findFirst({ where: { id, authorId: session.user.id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { steps } = await req.json();

  await db.workflowStep.deleteMany({ where: { sopId: id } });

  if (steps?.length) {
    for (const s of steps as { stepNumber: number; title: string; description?: string; role?: string; duration?: string }[]) {
      await db.workflowStep.create({
        data: { sopId: id, stepNumber: s.stepNumber, title: s.title, description: s.description, role: s.role, duration: s.duration },
      });
    }
  }

  return NextResponse.json({ success: true });
}
