import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reorderTasksInColumn } from "@/lib/db/kanban-order";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { TaskReorderInput, TaskStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { validateSession } from "@/lib/permission-handler";

// POST /api/projects/[projectId]/tasks/reorder - Reorder tasks within a column
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  if (!(await validateSession("project", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { projectId } = await params;
    const body: TaskReorderInput = await req.json();
    const { status, taskIds } = body;

    // Validate the request
    if (
      !status ||
      !taskIds ||
      !Array.isArray(taskIds) ||
      taskIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // Update the order of tasks in the column
    await reorderTasksInColumn(projectId, status as TaskStatus, taskIds);

    // Revalidate relevant paths
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/tasks`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering tasks:", error);
    return NextResponse.json(
      { error: "Failed to reorder tasks" },
      { status: 500 }
    );
  }
}
