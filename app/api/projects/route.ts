import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { ProjectCreateInput } from "@/lib/types";
import { getProjectsList } from "@/lib/actions/projects";
import { validateSession } from "@/lib/permission-handler";

// GET /api/projects - List all projects with pagination, sorting, filtering
export async function GET(req: NextRequest) {
  if (!(await validateSession("read_projects"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
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

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  const userId = await validateSession("write_projects");
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
