import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — check if current user has acknowledged this SOP
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ack = await db.acknowledgement.findUnique({
    where: { sopId_userId: { sopId: id, userId: session.user.id } },
  });

  // Also return total acknowledgement count for this SOP
  const count = await db.acknowledgement.count({ where: { sopId: id } });

  return NextResponse.json({ acknowledged: !!ack, acknowledgedAt: ack?.acknowledgedAt ?? null, totalCount: count });
}

// POST — record acknowledgement
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify SOP exists and is published/approved
  const sop = await db.sOP.findUnique({
    where: { id },
    select: { id: true, title: true, status: true },
  });
  if (!sop) return NextResponse.json({ error: "SOP not found" }, { status: 404 });

  // Upsert — safe to call multiple times
  const ack = await db.acknowledgement.upsert({
    where: { sopId_userId: { sopId: id, userId: session.user.id } },
    create: { sopId: id, userId: session.user.id },
    update: { acknowledgedAt: new Date() },
  });

  await db.activity.create({
    data: {
      sopId: id,
      userId: session.user.id,
      action: "acknowledged",
      description: `Acknowledged SOP: ${sop.title}`,
    },
  });

  return NextResponse.json({ acknowledged: true, acknowledgedAt: ack.acknowledgedAt });
}
