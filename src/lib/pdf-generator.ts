import { formatDate } from "@/lib/utils";

export interface SOPExportData {
  title: string;
  description: string | null;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
  author: { name: string | null };
  department: { name: string } | null;
  category: { name: string; color?: string } | null;
  sections: Array<{ title: string; content: string; type?: string }>;
  workflowSteps: Array<{
    stepNumber: number;
    title: string;
    description: string | null;
    role: string | null;
    duration: string | null;
  }>;
  checklistItems: Array<{ text: string; isRequired: boolean }>;
  responsibilities: Array<{ role: string; description: string }>;
  resources: Array<{ name: string; type: string | null; description: string | null }>;
  approvals?: Array<{
    status: string;
    updatedAt: Date;
    approver: { name: string | null };
  }>;
}

export function generateSOPHTML(sop: SOPExportData, forPDF = false): string {
  const lastApproval = sop.approvals?.find((a) => a.status === "APPROVED");

  const pdfExtras = forPDF
    ? `
    /* PDF page break control */
    .header { page-break-after: avoid; }
    h2 { page-break-after: avoid; page-break-before: auto; margin-top: 28px; }
    .step { page-break-inside: avoid; }
    .checklist-item { page-break-inside: avoid; }
    tr { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    .footer { page-break-before: avoid; }
    /* Force background colors to print */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    `
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(sop.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 860px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.6; font-size: 14px; }
  .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 28px; }
  .brand { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .brand-badge { background: #3b82f6; color: white; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; }
  .version-badge { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .header h1 { font-size: 26px; margin: 0 0 6px; color: #1e40af; line-height: 1.3; }
  .header .description { color: #64748b; margin: 0; font-size: 13px; }
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
  .meta-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 2px; }
  .meta-item p { font-weight: 600; margin: 0; font-size: 13px; color: #1e293b; }
  .approval-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px; }
  .approval-banner .check { width: 20px; height: 20px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .approval-banner .check::after { content: '✓'; color: white; font-size: 12px; font-weight: 700; }
  .approval-banner span { font-size: 13px; color: #166534; font-weight: 500; }
  h2 { font-size: 15px; font-weight: 700; color: #1e293b; border-left: 4px solid #3b82f6; padding-left: 12px; margin-top: 32px; margin-bottom: 12px; }
  p { color: #374151; margin: 8px 0; }
  .step { display: flex; gap: 14px; padding: 14px; background: #f8fafc; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0; }
  .step-num { width: 32px; height: 32px; min-width: 32px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
  .step-content strong { font-size: 14px; color: #1e293b; }
  .step-content p { margin: 4px 0 0; font-size: 13px; }
  .step-meta { margin-top: 5px; font-size: 11px; color: #64748b; }
  .checklist-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .checkbox { width: 16px; height: 16px; min-width: 16px; border: 2px solid #cbd5e1; border-radius: 3px; margin-top: 1px; }
  .checklist-item span { font-size: 13px; }
  .required-badge { color: #ef4444; font-size: 10px; font-weight: 600; margin-left: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
  th { background: #1e40af; color: white; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; }
  td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f8fafc; }
  .type-badge { display: inline-block; padding: 2px 8px; background: #e0f2fe; color: #0369a1; border-radius: 10px; font-size: 11px; font-weight: 500; }
  .safety-section { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-top: 8px; }
  .safety-section p { color: #92400e; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer span { font-size: 11px; color: #94a3b8; }
  .watermark { text-align: center; margin-bottom: 6px; }
  .watermark span { font-size: 11px; color: #cbd5e1; letter-spacing: 1px; text-transform: uppercase; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none !important; }
    h2 { page-break-after: avoid; }
    .step, .checklist-item { page-break-inside: avoid; }
  }
  ${pdfExtras}
</style>
</head>
<body>

<div class="header">
  <div class="brand">
    <div class="brand-badge">Pryro SOP</div>
    <span class="version-badge">v${sop.version}</span>
    <span style="background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;">${escapeHtml(sop.status)}</span>
  </div>
  <h1>${escapeHtml(sop.title)}</h1>
  ${sop.description ? `<p class="description">${escapeHtml(sop.description)}</p>` : ""}
</div>

<div class="meta-grid">
  <div class="meta-item"><label>Author</label><p>${escapeHtml(sop.author.name ?? "—")}</p></div>
  <div class="meta-item"><label>Department</label><p>${escapeHtml(sop.department?.name ?? "—")}</p></div>
  <div class="meta-item"><label>Category</label><p>${escapeHtml(sop.category?.name ?? "—")}</p></div>
  <div class="meta-item"><label>Created</label><p>${formatDate(sop.createdAt)}</p></div>
  <div class="meta-item"><label>Last Updated</label><p>${formatDate(sop.updatedAt)}</p></div>
  <div class="meta-item"><label>Version</label><p>${sop.version}</p></div>
  ${lastApproval ? `<div class="meta-item"><label>Approved By</label><p>${escapeHtml(lastApproval.approver.name ?? "—")}</p></div>` : ""}
  ${lastApproval ? `<div class="meta-item"><label>Approval Date</label><p>${formatDate(lastApproval.updatedAt)}</p></div>` : ""}
  ${sop.publishedAt ? `<div class="meta-item"><label>Published</label><p>${formatDate(sop.publishedAt)}</p></div>` : ""}
</div>

${lastApproval ? `
<div class="approval-banner">
  <div class="check"></div>
  <span>Approved by ${escapeHtml(lastApproval.approver.name ?? "—")} on ${formatDate(lastApproval.updatedAt)}</span>
</div>` : ""}

${sop.sections
  .map((s) => {
    const isSafety = s.type === "safety";
    return `<h2>${escapeHtml(s.title)}</h2>
${isSafety
  ? `<div class="safety-section"><p>${escapeHtml(s.content).replace(/\n/g, "<br/>")}</p></div>`
  : `<p>${escapeHtml(s.content).replace(/\n/g, "<br/>")}</p>`}`;
  })
  .join("\n")}

${sop.workflowSteps.length > 0 ? `
<h2>Workflow Steps</h2>
${sop.workflowSteps
  .map(
    (step) => `
<div class="step">
  <div class="step-num">${step.stepNumber}</div>
  <div class="step-content">
    <strong>${escapeHtml(step.title)}</strong>
    ${step.description ? `<p>${escapeHtml(step.description)}</p>` : ""}
    ${step.role || step.duration ? `<div class="step-meta">${[step.role, step.duration].filter((x): x is string => x !== null && x !== undefined).map(escapeHtml).join(" · ")}</div>` : ""}
  </div>
</div>`
  )
  .join("")}` : ""}

${sop.checklistItems.length > 0 ? `
<h2>Checklist</h2>
${sop.checklistItems
  .map(
    (item) => `
<div class="checklist-item">
  <div class="checkbox"></div>
  <span>${escapeHtml(item.text)}${item.isRequired ? '<span class="required-badge">REQUIRED</span>' : ""}</span>
</div>`
  )
  .join("")}` : ""}

${sop.responsibilities.length > 0 ? `
<h2>Roles &amp; Responsibilities</h2>
<table>
  <thead><tr><th>Role</th><th>Responsibilities</th></tr></thead>
  <tbody>${sop.responsibilities.map((r) => `<tr><td><strong>${escapeHtml(r.role)}</strong></td><td>${escapeHtml(r.description)}</td></tr>`).join("")}</tbody>
</table>` : ""}

${sop.resources.length > 0 ? `
<h2>Required Resources</h2>
<table>
  <thead><tr><th>Resource</th><th>Type</th><th>Description</th></tr></thead>
  <tbody>${sop.resources.map((r) => `<tr><td><strong>${escapeHtml(r.name)}</strong></td><td><span class="type-badge">${escapeHtml(r.type ?? "—")}</span></td><td>${escapeHtml(r.description ?? "—")}</td></tr>`).join("")}</tbody>
</table>` : ""}

<div class="footer">
  <span>Generated by Pryro SOP · ${formatDate(new Date())}</span>
  <span>${escapeHtml(sop.title)} · Version ${sop.version}</span>
</div>

</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
