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
import { eq, and, desc, count, inArray } from "drizzle-orm";
import { headers } from "next/headers";

export async function getClients() {
  // Get all non-deleted clients with related data
  const results = await db
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
    .where(eq(clients.isDeleted, false));

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
  return results.map((client) => ({
    ...client,
    projectCount: projectCountMap.get(client.id) || 0,
  }));
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
    projects: clientProjects,
    interactions,
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

export async function createClient(data: {
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  accountManagerId?: string;
}) {
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

export async function updateClient(
  id: string,
  data: {
    name: string;
    industry?: string;
    website?: string;
    address?: string;
    accountManagerId?: string;
  }
) {
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
  data: {
    firstName: string;
    lastName: string;
    position?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
  }
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
  data: {
    contactId?: string;
    type: string;
    summary: string;
    details?: string;
    followUpDate?: string;
    followUpNotes?: string;
  }
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
