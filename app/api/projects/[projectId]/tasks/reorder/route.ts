import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reorderTasksInColumn } from "@/lib/db/kanban-order";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";

// Schema for validation
const reorderTasksSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "done"]),
  taskIds: z.array(z.string().min(1)),
});

// POST /api/projects/[projectId]/tasks/reorder - Reorder tasks within a column
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
    const body = await req.json();

    // Validate the request body
    const result = reorderTasksSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: result.error.errors },
        { status: 400 }
      );
    }

    const { status, taskIds } = result.data;

    // Update the order of tasks in the column
    await reorderTasksInColumn(projectId, status, taskIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering tasks:", error);
    return NextResponse.json(
      { error: "Failed to reorder tasks" },
      { status: 500 }
    );
  }
}
