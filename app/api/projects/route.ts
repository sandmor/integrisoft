import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSession } from "@/lib/permission-handler";
import { getProjectsList } from "@/lib/actions/projects";
import { ProjectCreateInput } from "@/lib/types";
import { projects } from "@/lib/db/schema";

// GET /api/projects - get all projects (with pagination, filtering, sorting)
export async function GET(request: NextRequest) {
  if (!(await validateSession("project", "read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const sorts = searchParams.getAll("sorts");
    const filters = searchParams.getAll("filters");

    return NextResponse.json(
      await getProjectsList({
        page,
        pageSize,
        sorts,
        filters,
      }),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - create a new project
export async function POST(req: NextRequest) {
  const userId = await validateSession("project", "write");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data: ProjectCreateInput = await req.json();

    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Insert project
    const [newProject] = await db
      .insert(projects)
      .values({
        name: data.name,
        description: data.description,
        status: data.status || "planning",
        startDate: data.startDate ? new Date(data.startDate) : null,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : null,
        clientId: data.clientId,
        productId: data.productId,
        budget: data.budget,
        managerId: data.managerId,
        createdById: userId,
      })
      .returning();

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
