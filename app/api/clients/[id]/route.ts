import { NextRequest, NextResponse } from "next/server";
import { getClientById } from "@/lib/actions/clients";
import { tryCatch } from "@/lib/error-handler";
import { validateSession } from "@/lib/permission-handler";
import { UpdateClientRequest } from "@/lib/types/clients";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// GET /api/clients/[id] - Get a client by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("client", "read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await tryCatch(() => getClientById(id), {
    customErrorMessage: "Failed to fetch client",
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

// PATCH /api/clients/[id] - Update a client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("client", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateClientRequest;

  // First check if client exists
  const existingClient = await tryCatch(() => getClientById(id), {
    customErrorMessage: "Failed to fetch client",
  });

  if (!existingClient) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Update the client
  await tryCatch(
    async () => {
      const timestamp = new Date();

      await db
        .update(clients)
        .set({
          ...(body.name !== undefined && { name: body.name }),
          ...(body.industry !== undefined && { industry: body.industry }),
          ...(body.website !== undefined && { website: body.website }),
          ...(body.address !== undefined && { address: body.address }),
          ...(body.accountManagerId !== undefined && {
            accountManagerId: body.accountManagerId || null,
          }),
          updatedAt: timestamp,
        })
        .where(eq(clients.id, id));

      // Revalidate related paths to ensure fresh data
      revalidatePath("/dashboard/clients");
      revalidatePath(`/dashboard/clients/${id}`);

      return id;
    },
    {
      customErrorMessage: "Failed to update client",
    }
  );

  return NextResponse.json({ id });
}

// DELETE /api/clients/[id] - Delete a client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("client", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // First check if client exists
  const existingClient = await tryCatch(() => getClientById(id), {
    customErrorMessage: "Failed to fetch client",
  });

  if (!existingClient) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Soft delete the client
  await tryCatch(
    async () => {
      const timestamp = new Date();

      await db
        .update(clients)
        .set({
          isDeleted: true,
          updatedAt: timestamp,
        })
        .where(eq(clients.id, id));

      // Revalidate related paths to ensure fresh data
      revalidatePath("/dashboard/clients");

      return true;
    },
    {
      customErrorMessage: "Failed to delete client",
    }
  );

  return NextResponse.json({ success: true });
}
