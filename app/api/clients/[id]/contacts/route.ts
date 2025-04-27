import { NextRequest, NextResponse } from "next/server";
import { addClientContact, getClientById } from "@/lib/actions/clients";
import { tryCatch } from "@/lib/error-handler";
import { auth } from "@/lib/auth";
import { ClientContact, AddClientContactRequest } from "@/lib/types/clients";
import { revalidatePath } from "next/cache";
import { validateSession } from "@/lib/permission-handler";

// GET /api/clients/[id]/contacts - Get contacts for a specific client
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("read_client_contacts"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const client = await tryCatch(() => getClientById(id), {
      customErrorMessage: "Failed to fetch client data",
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client.contacts || ([] as ClientContact[]));
  } catch (error) {
    console.error("Error fetching client contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch client contacts" },
      { status: 500 }
    );
  }
}

// POST /api/clients/[id]/contacts - Add a new contact to a client
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("write_client_contacts"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const data = (await req.json()) as AddClientContactRequest;
    const contactId = await tryCatch(
      () =>
        addClientContact(id, {
          firstName: data.firstName,
          lastName: data.lastName,
          position: data.position,
          email: data.email,
          phone: data.phone,
          isPrimary: data.isPrimary,
        }),
      {
        customErrorMessage: "Failed to add contact",
      }
    );

    const updatedClient = await getClientById(id);
    const newContact = updatedClient?.contacts.find(
      (contact) => contact.id === contactId
    ) as ClientContact | undefined;

    // Revalidate relevant paths
    revalidatePath("/dashboard/clients");
    revalidatePath(`/dashboard/clients/${id}`);
    revalidatePath(`/dashboard/clients/${id}/contacts`);

    return NextResponse.json(newContact);
  } catch (error) {
    console.error("Error adding client contact:", error);
    return NextResponse.json(
      { error: "Failed to add client contact" },
      { status: 500 }
    );
  }
}
