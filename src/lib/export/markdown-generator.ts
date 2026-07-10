import type { SOPExportData } from "@/lib/pdf-generator";
import { formatDate } from "@/lib/utils";

/**
 * Compiles a full SOP data object into a clean, structured Markdown string.
 * Covers: Title block, Documentation, Workflow, Checklist, Responsibilities, Resources.
 */
export function generateSOPMarkdown(sop: SOPExportData): string {
  const lines: string[] = [];

  /* ── Title & meta ─────────────────────────────────────────────── */
  lines.push(`# ${sop.title}`);
  lines.push("");
  if (sop.description) {
    lines.push(`> ${sop.description}`);
    lines.push("");
  }

  lines.push("## Metadata");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **Version** | ${sop.version} |`);
  lines.push(`| **Status** | ${sop.status} |`);
  lines.push(`| **Author** | ${sop.author.name ?? "—"} |`);
  if (sop.department)          lines.push(`| **Department** | ${sop.department.name} |`);
  if (sop.category)            lines.push(`| **Category** | ${sop.category.name} |`);
  if (sop.industry)            lines.push(`| **Industry** | ${sop.industry} |`);
  if (sop.complianceFramework) lines.push(`| **Compliance** | ${sop.complianceFramework} |`);
  lines.push(`| **Created** | ${formatDate(sop.createdAt)} |`);
  lines.push(`| **Last Updated** | ${formatDate(sop.updatedAt)} |`);
  if (sop.publishedAt)         lines.push(`| **Published** | ${formatDate(sop.publishedAt)} |`);

  const lastApproval = sop.approvals?.find((a) => a.status === "APPROVED");
  if (lastApproval) {
    lines.push(`| **Approved By** | ${lastApproval.approver.name ?? "—"} |`);
    lines.push(`| **Approval Date** | ${formatDate(lastApproval.updatedAt)} |`);
  }
  lines.push("");

  /* ── Tags ─────────────────────────────────────────────────────── */
  if (sop.tags && sop.tags.length > 0) {
    lines.push(`**Tags:** ${sop.tags.map((t) => `\`${t.tag}\``).join(" · ")}`);
    lines.push("");
  }

  /* ── Documentation ────────────────────────────────────────────── */
  if (sop.documentation) {
    const d = sop.documentation;

    if (d.objective) {
      lines.push("## Objective");
      lines.push("");
      lines.push(d.objective);
      lines.push("");
    }

    if (d.scope) {
      lines.push("## Scope");
      lines.push("");
      lines.push(d.scope);
      lines.push("");
    }

    if (d.safetyOrComplianceNotes) {
      lines.push("## Safety & Compliance Notes");
      lines.push("");
      lines.push("> ⚠️ " + d.safetyOrComplianceNotes.replace(/\n/g, "\n> "));
      lines.push("");
    }

    if (d.detailedProcedureMarkdown) {
      lines.push("## Detailed Procedure");
      lines.push("");
      lines.push(d.detailedProcedureMarkdown);
      lines.push("");
    }
  }

  /* ── Custom sections ──────────────────────────────────────────── */
  if (sop.sections && sop.sections.length > 0) {
    for (const section of sop.sections) {
      lines.push(`## ${section.title}`);
      lines.push("");
      lines.push(section.content);
      lines.push("");
    }
  }

  /* ── Workflow steps ───────────────────────────────────────────── */
  if (sop.workflowSteps && sop.workflowSteps.length > 0) {
    lines.push("## Workflow Steps");
    lines.push("");

    for (const step of sop.workflowSteps) {
      lines.push(`### Step ${step.stepNumber}: ${step.title}`);
      lines.push("");
      if (step.description) {
        lines.push(step.description);
        lines.push("");
      }
      const meta: string[] = [];
      if (step.phase)    meta.push(`**Phase:** ${step.phase}`);
      if (step.role)     meta.push(`**Role:** ${step.role}`);
      if (step.duration) meta.push(`**Duration:** ${step.duration}`);
      if (meta.length > 0) {
        lines.push(meta.join(" · "));
        lines.push("");
      }
    }
  }

  /* ── Checklist ────────────────────────────────────────────────── */
  if (sop.checklistItems && sop.checklistItems.length > 0) {
    lines.push("## Checklist");
    lines.push("");

    for (const item of sop.checklistItems) {
      const badges: string[] = [];
      if (item.isRequired)   badges.push("**REQUIRED**");
      if (item.priority)     badges.push(`\`${item.priority}\``);
      if (item.assignedRole) badges.push(`👤 ${item.assignedRole}`);

      const suffix = badges.length > 0 ? ` — ${badges.join(" ")}` : "";
      lines.push(`- [ ] ${item.text}${suffix}`);
    }
    lines.push("");
  }

  /* ── Responsibilities ─────────────────────────────────────────── */
  if (sop.responsibilities && sop.responsibilities.length > 0) {
    lines.push("## Roles & Responsibilities");
    lines.push("");
    lines.push("| Role | Responsibilities |");
    lines.push("|------|-----------------|");

    for (const r of sop.responsibilities) {
      const role = r.roleName ?? r.role;
      const desc = r.coreDutySummary ?? r.description;
      // Escape pipe chars inside cells
      lines.push(`| **${role.replace(/\|/g, "\\|")}** | ${desc.replace(/\|/g, "\\|")} |`);
    }
    lines.push("");
  }

  /* ── Resources ────────────────────────────────────────────────── */
  if (sop.resources && sop.resources.length > 0) {
    lines.push("## Required Resources");
    lines.push("");
    lines.push("| Resource | Type | Description |");
    lines.push("|----------|------|-------------|");

    for (const r of sop.resources) {
      const type = r.type ?? "—";
      const desc = r.description ?? "—";
      lines.push(`| **${r.name.replace(/\|/g, "\\|")}** | ${type} | ${desc.replace(/\|/g, "\\|")} |`);
    }
    lines.push("");
  }

  /* ── Footer ───────────────────────────────────────────────────── */
  lines.push("---");
  lines.push("");
  lines.push(`*Generated by Pryro SOP · ${formatDate(new Date())} · Version ${sop.version}*`);
  lines.push("");

  return lines.join("\n");
}
