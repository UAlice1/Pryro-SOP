import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "html";

  const sop = await db.sOP.findFirst({
    where: { id, authorId: session.user.id },
    include: {
      sections: { orderBy: { order: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      checklistItems: { orderBy: { order: "asc" } },
      responsibilities: { orderBy: { order: "asc" } },
      resources: { orderBy: { order: "asc" } },
      department: true,
      category: true,
      author: { select: { name: true } },
    },
  });

  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.exportHistory.create({
    data: { sopId: id, userId: session.user.id, format, fileName: `${sop.title}.${format}` },
  });

  if (format === "html") {
    const html = generateSOPHTML(sop);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(sop.title)}.html"`,
      },
    });
  }

  return NextResponse.json({ error: "Format not supported" }, { status: 400 });
}

function generateSOPHTML(sop: {
  title: string;
  description: string | null;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string | null };
  department: { name: string } | null;
  category: { name: string } | null;
  sections: Array<{ title: string; content: string }>;
  workflowSteps: Array<{ stepNumber: number; title: string; description: string | null; role: string | null; duration: string | null }>;
  checklistItems: Array<{ text: string; isRequired: boolean }>;
  responsibilities: Array<{ role: string; description: string }>;
  resources: Array<{ name: string; type: string | null; description: string | null }>;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${sop.title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 860px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.6; }
  .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 28px; margin: 0 0 8px; color: #1e40af; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
  .meta-item { }
  .meta-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  .meta-item p { font-weight: 600; margin: 2px 0 0; }
  h2 { font-size: 16px; font-weight: 700; color: #1e293b; border-left: 4px solid #3b82f6; padding-left: 12px; margin-top: 32px; }
  p { color: #374151; margin: 8px 0; }
  .step { display: flex; gap: 16px; padding: 14px; background: #f8fafc; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0; }
  .step-num { width: 32px; height: 32px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
  .checklist-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .checkbox { width: 16px; height: 16px; border: 2px solid #cbd5e1; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #1e40af; color: white; padding: 10px 12px; text-align: left; font-size: 13px; }
  td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
    <div style="background:#3b82f6;color:white;padding:8px 16px;border-radius:6px;font-weight:700;font-size:14px;">Pryro SOP</div>
    <span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">v${sop.version}</span>
  </div>
  <h1>${sop.title}</h1>
  ${sop.description ? `<p style="color:#64748b;margin:0;">${sop.description}</p>` : ""}
</div>

<div class="meta">
  <div class="meta-item"><label>Status</label><p>${sop.status}</p></div>
  <div class="meta-item"><label>Author</label><p>${sop.author.name ?? "—"}</p></div>
  <div class="meta-item"><label>Department</label><p>${sop.department?.name ?? "—"}</p></div>
  <div class="meta-item"><label>Created</label><p>${formatDate(sop.createdAt)}</p></div>
  <div class="meta-item"><label>Last Updated</label><p>${formatDate(sop.updatedAt)}</p></div>
  <div class="meta-item"><label>Category</label><p>${sop.category?.name ?? "—"}</p></div>
</div>

${sop.sections.map((s) => `<h2>${s.title}</h2><p>${s.content.replace(/\n/g, "<br/>")}</p>`).join("")}

${sop.workflowSteps.length > 0 ? `
<h2>Workflow Steps</h2>
${sop.workflowSteps.map((step) => `
<div class="step">
  <div class="step-num">${step.stepNumber}</div>
  <div>
    <strong>${step.title}</strong>
    ${step.description ? `<p style="margin:4px 0 0;">${step.description}</p>` : ""}
    ${step.role || step.duration ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b;">${[step.role, step.duration].filter(Boolean).join(" · ")}</p>` : ""}
  </div>
</div>`).join("")}` : ""}

${sop.checklistItems.length > 0 ? `
<h2>Checklist</h2>
${sop.checklistItems.map((item) => `
<div class="checklist-item">
  <div class="checkbox"></div>
  <span>${item.text}${item.isRequired ? ' <span style="color:#ef4444;font-size:11px;">(Required)</span>' : ""}</span>
</div>`).join("")}` : ""}

${sop.responsibilities.length > 0 ? `
<h2>Roles &amp; Responsibilities</h2>
<table>
  <thead><tr><th>Role</th><th>Responsibility</th></tr></thead>
  <tbody>${sop.responsibilities.map((r) => `<tr><td><strong>${r.role}</strong></td><td>${r.description}</td></tr>`).join("")}</tbody>
</table>` : ""}

${sop.resources.length > 0 ? `
<h2>Required Resources</h2>
<table>
  <thead><tr><th>Resource</th><th>Type</th><th>Description</th></tr></thead>
  <tbody>${sop.resources.map((r) => `<tr><td>${r.name}</td><td>${r.type ?? "—"}</td><td>${r.description ?? "—"}</td></tr>`).join("")}</tbody>
</table>` : ""}

<div class="footer">
  <span>Generated by Pryro SOP · ${formatDate(new Date())}</span>
  <span>${sop.title} · Version ${sop.version}</span>
</div>
</body>
</html>`;
}
