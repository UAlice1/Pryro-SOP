import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/* GET /api/sops/instances?sopId=xxx — list active instances for a SOP */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sopId = new URL(req.url).searchParams.get("sopId");
  if (!sopId) return NextResponse.json({ error: "sopId required" }, { status: 400 });

  const instances = await db.sOPInstance.findMany({
    where:   { sopId },
    orderBy: { launchedAt: "desc" },
    include: {
      launchedBy:     { select: { id: true, name: true, image: true } },
      taskExecutions: {
        include: {
          checklistItem: { select: { id: true, text: true, priority: true, assignedRole: true } },
          completedBy:   { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(instances);
}

/* POST /api/sops/instances — launch a new execution instance */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sopId, name } = await req.json() as { sopId: string; name?: string };
  if (!sopId) return NextResponse.json({ error: "sopId required" }, { status: 400 });

  /* Verify the SOP exists and is accessible */
  const sop = await db.sOP.findFirst({
    where:   { id: sopId },
    include: { checklistItems: { orderBy: { order: "asc" } } },
  });
  if (!sop) return NextResponse.json({ error: "SOP not found" }, { status: 404 });

  const instanceName = name ?? `${sop.title} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  /* Create instance + pre-populate task execution rows for each checklist item */
  const instance = await db.sOPInstance.create({
    data: {
      sopId,
      name:          instanceName,
      status:        "ACTIVE",
      launchedById:  session.user.id,
      taskExecutions: {
        create: sop.checklistItems.map((item: { id: string }) => ({
          checklistId: item.id,
          isCompleted: false,
        })),
      },
    },
    include: {
      taskExecutions: {
        include: {
          checklistItem: { select: { id: true, text: true, priority: true, assignedRole: true, isRequired: true } },
        },
      },
    },
  });

  await db.activity.create({
    data: {
      sopId,
      userId:      session.user.id,
      action:      "launched",
      description: `Launched execution: ${instanceName}`,
    },
  });

  return NextResponse.json(instance, { status: 201 });
}
