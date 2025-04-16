import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectTeamMembers, employees, users } from "@/lib/db/schema";
import { eq, and, not } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/projects/[projectId]/team-members/[id] - Get a specific team member
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, id } = await params;

    const [teamMember] = await db
      .select({
        id: projectTeamMembers.id,
        employeeId: projectTeamMembers.employeeId,
        role: projectTeamMembers.role,
        allocationPercentage: projectTeamMembers.allocationPercentage,
        startDate: projectTeamMembers.startDate,
        endDate: projectTeamMembers.endDate,
        employeeName: users.name,
        employeeLastName: users.lastName,
      })
      .from(projectTeamMembers)
      .where(
        and(
          eq(projectTeamMembers.id, id),
          eq(projectTeamMembers.projectId, projectId),
          not(eq(projectTeamMembers.isDeleted, true))
        )
      )
      .leftJoin(employees, eq(projectTeamMembers.employeeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id));

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: teamMember.id,
      employeeId: teamMember.employeeId,
      name: `${teamMember.employeeName} ${teamMember.employeeLastName}`,
      role: teamMember.role,
      allocationPercentage: teamMember.allocationPercentage,
      startDate: teamMember.startDate,
      endDate: teamMember.endDate,
    });
  } catch (error) {
    console.error("Error fetching team member:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[projectId]/team-members/[id] - Update a team member
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, id } = await params;
    const { role, allocationPercentage, startDate, endDate } = await req.json();

    // Verify that team member exists and belongs to the project
    const [existingMember] = await db
      .select({ id: projectTeamMembers.id })
      .from(projectTeamMembers)
      .where(
        and(
          eq(projectTeamMembers.id, id),
          eq(projectTeamMembers.projectId, projectId),
          not(eq(projectTeamMembers.isDeleted, true))
        )
      );

    if (!existingMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Update team member
    await db
      .update(projectTeamMembers)
      .set({
        role: role,
        allocationPercentage: allocationPercentage,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(projectTeamMembers.id, id));

    // Get updated team member data
    const [updatedMember] = await db
      .select({
        id: projectTeamMembers.id,
        employeeId: projectTeamMembers.employeeId,
        role: projectTeamMembers.role,
        allocationPercentage: projectTeamMembers.allocationPercentage,
        startDate: projectTeamMembers.startDate,
        endDate: projectTeamMembers.endDate,
        employeeName: users.name,
        employeeLastName: users.lastName,
      })
      .from(projectTeamMembers)
      .where(eq(projectTeamMembers.id, id))
      .leftJoin(employees, eq(projectTeamMembers.employeeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id));

    return NextResponse.json({
      id: updatedMember.id,
      employeeId: updatedMember.employeeId,
      name: `${updatedMember.employeeName} ${updatedMember.employeeLastName}`,
      role: updatedMember.role,
      allocationPercentage: updatedMember.allocationPercentage,
      startDate: updatedMember.startDate,
      endDate: updatedMember.endDate,
    });
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/team-members/[id] - Remove a team member (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, id } = await params;

    // Verify that team member exists and belongs to the project
    const [existingMember] = await db
      .select({ id: projectTeamMembers.id })
      .from(projectTeamMembers)
      .where(
        and(
          eq(projectTeamMembers.id, id),
          eq(projectTeamMembers.projectId, projectId),
          not(eq(projectTeamMembers.isDeleted, true))
        )
      );

    if (!existingMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Soft delete the team member
    await db
      .update(projectTeamMembers)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(projectTeamMembers.id, id));

    return NextResponse.json({ message: "Team member removed successfully" });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
