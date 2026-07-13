import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/tags
 * Returns all tags for the current user's organization.
 * Used to power autocomplete in the tag editor.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json([]);

  const tags = await db.tag.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return NextResponse.json(tags);
}

/**
 * DELETE /api/tags/:name
 * Rename a tag across all SOPs (org-scoped).
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const canManage = userRole === "SUPER_ADMIN" || userRole === "ORG_ADMIN" || userRole === "MANAGER";
  if (!canManage) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "User has no organization" }, { status: 400 });

  const { id, name } = (await req.json()) as { id: string; name: string };
  const clean = name?.trim().toLowerCase();
  if (!clean) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const tag = await db.tag.findFirst({ where: { id, organizationId: orgId } });
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  const updated = await db.tag.update({ where: { id }, data: { name: clean } });
  return NextResponse.json(updated);
}
