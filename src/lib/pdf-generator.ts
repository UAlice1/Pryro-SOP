import { formatDate } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface SOPExportData {
  title:               string;
  description:         string | null;
  status:              string;
  version:             number;
  createdAt:           Date;
  updatedAt:           Date;
  publishedAt?:        Date | null;
  industry?:           string | null;
  complianceFramework?: string | null;

  author:     { name: string | null };
  department: { name: string } | null;
  category:   { name: string; color?: string } | null;
  tags?:      Array<{ tag: string }>;

  documentation?: {
    objective?:                 string | null;
    scope?:                     string | null;
    detailedProcedureMarkdown?: string | null;
    safetyOrComplianceNotes?:   string | null;
  } | null;

  sections: Array<{ title: string; content: string; type?: string }>;

  workflowSteps: Array<{
    stepNumber:   number;
    title:        string;
    description:  string | null;
    role?:        string | null;
    duration?:    string | null;
    phase?:       string | null;
  }>;

  checklistItems: Array<{
    text:          string;
    isRequired:    boolean;
    assignedRole?: string | null;
    priority?:     string | null;
  }>;

  responsibilities: Array<{
    role:             string;
    roleName?:        string | null;
    description:      string;
    coreDutySummary?: string | null;
  }>;

  resources: Array<{
    name:        string;
    type:        string | null;
    description: string | null;
  }>;

  approvals?: Array<{
    status:    string;
    updatedAt: Date;
    approver:  { name: string | null };
  }>;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}

/* ─── Main HTML generator ────────────────────────────────────────────────── */

export function generateSOPHTML(sop: SOPExportData, forPDF = false): string {
  const lastApproval = sop.approvals?.find((a) => a.status === "APPROVED");

  const tags = (sop.tags ?? []).map((t) => t.tag);

  /* Priority badge colours (inline — works in PDF too) */
  const priorityColor: Record<string, string> = {
    High:   "background:#fee2e2;color:#991b1b",
    Medium: "background:#fef9c3;color:#854d0e",
    Low:    "background:#dbeafe;color:#1e40af",
  };

  const pdfExtras = forPDF ? `
    .header { page-break-after: avoid; }
    h2, h3 { page-break-after: avoid; }
    .step, .checklist-item, tr { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  ` : "";

  /* ── HTML template ─────────────────────────────────────────── */
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(sop.title)}</title>
<style>
  *  { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 860px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.65; font-size: 14px; }

  /* ── Header ── */
  .header      { border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 28px; }
  .brand-row   { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .brand-badge { background: #1e293b; color: white; padding: 5px 12px; border-radius: 6px; font-weight: 700; font-size: 12px; letter-spacing: .5px; }
  .tag-pill    { background: #f1f5f9; color: #475569; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; border: 1px solid #e2e8f0; }
  .badge       { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .header h1   { font-size: 26px; margin: 0 0 6px; color: #0f172a; line-height: 1.3; }
  .desc        { color: #64748b; margin: 0; font-size: 13px; }

  /* ── Meta grid ── */
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
  .meta-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin-bottom: 2px; }
  .meta-item p     { font-weight: 600; margin: 0; font-size: 13px; color: #1e293b; }

  /* ── Approval banner ── */
  .approval-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px; }
  .approval-banner span { font-size: 13px; color: #166534; font-weight: 500; }

  /* ── Section headings ── */
  .section-header { display: flex; align-items: center; gap: 10px; margin-top: 36px; margin-bottom: 12px; }
  .section-icon   { width: 28px; height: 28px; border-radius: 6px; background: #1e293b; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
  h2 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0; }
  h3 { font-size: 13px; font-weight: 600; color: #374151; margin: 16px 0 6px; }

  /* ── Prose ── */
  p    { color: #374151; margin: 6px 0; }
  ul, ol { color: #374151; padding-left: 20px; margin: 8px 0; }
  li   { margin-bottom: 4px; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 12px; }

  /* ── Documentation box ── */
  .doc-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; background: #fafafa; }
  .doc-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; font-weight: 600; margin-bottom: 6px; }

  /* ── Workflow steps ── */
  .step         { display: flex; gap: 14px; padding: 14px; background: #f8fafc; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0; }
  .step-num     { width: 32px; height: 32px; min-width: 32px; background: #1e293b; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
  .step-title   { font-size: 14px; font-weight: 600; color: #1e293b; }
  .step-desc    { margin: 4px 0 0; font-size: 13px; color: #374151; }
  .step-meta    { margin-top: 6px; font-size: 11px; color: #64748b; display: flex; gap: 10px; flex-wrap: wrap; }
  .step-badge   { background: #e2e8f0; color: #475569; padding: 1px 8px; border-radius: 10px; font-size: 11px; }
  .phase-badge  { background: #ede9fe; color: #5b21b6; padding: 1px 8px; border-radius: 10px; font-size: 11px; }

  /* ── Checklist ── */
  .checklist-item { display: flex; align-items: flex-start; gap: 10px; padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
  .checklist-item:last-child { border-bottom: none; }
  .checkbox { width: 16px; height: 16px; min-width: 16px; border: 2px solid #cbd5e1; border-radius: 3px; margin-top: 1px; }
  .req-badge { color: #ef4444; font-size: 10px; font-weight: 700; margin-left: 4px; }
  .priority-badge { padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; margin-left: 6px; }
  .role-tag { background: #f1f5f9; color: #475569; padding: 1px 7px; border-radius: 10px; font-size: 10px; margin-left: 4px; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; margin: 12px 0; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
  th    { background: #1e293b; color: white; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: .04em; }
  td    { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f8fafc; }
  .type-badge { display: inline-block; padding: 2px 8px; background: #e0f2fe; color: #0369a1; border-radius: 10px; font-size: 11px; font-weight: 500; }

  /* ── Safety block ── */
  .safety-box { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin: 8px 0; }
  .safety-box p { color: #92400e; margin: 0; }

  /* ── Divider ── */
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }

  /* ── Footer ── */
  .footer { margin-top: 48px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer span { font-size: 11px; color: #94a3b8; }

  @media print {
    body { padding: 20px; }
  }
  ${pdfExtras}
</style>
</head>
<body>

<!-- ══ HEADER ══════════════════════════════════════════════════════ -->
<div class="header">
  <div class="brand-row">
    <div class="brand-badge">Pryro SOP</div>
    <span class="badge" style="background:#dcfce7;color:#166534;">v${sop.version}</span>
    <span class="badge" style="background:#e0f2fe;color:#0369a1;">${esc(sop.status)}</span>
    ${sop.industry            ? `<span class="tag-pill">${esc(sop.industry)}</span>` : ""}
    ${sop.complianceFramework ? `<span class="tag-pill">${esc(sop.complianceFramework)}</span>` : ""}
    ${tags.map((t) => `<span class="tag-pill">${esc(t)}</span>`).join("")}
  </div>
  <h1>${esc(sop.title)}</h1>
  ${sop.description ? `<p class="desc">${esc(sop.description)}</p>` : ""}
</div>

<!-- ══ META GRID ═══════════════════════════════════════════════════ -->
<div class="meta-grid">
  <div class="meta-item"><label>Author</label><p>${esc(sop.author.name ?? "—")}</p></div>
  <div class="meta-item"><label>Department</label><p>${esc(sop.department?.name ?? "—")}</p></div>
  <div class="meta-item"><label>Category</label><p>${esc(sop.category?.name ?? "—")}</p></div>
  <div class="meta-item"><label>Created</label><p>${formatDate(sop.createdAt)}</p></div>
  <div class="meta-item"><label>Last Updated</label><p>${formatDate(sop.updatedAt)}</p></div>
  <div class="meta-item"><label>Version</label><p>${sop.version}</p></div>
  ${lastApproval ? `<div class="meta-item"><label>Approved By</label><p>${esc(lastApproval.approver.name ?? "—")}</p></div>` : ""}
  ${lastApproval ? `<div class="meta-item"><label>Approval Date</label><p>${formatDate(lastApproval.updatedAt)}</p></div>` : ""}
  ${sop.publishedAt ? `<div class="meta-item"><label>Published</label><p>${formatDate(sop.publishedAt)}</p></div>` : ""}
</div>

${lastApproval ? `
<div class="approval-banner">
  <span>Approved by <strong>${esc(lastApproval.approver.name ?? "—")}</strong> on ${formatDate(lastApproval.updatedAt)}</span>
</div>` : ""}

<!-- ══ DOCUMENTATION (AI-generated objective / scope / procedure) ══ -->
${sop.documentation ? (() => {
  const d = sop.documentation!;
  const parts: string[] = [];

  if (d.objective) {
    parts.push(`
<div class="section-header"><div class="section-icon">OBJ</div><h2>Objective</h2></div>
<div class="doc-box"><p>${esc(d.objective)}</p></div>`);
  }

  if (d.scope) {
    parts.push(`
<div class="section-header"><div class="section-icon">SCP</div><h2>Scope</h2></div>
<div class="doc-box"><p>${esc(d.scope)}</p></div>`);
  }

  if (d.safetyOrComplianceNotes) {
    parts.push(`
<div class="section-header"><div class="section-icon">SAF</div><h2>Safety &amp; Compliance</h2></div>
<div class="safety-box"><p>${esc(d.safetyOrComplianceNotes)}</p></div>`);
  }

  if (d.detailedProcedureMarkdown) {
    parts.push(`
<div class="section-header"><div class="section-icon">DOC</div><h2>Detailed Procedure</h2></div>
<div class="doc-box">${renderMarkdown(d.detailedProcedureMarkdown)}</div>`);
  }

  return parts.join("\n");
})() : ""}

<!-- ══ CUSTOM SECTIONS ══════════════════════════════════════════════ -->
${sop.sections.length > 0 ? sop.sections.map((s) => {
  const isSafety = s.type === "safety";
  return `
<div class="section-header"><div class="section-icon">SEC</div><h2>${esc(s.title)}</h2></div>
${isSafety
  ? `<div class="safety-box"><p>${esc(s.content).replace(/\n/g, "<br/>")}</p></div>`
  : `<div class="doc-box"><p>${esc(s.content).replace(/\n/g, "<br/>")}</p></div>`}`;
}).join("\n") : ""}

<!-- ══ WORKFLOW STEPS ═══════════════════════════════════════════════ -->
${sop.workflowSteps.length > 0 ? `
<div class="section-header"><div class="section-icon">WF</div><h2>Workflow Steps</h2></div>
${sop.workflowSteps.map((step) => `
<div class="step">
  <div class="step-num">${step.stepNumber}</div>
  <div style="flex:1;min-width:0;">
    <div class="step-title">${esc(step.title)}</div>
    ${step.description ? `<p class="step-desc">${esc(step.description)}</p>` : ""}
    <div class="step-meta">
      ${step.phase    ? `<span class="phase-badge">${esc(step.phase)}</span>` : ""}
      ${step.role     ? `<span class="step-badge">${esc(step.role)}</span>` : ""}
      ${step.duration ? `<span class="step-badge">${esc(step.duration)}</span>` : ""}
    </div>
  </div>
</div>`).join("")}` : ""}

<!-- ══ CHECKLIST ════════════════════════════════════════════════════ -->
${sop.checklistItems.length > 0 ? `
<div class="section-header"><div class="section-icon">CL</div><h2>Checklist</h2></div>
<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
${sop.checklistItems.map((item) => {
  const pStyle = item.priority ? priorityColor[item.priority] ?? "" : "";
  return `<div class="checklist-item">
  <div class="checkbox"></div>
  <div style="flex:1;">
    <span>${esc(item.text)}</span>
    ${item.isRequired      ? '<span class="req-badge">REQUIRED</span>'                                                          : ""}
    ${item.priority        ? `<span class="priority-badge" style="${pStyle}">${esc(item.priority)}</span>`                      : ""}
    ${item.assignedRole    ? `<span class="role-tag">${esc(item.assignedRole)}</span>`                                           : ""}
  </div>
</div>`;
}).join("")}
</div>` : ""}

<!-- ══ RESPONSIBILITIES ══════════════════════════════════════════════ -->
${sop.responsibilities.length > 0 ? `
<div class="section-header"><div class="section-icon">RL</div><h2>Roles &amp; Responsibilities</h2></div>
<table>
  <thead><tr><th style="width:28%">Role</th><th>Responsibilities</th></tr></thead>
  <tbody>
    ${sop.responsibilities.map((r) => `
    <tr>
      <td><strong>${esc(r.roleName ?? r.role)}</strong></td>
      <td>${esc(r.coreDutySummary ?? r.description)}</td>
    </tr>`).join("")}
  </tbody>
</table>` : ""}

<!-- ══ RESOURCES ════════════════════════════════════════════════════ -->
${sop.resources.length > 0 ? `
<div class="section-header"><div class="section-icon">RS</div><h2>Required Resources</h2></div>
<table>
  <thead><tr><th style="width:35%">Resource</th><th style="width:18%">Type</th><th>Description</th></tr></thead>
  <tbody>
    ${sop.resources.map((r) => `
    <tr>
      <td><strong>${esc(r.name)}</strong></td>
      <td>${r.type ? `<span class="type-badge">${esc(r.type)}</span>` : "—"}</td>
      <td>${esc(r.description ?? "—")}</td>
    </tr>`).join("")}
  </tbody>
</table>` : ""}

<hr/>

<div class="footer">
  <span>Generated by Pryro SOP &nbsp;·&nbsp; ${formatDate(new Date())}</span>
  <span>${esc(sop.title)} &nbsp;·&nbsp; Version ${sop.version}</span>
</div>

</body>
</html>`;
}

/* ─── Markdown helpers ───────────────────────────────────────────────────── */
function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { html.push("</ul>"); inUl = false; }
    if (inOl) { html.push("</ol>"); inOl = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) { closeList(); continue; }

    if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3>${esc(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ") || line.startsWith("# ")) {
      closeList();
      const text = line.startsWith("## ") ? line.slice(3) : line.slice(2);
      html.push(`<h3>${esc(text)}</h3>`);
    } else if (/^[-*] /.test(line)) {
      if (inOl) { html.push("</ol>"); inOl = false; }
      if (!inUl) { html.push("<ul>"); inUl = true; }
      html.push(`<li>${mdInline(line.slice(2))}</li>`);
    } else if (/^\d+\. /.test(line)) {
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (!inOl) { html.push("<ol>"); inOl = true; }
      html.push(`<li>${mdInline(line.replace(/^\d+\. /, ""))}</li>`);
    } else {
      closeList();
      html.push(`<p>${mdInline(line)}</p>`);
    }
  }
  closeList();
  return html.join("\n");
}

function mdInline(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`(.+?)`/g,       "<code>$1</code>");
}
