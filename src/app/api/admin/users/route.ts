import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isAdmin(role: string) {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN";
}

// PATCH — update a user's role or department
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 404 });
  if (!isAdmin(role)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { userId, newRole, departmentId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Verify target user belongs to same org
  const target = await db.user.findFirst({ where: { id: userId, organizationId: orgId } });
  if (!target) return NextResponse.json({ error: "User not found in organization" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (newRole) data.role = newRole;
  if (departmentId !== undefined) data.departmentId = departmentId || null;

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });

  return NextResponse.json(updated);
}
