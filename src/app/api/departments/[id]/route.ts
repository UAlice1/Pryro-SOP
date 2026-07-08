import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isAdmin(role: string) {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role  = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId)         return NextResponse.json({ error: "No organization" }, { status: 400 });
  if (!isAdmin(role)) return NextResponse.json({ error: "Admin only" },      { status: 403 });

  const { id } = await params;
  const { name, description } = await req.json();

  const dept = await db.department.findFirst({ where: { id, organizationId: orgId } });
  if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });

  const updated = await db.department.update({ where: { id }, data: { name, description } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role  = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId)         return NextResponse.json({ error: "No organization" }, { status: 400 });
  if (!isAdmin(role)) return NextResponse.json({ error: "Admin only" },      { status: 403 });

  const { id } = await params;
  const dept = await db.department.findFirst({ where: { id, organizationId: orgId } });
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.department.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
