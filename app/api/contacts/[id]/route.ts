import { NextRequest, NextResponse } from "next/server";
import { deleteClientContact } from "@/lib/actions/clients";
import { tryCatch } from "@/lib/error-handler";
import { auth } from "@/lib/auth";

// DELETE /api/contacts/[id] - Delete a contact
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    await tryCatch(() => deleteClientContact(id), {
      customErrorMessage: "Failed to delete contact",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
