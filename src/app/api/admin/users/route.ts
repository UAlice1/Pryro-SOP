import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Permission, ASSIGNABLE_ROLES, type UserRole } from "@/lib/permissions";

// GET — list all users in the org
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role  = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const orgId = (session.user as { organizationId?: string }).organizationId;

  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
  if (!Permission.canManageOrg(role)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const users = await db.user.findMany({
    where:   { organizationId: orgId },
    orderBy: { name: "asc" },
    select:  {
      id:           true,
      name:         true,
      email:        true,
      role:         true,
      departmentId: true,
      createdAt:    true,
      image:        true,
      department:   { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(users);
}

// PATCH — update a user's role or department
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role  = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const orgId = (session.user as { organizationId?: string }).organizationId;

  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
  if (!Permission.canManageOrg(role)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { userId, newRole, departmentId } = (await req.json()) as {
    userId:       string;
    newRole?:     string;
    departmentId?: string | null;
  };

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Validate the requested role is one that can be assigned
  if (newRole && !ASSIGNABLE_ROLES.includes(newRole as UserRole)) {
    return NextResponse.json(
      { error: `Invalid role. Assignable roles: ${ASSIGNABLE_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  // ORG_ADMIN cannot promote to SUPER_ADMIN or another ORG_ADMIN
  if (newRole === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot assign SUPER_ADMIN role" }, { status: 403 });
  }

  // Verify target user belongs to the same org
  const target = await db.user.findFirst({ where: { id: userId, organizationId: orgId } });
  if (!target) return NextResponse.json({ error: "User not found in organization" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (newRole)               data.role         = newRole;
  if (departmentId !== undefined) data.departmentId = departmentId || null;

  const updated = await db.user.update({
    where:  { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });

  return NextResponse.json(updated);
}

// DELETE — remove a user from the org (does not delete the account)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role  = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const orgId = (session.user as { organizationId?: string }).organizationId;

  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
  if (!Permission.canManageOrg(role)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Cannot remove yourself
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself from the organization" }, { status: 400 });
  }

  const target = await db.user.findFirst({ where: { id: userId, organizationId: orgId } });
  if (!target) return NextResponse.json({ error: "User not found in organization" }, { status: 404 });

  // Detach from org rather than deleting the account
  await db.user.update({
    where: { id: userId },
    data:  { organizationId: null, departmentId: null, role: "EMPLOYEE" },
  });

  return NextResponse.json({ success: true });
}
