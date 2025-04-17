import { NextRequest, NextResponse } from "next/server";
import { addClientInteraction, getClientById } from "@/lib/actions/clients";
import { tryCatch } from "@/lib/error-handler";
import { auth } from "@/lib/auth";

// GET /api/clients/[id]/interactions - Get interactions for a specific client
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const client = await tryCatch(() => getClientById(id), {
      customErrorMessage: "Failed to fetch client data",
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client.interactions || []);
  } catch (error) {
    console.error("Error fetching client interactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch client interactions" },
      { status: 500 }
    );
  }
}

// POST /api/clients/[id]/interactions - Add a new interaction to a client
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const data = await req.json();
    const interactionId = await tryCatch(
      () =>
        addClientInteraction(id, {
          contactId: data.contactId,
          type: data.type,
          summary: data.summary,
          details: data.details,
          followUpDate: data.followUpDate,
          followUpNotes: data.followUpNotes,
        }),
      {
        customErrorMessage: "Failed to add interaction",
      }
    );

    const updatedClient = await getClientById(id);
    const newInteraction = updatedClient?.interactions.find(
      (interaction) => interaction.id === interactionId
    );

    return NextResponse.json(newInteraction);
  } catch (error) {
    console.error("Error adding client interaction:", error);
    return NextResponse.json(
      { error: "Failed to add client interaction" },
      { status: 500 }
    );
  }
}
