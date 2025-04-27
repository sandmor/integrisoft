import { NextRequest, NextResponse } from "next/server";
import { deleteClientInteraction } from "@/lib/actions/clients";
import { tryCatch } from "@/lib/error-handler";
import { revalidatePath } from "next/cache";
import { validateSession } from "@/lib/permission-handler";

// DELETE /api/interactions/[id] - Delete an interaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("write_interactions"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    await tryCatch(() => deleteClientInteraction(id), {
      customErrorMessage: "Failed to delete interaction",
    });

    // Revalidate relevant paths
    revalidatePath("/dashboard/clients");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting interaction:", error);
    return NextResponse.json(
      { error: "Failed to delete interaction" },
      { status: 500 }
    );
  }
}
