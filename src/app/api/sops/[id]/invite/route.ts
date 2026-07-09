import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  emails: z
    .array(z.string().email("Invalid email address"))
    .min(1, "At least one email is required")
    .max(50, "Maximum 50 emails per request"),
  message: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify SOP exists and requester has access to it
  const sop = await db.sOP.findFirst({ where: { id } });
  if (!sop) {
    return NextResponse.json({ error: "SOP not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { emails } = parsed.data;
  const orgId = (session.user as { organizationId?: string }).organizationId;

  // Split emails into registered users in this org vs unknown addresses
  const existingUsers = await db.user.findMany({
    where: {
      email: { in: emails },
      ...(orgId ? { organizationId: orgId } : {}),
    },
    select: { id: true, email: true, name: true },
  });

  const foundEmails = new Set(existingUsers.map((u) => u.email));
  const unknownEmails = emails.filter((e) => !foundEmails.has(e));

  // For users already in the system — record an Acknowledgement row so they
  // get notified to review and acknowledge the SOP. Use upsert to avoid
  // duplicates for users already invited.
  const inviteResults: { email: string; status: "invited" | "already_invited" | "not_found" }[] = [];

  for (const user of existingUsers) {
    try {
      await db.acknowledgement.upsert({
        where: { sopId_userId: { sopId: id, userId: user.id } },
        create: { sopId: id, userId: user.id },
        // If already exists, update the timestamp to re-notify
        update: { acknowledgedAt: new Date() },
      });

      // Log the invite activity
      await db.activity.create({
        data: {
          sopId: id,
          userId: session.user.id,
          action: "invited",
          description: `Invited ${user.email} to acknowledge this SOP`,
          metadata: { invitedUserId: user.id, invitedEmail: user.email },
        },
      });

      inviteResults.push({ email: user.email, status: "invited" });
    } catch {
      inviteResults.push({ email: user.email, status: "already_invited" });
    }
  }

  // Unknown emails — these are people not yet in the system
  for (const email of unknownEmails) {
    inviteResults.push({ email, status: "not_found" });
  }

  return NextResponse.json({
    invited:    inviteResults.filter((r) => r.status === "invited").length,
    notFound:   unknownEmails,
    results:    inviteResults,
  });
}
