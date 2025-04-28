import * as schema from "../db/schema";
import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Generate projects
export async function generateProjects(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  clientIds: string[],
  productIds: string[],
  employeeIds: string[],
  userIds: string[],
  count: number
): Promise<string[]> {
  const projectIds: string[] = [];

  // Define possible project statuses
  const statuses = ["planning", "active", "on_hold", "completed", "cancelled"];

  // Find project managers
  const employees = await tx.query.employees.findMany({
    with: {
      position: true,
    },
  });

  // Find suitable project managers
  const projectManagers = employees.filter((employee) => {
    if (!employee.position) return false;

    const position = employee.position as { title?: string };
    const title = position.title || "";

    return (
      title.includes("Manager") ||
      title.includes("Lead") ||
      title.includes("Director")
    );
  });

  // If no suitable managers, use any employee
  const potentialManagers =
    projectManagers.length > 0 ? projectManagers : employees;

  for (let i = 0; i < count; i++) {
    // Random client (80% of projects have clients)
    const hasClient = Math.random() < 0.8 && clientIds.length > 0;
    const clientId = hasClient
      ? clientIds[Math.floor(Math.random() * clientIds.length)]
      : undefined;

    // Random product (70% of projects are tied to a product)
    const hasProduct = Math.random() < 0.7 && productIds.length > 0;
    const productId = hasProduct
      ? productIds[Math.floor(Math.random() * productIds.length)]
      : undefined;

    // Project name
    let projectName;
    if (hasProduct && hasClient) {
      const product = await tx.query.products.findFirst({
        where: eq(schema.products.id, productId!),
      });
      const client = await tx.query.clients.findFirst({
        where: eq(schema.clients.id, clientId!),
      });

      const namePrefixes = [
        "Implementation",
        "Development",
        "Integration",
        "Migration",
        "Upgrade",
      ];
      const prefix =
        namePrefixes[Math.floor(Math.random() * namePrefixes.length)];

      projectName = `${prefix} of ${product?.name || "Product"} for ${
        client?.name || "Client"
      }`;
    } else if (hasProduct) {
      const product = await tx.query.products.findFirst({
        where: eq(schema.products.id, productId!),
      });

      const namePrefixes = [
        "Development",
        "Enhancement",
        "Research",
        "Testing",
        "Documentation",
      ];
      const prefix =
        namePrefixes[Math.floor(Math.random() * namePrefixes.length)];

      projectName = `${prefix} for ${product?.name || "Product"}`;
    } else if (hasClient) {
      const client = await tx.query.clients.findFirst({
        where: eq(schema.clients.id, clientId!),
      });

      const nameTypes = [
        "Consulting",
        "Support",
        "Training",
        "Assessment",
        "Strategy",
      ];
      const type = nameTypes[Math.floor(Math.random() * nameTypes.length)];

      projectName = `${client?.name || "Client"} ${type} Project`;
    } else {
      const nameTypes = [
        "Internal",
        "Research",
        "Infrastructure",
        "Process Improvement",
        "Training",
      ];
      const type = nameTypes[Math.floor(Math.random() * nameTypes.length)];

      projectName = `${type} Project ${faker.company.buzzNoun()}`;
    }

    // Random manager
    const managerId =
      potentialManagers[Math.floor(Math.random() * potentialManagers.length)]
        .id;

    // Random creator
    const creatorId = userIds[Math.floor(Math.random() * userIds.length)];

    // Calculate random timeline
    const now = new Date();
    let startDate: Date, targetEndDate: Date, actualEndDate: Date | undefined;
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    if (status === "planning") {
      // Future start date
      startDate = faker.date.soon({ days: 30, refDate: now });
      targetEndDate = new Date(
        startDate.getTime() +
          (30 + Math.floor(Math.random() * 180)) * 24 * 60 * 60 * 1000
      );
      actualEndDate = undefined;
    } else if (status === "active") {
      // Recently started
      startDate = faker.date.recent({ days: 60, refDate: now });
      targetEndDate = new Date(
        startDate.getTime() +
          (30 + Math.floor(Math.random() * 180)) * 24 * 60 * 60 * 1000
      );
      actualEndDate = undefined;
    } else if (status === "on_hold") {
      // Started but paused
      startDate = faker.date.recent({ days: 120, refDate: now });
      targetEndDate = new Date(
        startDate.getTime() +
          (30 + Math.floor(Math.random() * 180)) * 24 * 60 * 60 * 1000
      );
      actualEndDate = undefined;
    } else if (status === "completed") {
      // Completed in the past
      startDate = faker.date.past({ years: 1, refDate: now });
      const duration = 14 + Math.floor(Math.random() * 180); // 2 weeks to 6 months
      targetEndDate = new Date(
        startDate.getTime() + duration * 24 * 60 * 60 * 1000
      );

      // Actually finished on, before, or after target date
      const endDateVariance = Math.random();
      if (endDateVariance < 0.4) {
        // Finished early
        actualEndDate = new Date(
          targetEndDate.getTime() -
            Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000
        );
      } else if (endDateVariance < 0.8) {
        // Finished late
        actualEndDate = new Date(
          targetEndDate.getTime() +
            Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
        );
      } else {
        // Finished on time
        actualEndDate = new Date(targetEndDate);
      }
    } else {
      // cancelled
      // Started but cancelled
      startDate = faker.date.past({ years: 1, refDate: now });
      targetEndDate = new Date(
        startDate.getTime() +
          (30 + Math.floor(Math.random() * 180)) * 24 * 60 * 60 * 1000
      );
      actualEndDate = new Date(
        startDate.getTime() +
          Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      );
    }

    // Budget (5k to 500k)
    const budget =
      Math.random() < 0.9 // 90% have a budget
        ? Math.round(5000 + Math.random() * 495000)
        : undefined;

    const projectId = createId();

    await tx
      .insert(schema.projects)
      .values([
        {
          id: projectId,
          name: projectName,
          description: `${projectName}: ${faker.lorem.paragraph()}`,
          status: status as any,
          startDate: startDate,
          targetEndDate: targetEndDate,
          actualEndDate: actualEndDate,
          clientId: clientId,
          productId: productId,
          budget: budget?.toString(),
          managerId: managerId,
          createdById: creatorId,
          createdAt: new Date(
            startDate.getTime() -
              Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
          ),
          updatedAt: new Date(),
          isDeleted: false,
        },
      ])
      .execute();

    projectIds.push(projectId);
  }

  return projectIds;
}

// Generate milestones
export async function generateMilestones(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectIds: string[]
): Promise<string[]> {
  const milestoneIds: string[] = [];

  // Common milestone names by position in project lifecycle
  const milestoneTypes = [
    ["Project Kickoff", "Requirements Gathering", "Planning Phase"],
    ["Design Phase", "Architecture Review", "Development Setup"],
    ["Alpha Release", "Feature Development", "Integration Phase"],
    ["Beta Release", "QA and Testing", "Performance Optimization"],
    ["Final Review", "User Acceptance Testing", "Documentation"],
    ["Deployment", "Go Live", "Project Handover"],
  ];

  for (const projectId of projectIds) {
    // Get project info
    const project = await tx.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });

    if (!project || !project.startDate) {
      continue;
    }

    // Generate 3-6 milestones
    const milestoneCount = 3 + Math.floor(Math.random() * 4);

    // Calculate time span of the project
    const startDate = new Date(project.startDate);
    const endDate = project.targetEndDate
      ? new Date(project.targetEndDate)
      : new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);
    const projectDuration = endDate.getTime() - startDate.getTime();

    for (let i = 0; i < milestoneCount; i++) {
      // Create a milestone based on position in the project timeline
      const position = i / milestoneCount;
      const milestoneGroup = Math.floor(position * milestoneTypes.length);
      const milestoneOptions =
        milestoneTypes[Math.min(milestoneGroup, milestoneTypes.length - 1)];
      const name =
        milestoneOptions[Math.floor(Math.random() * milestoneOptions.length)];

      // Calculate due date (distribute evenly across project timeline)
      const dueOffset = position * projectDuration;
      const dueDate = new Date(startDate.getTime() + dueOffset);

      // Determine if milestone is completed based on project status and date
      let isCompleted = false;
      let completedDate = undefined;

      if (project.status === "completed") {
        // All milestones completed for completed projects
        isCompleted = true;
        completedDate = new Date(
          dueDate.getTime() + (Math.random() - 0.3) * 10 * 24 * 60 * 60 * 1000
        ); // +/- 10 days from due date
      } else if (project.status === "cancelled") {
        // Only early milestones completed for cancelled projects
        isCompleted = position < 0.5;
        if (isCompleted) {
          completedDate = new Date(
            dueDate.getTime() + (Math.random() - 0.3) * 10 * 24 * 60 * 60 * 1000
          );
        }
      } else if (dueDate < new Date()) {
        // For active/on_hold projects, complete milestones that are past due
        // 80% chance of completion for past due milestones
        isCompleted = Math.random() < 0.8;
        if (isCompleted) {
          completedDate = new Date(
            dueDate.getTime() + (Math.random() - 0.3) * 10 * 24 * 60 * 60 * 1000
          );
        }
      }

      // Description
      const description = `${name} for ${
        project.name
      }: ${faker.lorem.sentence()}`;

      const milestoneId = createId();

      await tx
        .insert(schema.milestones)
        .values([
          {
            id: milestoneId,
            projectId: projectId,
            name: name,
            description: description,
            dueDate: dueDate,
            completedDate: completedDate,
            isCompleted: isCompleted,
            createdAt: new Date(
              startDate.getTime() -
                Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000
            ),
            updatedAt: new Date(),
            isDeleted: false,
          },
        ])
        .execute();

      milestoneIds.push(milestoneId);
    }
  }

  return milestoneIds;
}

// Generate tasks
export async function generateTasks(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectIds: string[],
  milestoneIds: string[],
  employeeIds: string[],
  userIds: string[]
): Promise<string[]> {
  const taskIds: string[] = [];

  // Map milestones to their projects
  const milestonesByProject: Record<string, string[]> = {};

  for (const milestoneId of milestoneIds) {
    const milestone = await tx.query.milestones.findFirst({
      where: eq(schema.milestones.id, milestoneId),
    });

    if (milestone && milestone.projectId) {
      if (!milestonesByProject[milestone.projectId]) {
        milestonesByProject[milestone.projectId] = [];
      }
      milestonesByProject[milestone.projectId].push(milestoneId);
    }
  }

  // Common task names for software development
  const taskTemplates = {
    development: [
      "Implement feature X",
      "Create component Y",
      "Refactor module Z",
      "Fix bug with authentication",
      "Optimize database queries",
      "Add unit tests for feature X",
      "Implement API endpoint",
    ],
    design: [
      "Design UI mockup",
      "Create wireframes",
      "Review design system",
      "Update component library",
      "Design user flow",
    ],
    documentation: [
      "Update README",
      "Document API endpoints",
      "Create user guide",
      "Update technical specifications",
      "Document database schema",
    ],
    devOps: [
      "Configure CI/CD pipeline",
      "Set up monitoring",
      "Scale infrastructure",
      "Optimize build process",
      "Set up staging environment",
    ],
    qa: [
      "Test feature X",
      "Create test plan",
      "Execute regression tests",
      "Automate UI tests",
      "Performance testing",
    ],
    projectManagement: [
      "Project status meeting",
      "Client demo preparation",
      "Sprint planning",
      "Backlog refinement",
      "Resource allocation",
    ],
  };

  // All task categories
  const taskCategories = Object.keys(taskTemplates);

  // Generate 5-15 tasks for each project
  for (const projectId of projectIds) {
    // Get project info
    const project = await tx.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });

    if (!project || !project.startDate) {
      continue;
    }

    // Project-specific milestones
    const projectMilestones = milestonesByProject[projectId] || [];

    // Generate task count based on project size (budget)
    const budget = project.budget ? Number(project.budget) : 50000;
    const taskCountBase = 5 + Math.floor(budget / 20000); // 1 task per 20k budget, minimum 5
    const taskCount = Math.min(taskCountBase, 15); // Cap at 15 tasks

    // Start and end dates of project
    const projectStartDate = new Date(project.startDate);
    const projectEndDate =
      project.targetEndDate ||
      new Date(projectStartDate.getTime() + 180 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < taskCount; i++) {
      // Pick a category
      const category =
        taskCategories[Math.floor(Math.random() * taskCategories.length)];
      const templates = taskTemplates[category as keyof typeof taskTemplates];

      // Basic task title
      let title = templates[Math.floor(Math.random() * templates.length)];

      // Customize generic task titles
      if (title.includes("feature X")) {
        title = title.replace(
          "feature X",
          `${
            ["login", "dashboard", "reporting", "export", "notifications"][
              Math.floor(Math.random() * 5)
            ]
          } feature`
        );
      } else if (title.includes("component Y")) {
        title = title.replace(
          "component Y",
          `${
            ["form", "table", "modal", "chart", "navigation"][
              Math.floor(Math.random() * 5)
            ]
          } component`
        );
      } else if (title.includes("module Z")) {
        title = title.replace(
          "module Z",
          `${
            [
              "authentication",
              "user management",
              "payment",
              "data processing",
              "integration",
            ][Math.floor(Math.random() * 5)]
          } module`
        );
      }

      // Random priority (1=low, 2=medium, 3=high)
      const priority = Math.floor(Math.random() * 3) + 1;

      // Task status based on project status
      let status;
      if (project.status === "completed") {
        status = "done";
      } else if (project.status === "cancelled") {
        status =
          Math.random() > 0.3
            ? "done"
            : ["todo", "in_progress", "review"][Math.floor(Math.random() * 3)];
      } else if (project.status === "planning") {
        status = "todo";
      } else {
        status = ["todo", "in_progress", "review", "done"][
          Math.floor(Math.random() * 4)
        ];
      }

      // Associate with a milestone if available
      const milestoneId =
        projectMilestones.length > 0
          ? projectMilestones[
              Math.floor(Math.random() * projectMilestones.length)
            ]
          : undefined;

      // Calculate task dates based on project timeline
      const taskPosition = i / taskCount;
      const projectStartTime = projectStartDate.getTime();
      const projectEndTime =
        projectEndDate instanceof Date
          ? projectEndDate.getTime()
          : new Date(projectEndDate).getTime();
      const taskTimeOffset = taskPosition * (projectEndTime - projectStartTime);

      // Start date is distributed across project timeline
      const taskStartOffset = Math.max(
        0,
        taskTimeOffset - Math.random() * 30 * 24 * 60 * 60 * 1000
      );
      const startDate = new Date(projectStartDate.getTime() + taskStartOffset);

      // Due date is 1-4 weeks after start date
      const dueDate = new Date(
        startDate.getTime() +
          (7 + Math.floor(Math.random() * 21)) * 24 * 60 * 60 * 1000
      );

      // Completed date based on status
      const completedDate =
        status === "done"
          ? new Date(
              dueDate.getTime() +
                (Math.random() - 0.7) * 14 * 24 * 60 * 60 * 1000
            ) // Mostly on time or early
          : undefined;

      // Assign to an employee
      const assignedToId =
        employeeIds[Math.floor(Math.random() * employeeIds.length)];

      // Random creator
      const createdById = userIds[Math.floor(Math.random() * userIds.length)];

      // Estimate 4-40 hours
      const estimatedHours = 4 + Math.random() * 36;

      // Actual hours based on status
      const actualHours =
        status === "done"
          ? estimatedHours * (0.8 + Math.random() * 0.4) // 80% to 120% of estimate
          : status === "in_progress" || status === "review"
          ? estimatedHours * Math.random() * 0.7 // 0% to 70% of estimate
          : undefined;

      const taskId = createId();

      await tx
        .insert(schema.tasks)
        .values([
          {
            id: taskId,
            projectId: projectId,
            milestoneId: milestoneId,
            title: title,
            description: faker.lorem.paragraph(),
            status: status as "todo" | "in_progress" | "review" | "done",
            priority: priority,
            assignedToId: assignedToId,
            createdById: createdById,
            estimatedHours: estimatedHours.toString(),
            actualHours: actualHours?.toString(),
            dueDate: dueDate,
            startDate: startDate,
            completedDate: completedDate,
            createdAt: new Date(
              startDate.getTime() -
                Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000
            ),
            updatedAt: new Date(),
            isDeleted: false,
          },
        ])
        .execute();

      taskIds.push(taskId);
    }
  }

  return taskIds;
}

// Generate project team members
export async function generateProjectTeamMembers(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectIds: string[],
  employeeIds: string[]
): Promise<string[]> {
  const teamMemberIds: string[] = [];

  // Common project roles for team members
  const roles = [
    "Developer",
    "Senior Developer",
    "UI/UX Designer",
    "QA Engineer",
    "DevOps Engineer",
    "Business Analyst",
    "Database Administrator",
    "Technical Writer",
    "Product Owner",
    "Scrum Master",
    "UX Researcher",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Mobile Developer",
    "Data Scientist",
    "Security Specialist",
    "Performance Engineer",
  ];

  for (const projectId of projectIds) {
    // Get project info
    const project = await tx.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });

    if (!project || !project.startDate) {
      continue;
    }

    // Get project manager (already assigned to project)
    const managerId = project.managerId;

    // Project size determines team size
    const budget = project.budget ? Number(project.budget) : 50000;
    const teamSizeBase = 2 + Math.floor(budget / 50000); // 1 team member per 50k budget, min 2
    const teamSize = Math.min(teamSizeBase, 12); // Cap at 12 team members

    // Start with the manager as a team member
    if (managerId) {
      const managerRole = [
        "Project Manager",
        "Technical Lead",
        "Team Lead",
        "Product Manager",
      ][Math.floor(Math.random() * 4)];

      // Convert dates to strings for Drizzle compatibility
      const projectStartDate = new Date(project.startDate);
      const projectEndDate = project.actualEndDate
        ? new Date(project.actualEndDate)
        : project.targetEndDate
        ? new Date(project.targetEndDate)
        : undefined;

      await tx
        .insert(schema.projectTeamMembers)
        .values([
          {
            projectId: projectId,
            employeeId: managerId,
            role: managerRole,
            allocationPercentage: 50 + Math.floor(Math.random() * 51), // 50-100%
            startDate: projectStartDate,
            endDate: projectEndDate,
            isDeleted: false,
          },
        ])
        .execute();
    }

    // Filter out the manager from potential team members
    const potentialMembers = managerId
      ? employeeIds.filter((id) => id !== managerId)
      : employeeIds;

    // Shuffle potential members and take the required number
    const shuffledMembers = [...potentialMembers].sort(
      () => 0.5 - Math.random()
    );
    const selectedMembers = shuffledMembers.slice(0, teamSize - 1); // -1 for the manager

    // Add team members
    for (const employeeId of selectedMembers) {
      // Random role
      const role = roles[Math.floor(Math.random() * roles.length)];

      // Random allocation (20-100%)
      const allocation = 20 + Math.floor(Math.random() * 81);

      // Start date (usually same as project, but sometimes joins later)
      const startDate =
        Math.random() > 0.2
          ? new Date(project.startDate)
          : new Date(
              new Date(project.startDate).getTime() +
                Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
            );

      // End date same as project
      const endDate = project.actualEndDate
        ? new Date(project.actualEndDate)
        : project.targetEndDate
        ? new Date(project.targetEndDate)
        : undefined;

      const teamMemberId = createId();

      await tx
        .insert(schema.projectTeamMembers)
        .values([
          {
            id: teamMemberId,
            projectId: projectId,
            employeeId: employeeId,
            role: role,
            allocationPercentage: allocation,
            startDate: startDate,
            endDate: endDate,
            isDeleted: false,
          },
        ])
        .execute();

      teamMemberIds.push(teamMemberId);
    }
  }

  return teamMemberIds;
}
