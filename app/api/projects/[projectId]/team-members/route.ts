import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectTeamMembers, employees, users } from "@/lib/db/schema";
import { eq, and, not } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { TeamMember, TeamMemberCreateInput } from "@/lib/types";

// GET /api/projects/[projectId]/team-members - Get all team members for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const teamMembers = await db
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
          eq(projectTeamMembers.projectId, projectId),
          not(eq(projectTeamMembers.isDeleted, true))
        )
      )
      .leftJoin(employees, eq(projectTeamMembers.employeeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .orderBy(users.name);

    const formattedTeamMembers: TeamMember[] = teamMembers.map((member) => ({
      id: member.id,
      employeeId: member.employeeId,
      name: `${member.employeeName} ${member.employeeLastName}`,
      role: member.role,
      allocationPercentage: member.allocationPercentage,
      startDate: member.startDate ? member.startDate.toISOString() : null,
      endDate: member.endDate ? member.endDate.toISOString() : null,
    }));

    return NextResponse.json(formattedTeamMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/team-members - Add a new team member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const teamMemberInput: TeamMemberCreateInput = await req.json();
    const { employeeId, role, allocationPercentage, startDate, endDate } =
      teamMemberInput;

    if (!employeeId || !role || !allocationPercentage || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if team member already exists for this project
    const existingMember = await db
      .select({ id: projectTeamMembers.id })
      .from(projectTeamMembers)
      .where(
        and(
          eq(projectTeamMembers.projectId, projectId),
          eq(projectTeamMembers.employeeId, employeeId),
          not(eq(projectTeamMembers.isDeleted, true))
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      return NextResponse.json(
        { error: "Employee is already a team member on this project" },
        { status: 409 }
      );
    }

    const id = createId();
    const timestamp = new Date();

    await db.insert(projectTeamMembers).values({
      id,
      projectId,
      employeeId,
      role,
      allocationPercentage,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    revalidatePath(`/dashboard/projects/${projectId}`);

    // Get the new team member with employee name
    const [newMember] = await db
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

    const teamMember: TeamMember = {
      id: newMember.id,
      employeeId: newMember.employeeId,
      name: `${newMember.employeeName} ${newMember.employeeLastName}`,
      role: newMember.role,
      allocationPercentage: newMember.allocationPercentage,
      startDate: newMember.startDate ? newMember.startDate.toISOString() : null,
      endDate: newMember.endDate ? newMember.endDate.toISOString() : null,
    };

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error("Error adding team member:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
