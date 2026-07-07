import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, comment } = await req.json();
  // action: "submit" | "approve" | "reject" | "request_changes"

  const sop = await db.sOP.findUnique({ where: { id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "submit") {
    // Author submits for review
    if (sop.authorId !== session.user.id) {
      return NextResponse.json({ error: "Only the author can submit for review" }, { status: 403 });
    }
    if (sop.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft SOPs can be submitted for review" }, { status: 400 });
    }
    await db.sOP.update({ where: { id }, data: { status: "REVIEW" } });
    await db.activity.create({
      data: { sopId: id, userId: session.user.id, action: "submitted", description: `Submitted for review: ${sop.title}` },
    });
    return NextResponse.json({ success: true, status: "REVIEW" });
  }

  if (action === "approve" || action === "reject" || action === "request_changes") {
    const statusMap: Record<string, string> = {
      approve: "APPROVED",
      reject: "DRAFT",
      request_changes: "DRAFT",
    };

    const approvalStatusMap: Record<string, "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"> = {
      approve: "APPROVED",
      reject: "REJECTED",
      request_changes: "CHANGES_REQUESTED",
    };

    // Create/update approval record
    await db.approval.upsert({
      where: { id: `${id}-${session.user.id}` },
      create: {
        id: `${id}-${session.user.id}`,
        sopId: id,
        approverId: session.user.id,
        status: approvalStatusMap[action],
        comment,
      },
      update: {
        status: approvalStatusMap[action],
        comment,
      },
    });

    await db.sOP.update({ where: { id }, data: { status: statusMap[action] } });

    await db.activity.create({
      data: {
        sopId: id,
        userId: session.user.id,
        action,
        description: `${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Requested changes for"}: ${sop.title}${comment ? ` — "${comment}"` : ""}`,
      },
    });

    return NextResponse.json({ success: true, status: statusMap[action] });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
