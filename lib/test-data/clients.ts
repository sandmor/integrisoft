import * as schema from "../db/schema";
import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Generate clients
export async function generateClients(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  employeeIds: string[],
  userIds: string[],
  count: number
): Promise<string[]> {
  const clientIds: string[] = [];

  // Define possible industries
  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Manufacturing",
    "Retail",
    "Education",
    "Entertainment",
    "Hospitality",
    "Construction",
    "Energy",
    "Transportation",
    "Real Estate",
    "Telecommunications",
    "Consulting",
    "Legal Services",
  ];

  // Find employees in sales department or with account management roles
  const employees = await tx.query.employees.findMany({
    with: {
      positions: true,
      departments: true,
    },
  });

  const accountManagers = employees.filter(
    (emp) =>
      (emp.positions?.title?.toLowerCase().includes("account") &&
        emp.positions?.title?.toLowerCase().includes("manager")) ||
      (emp.positions?.title?.toLowerCase().includes("client") &&
        emp.positions?.title?.toLowerCase().includes("success")) ||
      (emp.positions?.title?.toLowerCase().includes("sales") &&
        emp.positions?.title?.toLowerCase().includes("representative")) ||
      emp.departments?.name === "Sales"
  );

  // If no suitable account managers, use any employee
  const potentialManagers =
    accountManagers.length > 0 ? accountManagers : employees;

  for (let i = 0; i < count; i++) {
    const clientId = createId();
    const industry = industries[Math.floor(Math.random() * industries.length)];

    // Random account manager
    const accountManagerId =
      potentialManagers[Math.floor(Math.random() * potentialManagers.length)]
        .id;

    // Random creator
    const createdById = userIds[Math.floor(Math.random() * userIds.length)];

    const companyName = faker.company.name();

    await tx
      .insert(schema.clients)
      .values({
        id: clientId,
        name: companyName,
        industry: industry,
        website: `https://www.${companyName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")}.com`,
        address: faker.location.streetAddress({ useFullAddress: true }),
        accountManagerId: accountManagerId,
        createdById: createdById,
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent({ days: 30 }),
        isDeleted: false,
      })
      .execute();

    clientIds.push(clientId);
  }

  return clientIds;
}

// Generate client contacts
export async function generateClientContacts(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  clientIds: string[]
): Promise<string[]> {
  const clientContactIds: string[] = [];

  // Realistic job positions for client contacts
  const positions = [
    "CEO",
    "CTO",
    "CFO",
    "COO",
    "Project Manager",
    "IT Director",
    "VP of Engineering",
    "VP of Operations",
    "VP of Sales",
    "Technical Lead",
    "Product Owner",
    "Head of IT",
    "Director of Marketing",
    "Procurement Manager",
    "Office Manager",
    "HR Director",
    "Department Head",
  ];

  // For each client, create 1-5 contacts
  for (const clientId of clientIds) {
    // Get client info for contextual generation
    const client = await tx.query.clients.findFirst({
      where: eq(schema.clients.id, clientId),
    });

    const contactCount = 1 + Math.floor(Math.random() * 5);

    // First contact is always primary
    for (let i = 0; i < contactCount; i++) {
      const isPrimary = i === 0;
      const position = positions[Math.floor(Math.random() * positions.length)];
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const contactId = createId();

      // Format email as firstname.lastname@company.com
      const companyDomain = client?.website
        ? client.website.replace(/^https?:\/\/www\./, "").replace(/\/$/, "")
        : `${client?.name?.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;

      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyDomain}`;

      await tx
        .insert(schema.clientContacts)
        .values({
          id: contactId,
          clientId: clientId,
          firstName: firstName,
          lastName: lastName,
          position: position,
          email: email,
          phone: faker.phone.number(),
          isPrimary: isPrimary,
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent({ days: 14 }),
          isDeleted: false,
        })
        .execute();

      clientContactIds.push(contactId);
    }
  }

  return clientContactIds;
}

// Generate client interactions
export async function generateClientInteractions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  clientIds: string[],
  clientContactIds: string[],
  employeeIds: string[],
  userIds: string[]
) {
  // Define possible interaction types
  const interactionTypes = [
    "email",
    "call",
    "meeting",
    "video_conference",
    "site_visit",
    "demo",
    "workshop",
  ];

  // Map contacts to clients for easy lookup
  const contactsByClient: Record<string, string[]> = {};
  for (const contactId of clientContactIds) {
    const contact = await tx.query.clientContacts.findFirst({
      where: eq(schema.clientContacts.id, contactId),
    });

    if (contact && contact.clientId) {
      if (!contactsByClient[contact.clientId]) {
        contactsByClient[contact.clientId] = [];
      }
      contactsByClient[contact.clientId].push(contactId);
    }
  }

  // For each client, generate 3-15 interactions
  for (const clientId of clientIds) {
    // Get client info
    const client = await tx.query.clients.findFirst({
      where: eq(schema.clients.id, clientId),
    });

    // Get account manager
    const accountManagerId = client?.accountManagerId;

    // Get client contacts
    const clientContacts = contactsByClient[clientId] || [];

    // Generate 3-15 interactions
    const interactionCount = 3 + Math.floor(Math.random() * 13);

    for (let i = 0; i < interactionCount; i++) {
      const type =
        interactionTypes[Math.floor(Math.random() * interactionTypes.length)];

      // Use account manager for most interactions, but sometimes other employees
      const useAccountManager = Math.random() < 0.7;
      const employeeId =
        useAccountManager && accountManagerId
          ? accountManagerId
          : employeeIds[Math.floor(Math.random() * employeeIds.length)];

      // Use a random contact if available
      const contactId =
        clientContacts.length > 0
          ? clientContacts[Math.floor(Math.random() * clientContacts.length)]
          : undefined;

      // Random creator
      const randomUser = userIds[Math.floor(Math.random() * userIds.length)];

      // Generate a date in the last year, with more recent interactions being more likely
      const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 365); // Square to bias towards recent
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      // Generate summary based on type
      const summary = generateInteractionSummary(
        type,
        client?.name || "client"
      );

      // 50% chance of having follow-up
      const hasFollowUp = Math.random() < 0.5;
      const followUpDate = hasFollowUp
        ? new Date(
            date.getTime() +
              (1 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000
          ) // 1-14 days after
        : undefined;

      const followUpNotes = hasFollowUp
        ? `Follow up on ${
            [
              "pricing",
              "technical requirements",
              "implementation timeline",
              "contract terms",
              "integration options",
            ][Math.floor(Math.random() * 5)]
          }.`
        : undefined;

      await tx
        .insert(schema.clientInteractions)
        .values({
          id: createId(),
          clientId: clientId,
          contactId: contactId,
          employeeId: employeeId,
          type: type,
          date: date,
          summary: summary,
          details: generateInteractionDetails(type, summary),
          followUpDate: followUpDate,
          followUpNotes: followUpNotes,
          createdById: randomUser,
          createdAt: new Date(date.getTime() + 1000 * 60 * 10), // 10 minutes after the interaction
          updatedAt: new Date(date.getTime() + 1000 * 60 * 10),
          isDeleted: false,
        })
        .execute();
    }
  }
}

// Helper function to generate interaction summary
function generateInteractionSummary(type: string, clientName: string): string {
  switch (type) {
    case "email":
      return `Email exchange with ${clientName} regarding ${
        [
          "project status",
          "feature requests",
          "technical issues",
          "invoicing",
          "contract renewal",
        ][Math.floor(Math.random() * 5)]
      }.`;

    case "call":
      return `Phone call with ${clientName} discussing ${
        [
          "upcoming deadlines",
          "support issues",
          "project scope",
          "payment schedule",
          "service feedback",
        ][Math.floor(Math.random() * 5)]
      }.`;

    case "meeting":
      return `In-person meeting with ${clientName} to review ${
        [
          "quarterly performance",
          "project milestones",
          "strategic partnership",
          "new requirements",
          "implementation plan",
        ][Math.floor(Math.random() * 5)]
      }.`;

    case "video_conference":
      return `Video conference with ${clientName} team for ${
        [
          "sprint planning",
          "demo presentation",
          "requirements gathering",
          "technical walkthrough",
          "project kickoff",
        ][Math.floor(Math.random() * 5)]
      }.`;

    case "site_visit":
      return `On-site visit to ${clientName} to ${
        [
          "evaluate technical infrastructure",
          "meet key stakeholders",
          "perform system audit",
          "provide on-site training",
          "troubleshoot critical issues",
        ][Math.floor(Math.random() * 5)]
      }.`;

    case "demo":
      return `Product demonstration for ${clientName} showcasing ${
        [
          "new features",
          "system upgrades",
          "integration capabilities",
          "custom solutions",
          "performance improvements",
        ][Math.floor(Math.random() * 5)]
      }.`;

    case "workshop":
      return `Training workshop with ${clientName} team on ${
        [
          "system administration",
          "advanced features",
          "best practices",
          "data migration",
          "user management",
        ][Math.floor(Math.random() * 5)]
      }.`;

    default:
      return `Interaction with ${clientName} regarding business matters.`;
  }
}

// Helper function to generate interaction details
function generateInteractionDetails(type: string, summary: string): string {
  // Generate 2-5 bullet points of details
  const paragraphCount = 2 + Math.floor(Math.random() * 4);
  const paragraphs = [];

  for (let i = 0; i < paragraphCount; i++) {
    paragraphs.push(faker.lorem.paragraph());
  }

  const details = paragraphs.join("\n\n");
  const outcomes = [
    `Action items: ${faker.lorem.sentence()}`,
    `Next steps: ${faker.lorem.sentence()}`,
    `Decisions made: ${faker.lorem.sentence()}`,
  ];

  return `${details}\n\n${outcomes.join("\n")}`;
}

// Generate service level agreements (SLAs)
export async function generateSLAs(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  clientIds: string[],
  contractIds: string[],
  userIds: string[]
) {
  // Map contracts to clients for easy lookup
  const contractsByClient: Record<string, string[]> = {};
  for (const contractId of contractIds) {
    const contract = await tx.query.contracts.findFirst({
      where: eq(schema.contracts.id, contractId),
    });

    if (contract && contract.clientId) {
      if (!contractsByClient[contract.clientId]) {
        contractsByClient[contract.clientId] = [];
      }
      contractsByClient[contract.clientId].push(contractId);
    }
  }

  // For each client, generate 0-3 SLAs
  for (const clientId of clientIds) {
    // 20% chance a client has no SLAs
    if (Math.random() < 0.2) {
      continue;
    }

    // Get client info
    const client = await tx.query.clients.findFirst({
      where: eq(schema.clients.id, clientId),
    });

    // Get client contracts
    const clientContracts = contractsByClient[clientId] || [];

    // Generate 1-3 SLAs
    const slaCount = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < slaCount; i++) {
      // If client has contracts, link to one of them
      const contractId =
        clientContracts.length > 0
          ? clientContracts[Math.floor(Math.random() * clientContracts.length)]
          : undefined;

      // Random user as creator
      const randomUser = userIds[Math.floor(Math.random() * userIds.length)];

      // Generate SLA titles based on index
      let title;
      if (i === 0) {
        title = "Standard Support SLA";
      } else if (i === 1) {
        title = "Premium Support SLA";
      } else {
        title = "Enterprise Support SLA";
      }

      // Higher tier SLAs have better response times and uptime guarantees
      const responseTime = 24 / (i + 1); // 24h, 12h, 8h
      const resolutionTime = 72 / (i + 1); // 72h, 36h, 24h
      const uptime = 99 + i * 0.5; // 99%, 99.5%, 99.9%

      // Start date is between 1 year ago and now
      const startDate = faker.date.between({
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        to: new Date(),
      });

      // End date is 1-3 years from start date
      const durationYears = 1 + Math.floor(Math.random() * 3);
      const endDate = new Date(
        startDate.getTime() + durationYears * 365 * 24 * 60 * 60 * 1000
      );

      await tx
        .insert(schema.serviceLevelAgreements)
        .values({
          id: createId(),
          clientId: clientId,
          contractId: contractId,
          title: title,
          description: generateSLADescription(title, client?.name || "Client"),
          responseTimeHours: responseTime.toString(),
          resolutionTimeHours: resolutionTime.toString(),
          uptimePercentage: uptime.toString(),
          startDate: startDate,
          endDate: endDate,
          createdById: randomUser,
          createdAt: startDate,
          updatedAt: startDate,
          isDeleted: false,
        })
        .execute();
    }
  }
}

// Helper function to generate SLA descriptions
function generateSLADescription(title: string, clientName: string): string {
  let description;

  if (title.includes("Standard")) {
    description = `Standard support level agreement for ${clientName}, providing business hours support with reasonable response and resolution times.`;
  } else if (title.includes("Premium")) {
    description = `Enhanced support level agreement for ${clientName}, providing extended hours support with faster response and resolution times.`;
  } else {
    description = `Comprehensive 24/7 support level agreement for ${clientName}, providing maximum support coverage with fastest response and resolution times and highest uptime guarantees.`;
  }

  return description;
}

// Generate contracts
export async function generateContracts(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  clientIds: string[],
  projectIds: string[],
  userIds: string[]
): Promise<string[]> {
  const contractIds: string[] = [];

  // Contract statuses in increasing order of project development
  const contractStatuses = [
    "draft",
    "review",
    "approved",
    "active",
    "completed",
    "terminated",
  ];

  // Map projects to clients for easy lookup
  const projectsByClient: Record<string, string[]> = {};
  for (const projectId of projectIds) {
    const project = await tx.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });

    if (project && project.clientId) {
      if (!projectsByClient[project.clientId]) {
        projectsByClient[project.clientId] = [];
      }
      projectsByClient[project.clientId].push(projectId);
    }
  }

  // Create contracts for clients
  for (const clientId of clientIds) {
    // Get client info
    const client = await tx.query.clients.findFirst({
      where: eq(schema.clients.id, clientId),
    });

    // Get client projects
    const clientProjects = projectsByClient[clientId] || [];

    // Determine how many contracts to create (1-3)
    const contractCount =
      1 +
      Math.floor(
        Math.random() *
          (clientProjects.length ? Math.min(clientProjects.length, 3) : 2)
      );

    for (let i = 0; i < contractCount; i++) {
      // Random status
      const status =
        contractStatuses[Math.floor(Math.random() * contractStatuses.length)];

      // Link to a project if available
      const projectId =
        clientProjects.length > 0
          ? clientProjects[i % clientProjects.length]
          : undefined;

      // Random user as creator
      const randomUser = userIds[Math.floor(Math.random() * userIds.length)];

      // Contract start date
      const startDate = faker.date.between({
        from: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000), // Up to 2 years ago
        to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Up to 1 month in the future
      });

      // Contract duration (6 months to 3 years)
      const durationMonths = 6 + Math.floor(Math.random() * 30);
      const endDate = new Date(
        startDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000
      );

      // Contract value (10k to 1M)
      const value = Math.round(10000 + Math.random() * 990000);

      // Contract title
      let title;
      if (projectId) {
        const project = await tx.query.projects.findFirst({
          where: eq(schema.projects.id, projectId),
        });
        title = `${project?.name || "Project"} Services Agreement`;
      } else {
        title = `${client?.name || "Client"} Services Agreement`;
      }

      const contractId = createId();

      await tx
        .insert(schema.contracts)
        .values({
          id: contractId,
          clientId: clientId,
          projectId: projectId,
          title: title,
          description: `Service agreement for ${
            client?.name || "Client"
          } covering ${
            projectId ? "project-specific" : "general"
          } services and deliverables.`,
          startDate: startDate,
          endDate: endDate,
          value: value.toString(),
          termsAndConditions: generateContractTerms(),
          status: status,
          createdById: randomUser,
          createdAt: new Date(startDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks before start
          updatedAt: new Date(),
          isDeleted: false,
        })
        .execute();

      contractIds.push(contractId);
    }
  }

  return contractIds;
}

// Helper function to generate contract terms
function generateContractTerms(): string {
  return `
# Terms and Conditions

## 1. Services
The Service Provider agrees to provide the services as outlined in the Statement of Work attached to this agreement.

## 2. Term
This agreement shall commence on the Start Date and continue until the End Date, unless terminated earlier per the terms of this agreement.

## 3. Payment Terms
- Invoices will be issued ${
    ["monthly", "quarterly", "upon milestone completion"][
      Math.floor(Math.random() * 3)
    ]
  }.
- Payment is due within ${
    [15, 30, 45][Math.floor(Math.random() * 3)]
  } days of invoice date.
- Late payments are subject to a ${
    [1.5, 2, 2.5][Math.floor(Math.random() * 3)]
  }% monthly interest charge.

## 4. Intellectual Property
All intellectual property created during the provision of services shall ${
    Math.random() > 0.5
      ? "be assigned to the Client upon full payment"
      : "remain the property of the Service Provider with a perpetual license granted to the Client"
  }.

## 5. Confidentiality
Both parties agree to maintain the confidentiality of any proprietary information shared during the course of this agreement.

## 6. Termination
Either party may terminate this agreement with ${
    [30, 60, 90][Math.floor(Math.random() * 3)]
  } days written notice.

## 7. Limitation of Liability
The Service Provider's liability shall be limited to the total value of this contract.

## 8. Governing Law
This agreement shall be governed by the laws of ${faker.location.state()}.
`;
}
