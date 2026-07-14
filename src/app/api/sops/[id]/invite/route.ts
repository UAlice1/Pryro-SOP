import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Resend } from "resend";

const schema = z.object({
  emails: z
    .array(z.string().email("Invalid email address"))
    .min(1, "At least one email is required")
    .max(50, "Maximum 50 emails per request"),
  assignedRoleId: z.string().optional(),
  message:        z.string().max(500).optional(),
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

  const sop = await db.sOP.findFirst({
    where:   { id },
    include: { responsibilities: { orderBy: { order: "asc" } } },
  });
  if (!sop) {
    return NextResponse.json({ error: "SOP not found" }, { status: 404 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { emails, assignedRoleId } = parsed.data;

  /* Resolve the role label for email copy */
  const role = assignedRoleId
    ? sop.responsibilities.find((r: { id: string; role: string; roleName: string | null }) => r.id === assignedRoleId)
    : null;
  const roleLabel = role ? (role.roleName ?? role.role) : null;

  const appDomain =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL        ??
    "http://localhost:3000";

  const inviteResults: {
    email:  string;
    status: "invited" | "already_invited" | "not_found";
  }[] = [];

  for (const email of emails) {
    try {
      /* Upsert SOPAssignment — generates a fresh magicToken on first create */
      const assignment = await db.sOPAssignment.upsert({
        where:  { sopId_email: { sopId: id, email } },
        create: {
          sopId:          id,
          email,
          assignedRoleId: assignedRoleId ?? null,
          status:         "PENDING",
        },
        update: {
          assignedRoleId: assignedRoleId ?? null,
          status:         "PENDING",
          updatedAt:      new Date(),
        },
      });

      /* Build magic link */
      const magicLink = `${appDomain}/sops/${id}/execute?token=${assignment.magicToken}${
        assignedRoleId ? `&role=${assignedRoleId}` : ""
      }`;

      /* Send email via Resend */
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from:    process.env.RESEND_FROM_EMAIL ?? "Pryro SOP <noreply@pryro.app>",
          to:      [email],
          subject: `You've been assigned to SOP: ${sop.title}`,
          html: buildInviteEmail({
            sopTitle:  sop.title,
            roleLabel: roleLabel ?? undefined,
            magicLink,
            inviterName: (session.user as { name?: string | null }).name ?? "Your team",
          }),
        });
      }

      /* Activity log */
      await db.activity.create({
        data: {
          sopId:       id,
          userId:      session.user.id,
          action:      "invited",
          description: `Invited ${email}${roleLabel ? ` as ${roleLabel}` : ""} to SOP`,
          metadata:    { email, assignedRoleId: assignedRoleId ?? null },
        },
      });

      inviteResults.push({ email, status: "invited" });
    } catch (err) {
      console.error(`[invite] failed for ${email}:`, err);
      inviteResults.push({ email, status: "already_invited" });
    }
  }

  return NextResponse.json({
    invited:  inviteResults.filter((r) => r.status === "invited").length,
    notFound: [] as string[],
    results:  inviteResults,
  });
}

/* ── HTML email template ─────────────────────────────────────────────────── */
function buildInviteEmail(opts: {
  sopTitle:    string;
  roleLabel?:  string;
  magicLink:   string;
  inviterName: string;
}): string {
  const { sopTitle, roleLabel, magicLink, inviterName } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SOP Assignment</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1e293b;padding:24px 32px;">
            <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.5px;">Pryro SOP</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">
              You have a new SOP assignment
            </h1>

            <p style="margin:0 0 12px;font-size:14px;color:#475569;line-height:1.6;">
              <strong>${escHtml(inviterName)}</strong> has assigned you to the following Standard Operating Procedure:
            </p>

            <!-- SOP card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:20px 0;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;font-weight:600;">SOP Title</p>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b;">${escHtml(sopTitle)}</p>
                  ${roleLabel ? `
                  <p style="margin:8px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;font-weight:600;">Your Role</p>
                  <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${escHtml(roleLabel)}</p>
                  ` : ""}
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
              Click the button below to access your personalised execution checklist workspace${roleLabel ? ` for the <strong>${escHtml(roleLabel)}</strong> role` : ""}.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#1e293b;border-radius:8px;">
                  <a href="${magicLink}"
                     style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
                    Open My Execution Workspace →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
              Or copy this link into your browser:
            </p>
            <p style="margin:0;font-size:11px;color:#94a3b8;word-break:break-all;">
              ${magicLink}
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              Sent by Pryro SOP &nbsp;·&nbsp; If you believe this was sent in error, you can safely ignore this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
