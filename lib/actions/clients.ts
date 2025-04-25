"use server";

import { db } from "../db";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "../auth";
import {
  clients,
  clientContacts,
  clientInteractions,
  employees,
  projects,
  users,
} from "../db/schema";
import { eq, and, desc, count, inArray, ilike, asc } from "drizzle-orm";
import { headers } from "next/headers";
import {
  Client,
  GetClientsParams,
  CreateClientRequest,
  UpdateClientRequest,
  AddClientContactRequest,
  AddClientInteractionRequest,
} from "../types/clients";

export async function getClients(options?: GetClientsParams) {
  const { page = 0, pageSize = 10, sorts = [], filters = [] } = options || {};

  // Prepare filter conditions
  const filterConditions = [];

  // Always start with isDeleted = false
  filterConditions.push(eq(clients.isDeleted, false));

  // Add filter conditions for each filter
  for (const filter of filters) {
    if (filter.value && filter.value.trim() !== "") {
      switch (filter.field) {
        case "name":
          filterConditions.push(ilike(clients.name, `%${filter.value}%`));
          break;
        case "industry":
          filterConditions.push(ilike(clients.industry, `%${filter.value}%`));
          break;
        case "website":
          filterConditions.push(ilike(clients.website, `%${filter.value}%`));
          break;
        case "accountManager":
          filterConditions.push(ilike(users.name, `%${filter.value}%`));
          break;
      }
    }
  }

  // Count total matching records
  const totalCount = await db
    .select({ count: count() })
    .from(clients)
    .leftJoin(employees, eq(clients.accountManagerId, employees.id))
    .leftJoin(users, eq(employees.userId, users.id))
    .where(and(...filterConditions))
    .then((res) => Number(res[0]?.count || 0));

  // Prepare sort parameters
  const sortParams = [];

  if (sorts.length > 0) {
    for (const sort of sorts) {
      switch (sort.field) {
        case "name":
          sortParams.push(
            sort.direction === "asc" ? asc(clients.name) : desc(clients.name)
          );
          break;
        case "industry":
          sortParams.push(
            sort.direction === "asc"
              ? asc(clients.industry)
              : desc(clients.industry)
          );
          break;
        case "website":
          sortParams.push(
            sort.direction === "asc"
              ? asc(clients.website)
              : desc(clients.website)
          );
          break;
        case "accountManager":
          sortParams.push(
            sort.direction === "asc" ? asc(users.name) : desc(users.name)
          );
          break;
      }
    }
  }

  // Build the final query with filters, sorting, and pagination
  const finalQuery = db
    .select({
      id: clients.id,
      name: clients.name,
      industry: clients.industry,
      website: clients.website,
      accountManager: {
        id: employees.id,
        name: users.name,
      },
    })
    .from(clients)
    .leftJoin(employees, eq(clients.accountManagerId, employees.id))
    .leftJoin(users, eq(employees.userId, users.id))
    .where(and(...filterConditions))
    .orderBy(...sortParams)
    .limit(pageSize)
    .offset(page * pageSize);

  // Execute the query
  const results = await finalQuery;

  // Get project counts for each client
  const clientIds = results.map((client) => client.id);
  const projectCounts = await db
    .select({
      clientId: projects.clientId,
      count: count(),
    })
    .from(projects)
    .where(
      and(inArray(projects.clientId, clientIds), eq(projects.isDeleted, false))
    )
    .groupBy(projects.clientId);

  // Create a map of client ID to project count
  const projectCountMap = new Map(
    projectCounts.map((item) => [item.clientId, Number(item.count)])
  );

  // Return clients with project counts
  const data: Client[] = results.map((client) => ({
    ...client,
    projectCount: projectCountMap.get(client.id) || 0,
    status: "active" as const, // Adding required status field
  }));

  return {
    data,
    count: totalCount,
  };
}

export async function getClientById(id: string) {
  // Get the client with related data
  const client = await db
    .select({
      id: clients.id,
      name: clients.name,
      industry: clients.industry,
      website: clients.website,
      address: clients.address,
      accountManagerId: clients.accountManagerId,
      accountManager: {
        id: employees.id,
        name: users.name,
      },
    })
    .from(clients)
    .leftJoin(employees, eq(clients.accountManagerId, employees.id))
    .leftJoin(users, eq(employees.userId, users.id))
    .where(and(eq(clients.id, id), eq(clients.isDeleted, false)))
    .then((res) => res[0] || null);

  if (!client) {
    return null;
  }

  // Get the client's contacts
  const contacts = await db
    .select({
      id: clientContacts.id,
      firstName: clientContacts.firstName,
      lastName: clientContacts.lastName,
      position: clientContacts.position,
      email: clientContacts.email,
      phone: clientContacts.phone,
      isPrimary: clientContacts.isPrimary,
    })
    .from(clientContacts)
    .where(
      and(eq(clientContacts.clientId, id), eq(clientContacts.isDeleted, false))
    )
    .orderBy(clientContacts.isPrimary, clientContacts.firstName);

  // Get the client's projects
  const clientProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      startDate: projects.startDate,
      targetEndDate: projects.targetEndDate,
      manager: {
        id: employees.id,
        name: users.name,
      },
    })
    .from(projects)
    .leftJoin(employees, eq(projects.managerId, employees.id))
    .leftJoin(users, eq(employees.userId, users.id))
    .where(and(eq(projects.clientId, id), eq(projects.isDeleted, false)))
    .orderBy(projects.startDate);

  // Get the client's interactions
  const interactions = await db
    .select({
      id: clientInteractions.id,
      type: clientInteractions.type,
      date: clientInteractions.date,
      summary: clientInteractions.summary,
      details: clientInteractions.details,
      followUpDate: clientInteractions.followUpDate,
      followUpNotes: clientInteractions.followUpNotes,
      employee: {
        id: employees.id,
        name: users.name,
      },
      contact: {
        id: clientContacts.id,
        firstName: clientContacts.firstName,
        lastName: clientContacts.lastName,
      },
    })
    .from(clientInteractions)
    .leftJoin(employees, eq(clientInteractions.employeeId, employees.id))
    .leftJoin(users, eq(employees.userId, users.id))
    .leftJoin(
      clientContacts,
      eq(clientInteractions.contactId, clientContacts.id)
    )
    .where(
      and(
        eq(clientInteractions.clientId, id),
        eq(clientInteractions.isDeleted, false)
      )
    )
    .orderBy(desc(clientInteractions.date));

  // Return the client with related data
  return {
    ...client,
    contacts,
    projects: clientProjects.map((project) => ({
      ...project,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      targetEndDate: project.targetEndDate
        ? project.targetEndDate.toISOString()
        : null,
    })),
    interactions: interactions.map((interaction) => ({
      ...interaction,
      date: interaction.date.toISOString(),
      followUpDate: interaction.followUpDate
        ? interaction.followUpDate.toISOString()
        : null,
      employee: {
        ...interaction.employee,
        name: interaction.employee.name,
      },
      contact: interaction.contact
        ? {
            ...interaction.contact,
            name: `${interaction.contact.firstName} ${interaction.contact.lastName}`,
          }
        : null,
    })),
  };
}

export async function getAccountManagers() {
  // Get employees who can be account managers (e.g., with manager role)
  const managers = await db
    .select({
      id: employees.id,
      name: users.name,
    })
    .from(employees)
    .innerJoin(users, eq(employees.userId, users.id))
    .where(and(eq(employees.isDeleted, false), eq(users.isActive, true)))
    .orderBy(users.name);

  return managers;
}

export async function createClient(data: CreateClientRequest): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const id = createId();
  const timestamp = new Date();

  // Insert the new client
  await db.insert(clients).values({
    id,
    name: data.name,
    industry: data.industry || null,
    website: data.website || null,
    address: data.address || null,
    accountManagerId: data.accountManagerId || null,
    createdById: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    isDeleted: false,
  });

  return id;
}

export async function updateClient(id: string, data: UpdateClientRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Update the client
  await db
    .update(clients)
    .set({
      name: data.name,
      industry: data.industry || null,
      website: data.website || null,
      address: data.address || null,
      accountManagerId: data.accountManagerId || null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, id));

  return id;
}

export async function deleteClient(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Soft delete the client
  await db
    .update(clients)
    .set({
      isDeleted: true,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, id));

  return true;
}

export async function addClientContact(
  clientId: string,
  data: AddClientContactRequest
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const id = createId();
  const timestamp = new Date();

  // If this contact is primary, update any existing primary contacts to not be primary
  if (data.isPrimary) {
    await db
      .update(clientContacts)
      .set({ isPrimary: false })
      .where(
        and(
          eq(clientContacts.clientId, clientId),
          eq(clientContacts.isPrimary, true)
        )
      );
  }

  // Insert the new contact
  await db.insert(clientContacts).values({
    id,
    clientId,
    firstName: data.firstName,
    lastName: data.lastName,
    position: data.position || null,
    email: data.email || null,
    phone: data.phone || null,
    isPrimary: data.isPrimary || false,
    createdAt: timestamp,
    updatedAt: timestamp,
    isDeleted: false,
  });

  return id;
}

export async function deleteClientContact(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Soft delete the contact
  await db
    .update(clientContacts)
    .set({
      isDeleted: true,
      updatedAt: new Date(),
    })
    .where(eq(clientContacts.id, id));

  return true;
}

export async function addClientInteraction(
  clientId: string,
  data: AddClientInteractionRequest
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Find the employee ID associated with the current user
  const employee = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, userId))
    .then((res) => res[0]);

  if (!employee) {
    throw new Error("No employee record found for the current user");
  }

  const id = createId();
  const timestamp = new Date();

  // Insert the new interaction
  await db.insert(clientInteractions).values({
    id,
    clientId,
    contactId: data.contactId || null,
    employeeId: employee.id,
    type: data.type,
    date: timestamp,
    summary: data.summary,
    details: data.details || null,
    followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
    followUpNotes: data.followUpNotes || null,
    createdById: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    isDeleted: false,
  });

  return id;
}

export async function deleteClientInteraction(id: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Soft delete the interaction
  await db
    .update(clientInteractions)
    .set({
      isDeleted: true,
      updatedAt: new Date(),
    })
    .where(eq(clientInteractions.id, id));

  return true;
}
