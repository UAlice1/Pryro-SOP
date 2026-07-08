import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { SOPStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, comment } = (await req.json()) as { action: string; comment?: string };

  const sop = await db.sOP.findUnique({ where: { id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Submit for review ─────────────────────────────────────────
  if (action === "submit") {
    if (sop.authorId !== session.user.id) {
      return NextResponse.json({ error: "Only the author can submit for review" }, { status: 403 });
    }
    if (sop.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft SOPs can be submitted" }, { status: 400 });
    }

    await db.sOP.update({ where: { id }, data: { status: "REVIEW" } });
    await db.activity.create({
      data: { sopId: id, userId: session.user.id, action: "submitted", description: `Submitted for review: ${sop.title}` },
    });
    return NextResponse.json({ success: true, status: "REVIEW" });
  }

  // ── Reviewer actions ──────────────────────────────────────────
  if (action === "approve" || action === "reject" || action === "request_changes") {
    if (sop.status !== "REVIEW") {
      return NextResponse.json({ error: "SOP must be in REVIEW status" }, { status: 400 });
    }

    const sopStatusMap: Record<string, SOPStatus> = {
      approve:         "APPROVED",
      reject:          "DRAFT",
      request_changes: "DRAFT",
    };

    const approvalStatusMap: Record<string, "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"> = {
      approve:         "APPROVED",
      reject:          "REJECTED",
      request_changes: "CHANGES_REQUESTED",
    };

    const approvalId = `${id}-${session.user.id}`;

    await db.approval.upsert({
      where:  { id: approvalId },
      create: { id: approvalId, sopId: id, approverId: session.user.id, status: approvalStatusMap[action], comment },
      update: { status: approvalStatusMap[action], comment },
    });

    const newStatus = sopStatusMap[action];
    const updateData: { status: SOPStatus; publishedAt?: Date } = { status: newStatus };
    // Note: publishedAt is set separately on the publish action

    await db.sOP.update({ where: { id }, data: updateData });
    await db.activity.create({
      data: {
        sopId: id,
        userId: session.user.id,
        action,
        description: `${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Requested changes for"}: ${sop.title}${comment ? ` — "${comment}"` : ""}`,
      },
    });

    return NextResponse.json({ success: true, status: newStatus });
  }

  // ── Publish (approved → published) ───────────────────────────
  if (action === "publish") {
    if (sop.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved SOPs can be published" }, { status: 400 });
    }

    await db.sOP.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await db.activity.create({
      data: { sopId: id, userId: session.user.id, action: "published", description: `Published SOP: ${sop.title}` },
    });
    return NextResponse.json({ success: true, status: "PUBLISHED" });
  }

  // ── Withdraw (published/approved → draft) ────────────────────
  if (action === "withdraw") {
    if (sop.authorId !== session.user.id) {
      return NextResponse.json({ error: "Only the author can withdraw" }, { status: 403 });
    }
    if (!["APPROVED", "PUBLISHED"].includes(sop.status)) {
      return NextResponse.json({ error: "Only approved or published SOPs can be withdrawn" }, { status: 400 });
    }

    await db.sOP.update({ where: { id }, data: { status: "DRAFT" } });
    await db.activity.create({
      data: { sopId: id, userId: session.user.id, action: "withdrawn", description: `Withdrawn to draft: ${sop.title}` },
    });
    return NextResponse.json({ success: true, status: "DRAFT" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
