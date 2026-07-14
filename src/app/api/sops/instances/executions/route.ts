import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * PATCH /api/sops/instances/executions
 * Toggle a checklist task completion within an execution instance.
 * Body: { instanceId, checklistId, isCompleted }
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { instanceId, checklistId, isCompleted } = await req.json() as {
    instanceId:  string;
    checklistId: string;
    isCompleted: boolean;
  };

  if (!instanceId || !checklistId) {
    return NextResponse.json({ error: "instanceId and checklistId required" }, { status: 400 });
  }

  /* Find the execution row */
  const execution = await db.checklistTaskExecution.findFirst({
    where: { instanceId, checklistId },
  });

  if (!execution) {
    return NextResponse.json({ error: "Execution row not found" }, { status: 404 });
  }

  /* Update with timestamp + user reference */
  const updated = await db.checklistTaskExecution.update({
    where: { id: execution.id },
    data:  {
      isCompleted,
      completedById: isCompleted ? session.user.id : null,
      completedAt:   isCompleted ? new Date() : null,
    },
    include: {
      completedBy: { select: { id: true, name: true } },
    },
  });

  /* Auto-complete the instance if all tasks are done */
  const allExecutions = await db.checklistTaskExecution.findMany({
    where: { instanceId },
  });
  const allDone = allExecutions.every((e: { isCompleted: boolean }) => e.isCompleted);
  if (allDone) {
    await db.sOPInstance.update({
      where: { id: instanceId },
      data:  { status: "COMPLETED", completedAt: new Date() },
    });
  }

  return NextResponse.json(updated);
}
