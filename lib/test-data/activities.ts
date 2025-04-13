import { db } from "@/lib/db";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Generate activities (System Logs)
export async function generateActivities(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userIds: string[],
  employeeIds: string[],
  projectIds: string[],
  productIds: string[],
  clientIds: string[]
) {
  const activityCount = 200 + Math.floor(Math.random() * 300); // Generate 200-500 activities

  // Activity type definitions with their templates
  // These templates will be used to generate realistic activities
  const activityTypes = {
    project: [
      {
        action: "Created project",
        module: "projects",
        icon: "Briefcase",
        color: "#22c55e", // green-500
        format: (data: any) => `Created new project "${data.projectName}"`,
        needsProject: true,
        priority: 2,
      },
      {
        action: "Updated project status",
        module: "projects",
        icon: "Briefcase",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Updated project "${data.projectName}" status to ${data.status}`,
        needsProject: true,
        needsStatus: true,
        priority: 1,
      },
      {
        action: "Set project milestone",
        module: "projects",
        icon: "Flag",
        color: "#8b5cf6", // violet-500
        format: (data: any) =>
          `Set milestone "${data.milestoneName}" for project "${data.projectName}"`,
        needsProject: true,
        needsMilestone: true,
        priority: 2,
      },
      {
        action: "Completed project milestone",
        module: "projects",
        icon: "CheckCircle",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `Marked milestone "${data.milestoneName}" as completed for project "${data.projectName}"`,
        needsProject: true,
        needsMilestone: true,
        priority: 3,
        tags: ["achievement", "milestone"],
      },
      {
        action: "Assigned project team member",
        module: "projects",
        icon: "UserPlus",
        color: "#f97316", // orange-500
        format: (data: any) =>
          `Assigned ${data.employeeName} to project "${data.projectName}" as ${data.role}`,
        needsProject: true,
        needsEmployee: true,
        needsRole: true,
        priority: 2,
      },
      {
        action: "Updated project budget",
        module: "projects",
        icon: "DollarSign",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Updated budget for project "${data.projectName}" to $${data.budget}`,
        needsProject: true,
        needsBudget: true,
        priority: 2,
        tags: ["budget", "finance"],
      },
      {
        action: "Extended project deadline",
        module: "projects",
        icon: "Clock",
        color: "#f59e0b", // amber-500
        format: (data: any) =>
          `Extended deadline for project "${data.projectName}" to ${data.date}`,
        needsProject: true,
        needsDate: true,
        priority: 2,
        tags: ["deadline"],
      },
      {
        action: "Project kick-off meeting",
        module: "projects",
        icon: "CalendarCheck",
        color: "#6366f1", // indigo-500
        format: (data: any) =>
          `Held kick-off meeting for project "${data.projectName}"`,
        needsProject: true,
        priority: 2,
        tags: ["meeting", "milestone"],
      },
    ],
    task: [
      {
        action: "Created task",
        module: "tasks",
        icon: "CheckSquare",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `Created task "${data.taskName}" for project "${data.projectName}"`,
        needsProject: true,
        needsTask: true,
        priority: 1,
      },
      {
        action: "Completed task",
        module: "tasks",
        icon: "CheckSquare",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `Completed task "${data.taskName}" for project "${data.projectName}"`,
        needsProject: true,
        needsTask: true,
        priority: 1,
        tags: ["completed"],
      },
      {
        action: "Assigned task",
        module: "tasks",
        icon: "UserCheck",
        color: "#f97316", // orange-500
        format: (data: any) =>
          `Assigned task "${data.taskName}" to ${data.employeeName}`,
        needsTask: true,
        needsEmployee: true,
        priority: 1,
      },
      {
        action: "Updated task status",
        module: "tasks",
        icon: "RefreshCw",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Updated task "${data.taskName}" status to "${data.status}"`,
        needsTask: true,
        needsStatus: true,
        priority: 0,
      },
      {
        action: "Task review requested",
        module: "tasks",
        icon: "Eye",
        color: "#f59e0b", // amber-500
        format: (data: any) => `Requested review for task "${data.taskName}"`,
        needsTask: true,
        priority: 2,
        tags: ["review"],
      },
      {
        action: "Task review completed",
        module: "tasks",
        icon: "CheckCircle",
        color: "#22c55e", // green-500
        format: (data: any) => `Completed review for task "${data.taskName}"`,
        needsTask: true,
        priority: 1,
      },
    ],
    client: [
      {
        action: "Added new client",
        module: "clients",
        icon: "Building2",
        color: "#22c55e", // green-500
        format: (data: any) => `Added new client "${data.clientName}"`,
        needsClient: true,
        priority: 3,
        tags: ["new-client"],
      },
      {
        action: "Updated client details",
        module: "clients",
        icon: "Edit",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Updated details for client "${data.clientName}"`,
        needsClient: true,
        priority: 1,
      },
      {
        action: "Client meeting scheduled",
        module: "clients",
        icon: "Calendar",
        color: "#6366f1", // indigo-500
        format: (data: any) =>
          `Scheduled meeting with "${data.clientName}" for ${data.date}`,
        needsClient: true,
        needsDate: true,
        priority: 2,
        tags: ["meeting"],
      },
      {
        action: "Client contract signed",
        module: "clients",
        icon: "FileText",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `Signed contract with client "${data.clientName}" for project "${data.projectName}"`,
        needsClient: true,
        needsProject: true,
        priority: 3,
        tags: ["contract", "legal"],
      },
      {
        action: "Client interaction recorded",
        module: "clients",
        icon: "MessageSquare",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `${data.employeeName} had a ${data.interactionType} with ${data.clientName}`,
        needsClient: true,
        needsEmployee: true,
        needsInteractionType: true,
        priority: 1,
      },
    ],
    product: [
      {
        action: "Created product",
        module: "products",
        icon: "Package",
        color: "#22c55e", // green-500
        format: (data: any) => `Created new product "${data.productName}"`,
        needsProduct: true,
        priority: 3,
        tags: ["new-product"],
      },
      {
        action: "Released product version",
        module: "products",
        icon: "Tag",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `Released version ${data.version} of product "${data.productName}"`,
        needsProduct: true,
        needsVersion: true,
        priority: 3,
        tags: ["release", "version"],
      },
      {
        action: "Updated product documentation",
        module: "products",
        icon: "FileText",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Updated documentation for product "${data.productName}"`,
        needsProduct: true,
        priority: 1,
      },
      {
        action: "Product demo conducted",
        module: "products",
        icon: "Presentation",
        color: "#6366f1", // indigo-500
        format: (data: any) =>
          `Conducted demo of product "${data.productName}" for client "${data.clientName}"`,
        needsProduct: true,
        needsClient: true,
        priority: 2,
        tags: ["demo", "client"],
      },
      {
        action: "Updated technical specs",
        module: "products",
        icon: "Settings",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Updated technical specifications for product "${data.productName}"`,
        needsProduct: true,
        priority: 1,
        tags: ["technical", "specifications"],
      },
    ],
    employee: [
      {
        action: "Employee onboarded",
        module: "employees",
        icon: "UserPlus",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `Onboarded new employee ${data.employeeName} to ${data.department} department`,
        needsEmployee: true,
        needsDepartment: true,
        priority: 2,
        tags: ["onboarding"],
      },
      {
        action: "Employee promoted",
        module: "employees",
        icon: "Award",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `${data.employeeName} promoted to ${data.position}`,
        needsEmployee: true,
        needsPosition: true,
        priority: 2,
        tags: ["promotion"],
      },
      {
        action: "Skill added to employee",
        module: "employees",
        icon: "BookOpen",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Added ${data.skill} skill for ${data.employeeName}`,
        needsEmployee: true,
        needsSkill: true,
        priority: 1,
      },
      {
        action: "Employee training completed",
        module: "employees",
        icon: "Award",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `${data.employeeName} completed training in ${data.subject}`,
        needsEmployee: true,
        needsSubject: true,
        priority: 1,
        tags: ["training"],
      },
      {
        action: "Employee department change",
        module: "employees",
        icon: "SwitchHorizontal",
        color: "#f59e0b", // amber-500
        format: (data: any) =>
          `${data.employeeName} transferred to ${data.department} department`,
        needsEmployee: true,
        needsDepartment: true,
        priority: 2,
      },
    ],
    finance: [
      {
        action: "Budget created",
        module: "finance",
        icon: "DollarSign",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `Created budget of $${data.amount} for ${data.entity}`,
        needsAmount: true,
        needsEntity: true,
        priority: 2,
        tags: ["budget"],
      },
      {
        action: "Transaction recorded",
        module: "finance",
        icon: "CreditCard",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Recorded ${data.type} transaction of $${data.amount} for ${data.purpose}`,
        needsType: true,
        needsAmount: true,
        needsPurpose: true,
        priority: 1,
        tags: ["transaction"],
      },
      {
        action: "Invoice sent",
        module: "finance",
        icon: "FileText",
        color: "#f59e0b", // amber-500
        format: (data: any) =>
          `Sent invoice of $${data.amount} to client "${data.clientName}"`,
        needsClient: true,
        needsAmount: true,
        priority: 2,
        tags: ["invoice"],
      },
      {
        action: "Payment received",
        module: "finance",
        icon: "CreditCard",
        color: "#22c55e", // green-500
        format: (data: any) =>
          `Received payment of $${data.amount} from client "${data.clientName}"`,
        needsClient: true,
        needsAmount: true,
        priority: 2,
        tags: ["payment", "income"],
      },
      {
        action: "Financial report generated",
        module: "finance",
        icon: "BarChart",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Generated ${data.reportType} financial report for period ${data.period}`,
        needsReportType: true,
        needsPeriod: true,
        priority: 1,
        tags: ["report"],
      },
    ],
    system: [
      {
        action: "System backup completed",
        module: "system",
        icon: "HardDrive",
        color: "#22c55e", // green-500
        format: (data: any) => `Completed system backup`,
        isSystem: true,
        priority: 1,
        tags: ["backup"],
      },
      {
        action: "System update applied",
        module: "system",
        icon: "RefreshCw",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `Applied system update to version ${data.version}`,
        isSystem: true,
        needsVersion: true,
        priority: 2,
        tags: ["update"],
      },
      {
        action: "User account created",
        module: "system",
        icon: "UserPlus",
        color: "#22c55e", // green-500
        format: (data: any) => `Created user account for ${data.userName}`,
        needsUserName: true,
        priority: 1,
      },
      {
        action: "Password reset requested",
        module: "system",
        icon: "Lock",
        color: "#f59e0b", // amber-500
        format: (data: any) =>
          `Password reset requested for user ${data.userName}`,
        needsUserName: true,
        priority: 2,
      },
      {
        action: "Report exported",
        module: "system",
        icon: "Download",
        color: "#3b82f6", // blue-500
        format: (data: any) =>
          `${data.userName} exported ${data.reportType} report`,
        needsUserName: true,
        needsReportType: true,
        priority: 0,
      },
    ],
  };

  // Time distribution functions
  const timeDistribution = () => {
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Generate recent activity more frequently
    const recencyBias = Math.random();
    if (recencyBias < 0.5) {
      // Recent activity (last month)
      return new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    } else if (recencyBias < 0.8) {
      // Medium term activity (1-3 months ago)
      return new Date(
        now.getTime() - (30 + Math.random() * 60) * 24 * 60 * 60 * 1000
      );
    } else {
      // Older activity (3-12 months ago)
      return new Date(
        now.getTime() - (90 + Math.random() * 270) * 24 * 60 * 60 * 1000
      );
    }
  };

  // Format dates in a readable format
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Cache for project/client/product/employee names to minimize DB queries
  const cache = {
    projects: new Map<
      string,
      { name: string; milestones: any[]; tasks: any[] }
    >(),
    clients: new Map<string, { name: string }>(),
    products: new Map<string, { name: string; versions: any[] }>(),
    employees: new Map<
      string,
      { name: string; department: string; position: string }
    >(),
    users: new Map<string, { name: string }>(),
  };

  // Preload some data to minimize DB queries during activity generation
  for (const projectId of projectIds.slice(
    0,
    Math.min(20, projectIds.length)
  )) {
    const project = await tx.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });

    if (project) {
      // Get project milestones
      const milestones = await tx.query.milestones.findMany({
        where: eq(schema.milestones.projectId, projectId),
      });

      // Get project tasks
      const tasks = await tx.query.tasks.findMany({
        where: eq(schema.tasks.projectId, projectId),
      });

      cache.projects.set(projectId, {
        name: project.name,
        milestones,
        tasks,
      });
    }
  }

  for (const clientId of clientIds.slice(0, Math.min(15, clientIds.length))) {
    const client = await tx.query.clients.findFirst({
      where: eq(schema.clients.id, clientId),
    });

    if (client) {
      cache.clients.set(clientId, { name: client.name });
    }
  }

  for (const productId of productIds.slice(
    0,
    Math.min(10, productIds.length)
  )) {
    const product = await tx.query.products.findFirst({
      where: eq(schema.products.id, productId),
    });

    if (product) {
      const versions = await tx.query.productVersions.findMany({
        where: eq(schema.productVersions.productId, productId),
      });

      cache.products.set(productId, {
        name: product.name,
        versions,
      });
    }
  }

  for (const employeeId of employeeIds.slice(
    0,
    Math.min(20, employeeIds.length)
  )) {
    const employee = await tx.query.employees.findFirst({
      where: eq(schema.employees.id, employeeId),
      with: {
        users: true,
        departments: true,
        positions: true,
      },
    });

    if (employee && employee.users) {
      const fullName = `${employee.users.name} ${employee.users.lastName}`;

      cache.employees.set(employeeId, {
        name: fullName,
        department: employee.departments?.name || "Unknown Department",
        position: employee.positions?.title || "Staff",
      });

      cache.users.set(employee.users.id, {
        name: fullName,
      });
    }
  }

  // Generate the activities
  for (let i = 0; i < activityCount; i++) {
    // Select a random activity category with appropriate distribution
    const categoryKeys = Object.keys(activityTypes);
    const categoryWeights = {
      project: 0.25,
      task: 0.25,
      client: 0.15,
      product: 0.15,
      employee: 0.1,
      finance: 0.05,
      system: 0.05,
    };

    // Select category based on weights
    let selectedCategory;
    const randomValue = Math.random();
    let cumulativeWeight = 0;

    for (const category of categoryKeys) {
      cumulativeWeight +=
        categoryWeights[category as keyof typeof categoryWeights];
      if (randomValue <= cumulativeWeight) {
        selectedCategory = category;
        break;
      }
    }

    // If somehow we don't have a selected category, default to project
    selectedCategory = selectedCategory || "project";

    // Select a random activity template from the selected category
    const activityTemplates =
      activityTypes[selectedCategory as keyof typeof activityTypes];
    const activityTemplate =
      activityTemplates[Math.floor(Math.random() * activityTemplates.length)];

    // Prepare data for the activity based on the template's requirements
    const activityData: any = {};
    let projectId, taskId, clientId, productId, employeeId, milestoneId, userId;

    // Conditional entity selection based on template requirements
    if (
      "needsProject" in activityTemplate &&
      activityTemplate.needsProject &&
      cache.projects.size > 0
    ) {
      projectId = Array.from(cache.projects.keys())[
        Math.floor(Math.random() * cache.projects.size)
      ];
      activityData.projectName =
        cache.projects.get(projectId)?.name || "Unknown Project";

      if (projectId) {
        // Add project status if needed
        if ("needsStatus" in activityTemplate && activityTemplate.needsStatus) {
          const statuses = [
            "planning",
            "active",
            "on_hold",
            "completed",
            "cancelled",
          ];
          activityData.status =
            statuses[Math.floor(Math.random() * statuses.length)];
        }

        // Add milestone if needed
        if (
          "needsMilestone" in activityTemplate &&
          activityTemplate.needsMilestone
        ) {
          const projectMilestones =
            cache.projects.get(projectId)?.milestones || [];
          if (projectMilestones.length > 0) {
            const milestone =
              projectMilestones[
                Math.floor(Math.random() * projectMilestones.length)
              ];
            milestoneId = milestone.id;
            activityData.milestoneName = milestone.name;
          } else {
            activityData.milestoneName =
              "Project Phase " + (Math.floor(Math.random() * 3) + 1);
          }
        }

        // Add task if needed
        if ("needsTask" in activityTemplate && activityTemplate.needsTask) {
          const projectTasks = cache.projects.get(projectId)?.tasks || [];
          if (projectTasks.length > 0) {
            const task =
              projectTasks[Math.floor(Math.random() * projectTasks.length)];
            taskId = task.id;
            activityData.taskName = task.title;

            if (
              "needsStatus" in activityTemplate &&
              activityTemplate.needsStatus
            ) {
              const taskStatuses = ["todo", "in_progress", "review", "done"];
              activityData.status =
                taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
            }
          } else {
            activityData.taskName =
              "Task " + (Math.floor(Math.random() * 100) + 1);
          }
        }

        // Add budget if needed
        if ("needsBudget" in activityTemplate && activityTemplate.needsBudget) {
          activityData.budget = (
            Math.round(Math.random() * 5000) + 5000
          ).toLocaleString();
        }
      }
    }

    // Add client data if needed
    if (
      "needsClient" in activityTemplate &&
      activityTemplate.needsClient &&
      cache.clients.size > 0
    ) {
      clientId = Array.from(cache.clients.keys())[
        Math.floor(Math.random() * cache.clients.size)
      ];
      activityData.clientName =
        cache.clients.get(clientId)?.name || "Unknown Client";

      if (
        "needsInteractionType" in activityTemplate &&
        activityTemplate.needsInteractionType
      ) {
        const interactionTypes = [
          "call",
          "meeting",
          "email",
          "video conference",
          "site visit",
        ];
        activityData.interactionType =
          interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
      }
    }

    // Add product data if needed
    if (
      "needsProduct" in activityTemplate &&
      activityTemplate.needsProduct &&
      cache.products.size > 0
    ) {
      productId = Array.from(cache.products.keys())[
        Math.floor(Math.random() * cache.products.size)
      ];
      activityData.productName =
        cache.products.get(productId)?.name || "Unknown Product";

      if ("needsVersion" in activityTemplate && activityTemplate.needsVersion) {
        const productVersions = cache.products.get(productId)?.versions || [];
        if (productVersions.length > 0) {
          const version =
            productVersions[Math.floor(Math.random() * productVersions.length)];
          activityData.version = version.versionNumber;
        } else {
          activityData.version = `${
            Math.floor(Math.random() * 3) + 1
          }.${Math.floor(Math.random() * 10)}.${Math.floor(
            Math.random() * 10
          )}`;
        }
      }
    }

    // Add employee data if needed
    if (
      "needsEmployee" in activityTemplate &&
      activityTemplate.needsEmployee &&
      cache.employees.size > 0
    ) {
      employeeId = Array.from(cache.employees.keys())[
        Math.floor(Math.random() * cache.employees.size)
      ];
      const employeeData = cache.employees.get(employeeId);
      activityData.employeeName = employeeData?.name || "Unknown Employee";

      // Set position data if needed
      if (
        "needsPosition" in activityTemplate &&
        activityTemplate.needsPosition
      ) {
        const positions = [
          "Developer",
          "Senior Developer",
          "Project Manager",
          "Team Lead",
          "QA Engineer",
          "DevOps Engineer",
          "Business Analyst",
          "Product Owner",
        ];
        activityData.position =
          positions[Math.floor(Math.random() * positions.length)];
      }

      // Set department data if needed
      if (
        "needsDepartment" in activityTemplate &&
        activityTemplate.needsDepartment
      ) {
        activityData.department =
          employeeData?.department || "Unknown Department";
      }

      // Set skill data if needed
      if ("needsSkill" in activityTemplate && activityTemplate.needsSkill) {
        const skills = [
          "JavaScript",
          "React",
          "Node.js",
          "Python",
          "AWS",
          "Docker",
          "DevOps",
          "Agile Methodologies",
          "SQL",
          "Data Analysis",
        ];
        activityData.skill = skills[Math.floor(Math.random() * skills.length)];
      }

      // Set subject data if needed
      if ("needsSubject" in activityTemplate && activityTemplate.needsSubject) {
        const subjects = [
          "Cloud Computing",
          "Agile Development",
          "Security Best Practices",
          "Leadership",
          "Advanced JavaScript",
          "Machine Learning",
        ];
        activityData.subject =
          subjects[Math.floor(Math.random() * subjects.length)];
      }
    }

    // Set role data if needed
    if ("needsRole" in activityTemplate && activityTemplate.needsRole) {
      const roles = [
        "Developer",
        "QA Tester",
        "Designer",
        "Technical Lead",
        "Business Analyst",
        "Product Owner",
        "Project Manager",
      ];
      activityData.role = roles[Math.floor(Math.random() * roles.length)];
    }

    // Add date if needed
    if ("needsDate" in activityTemplate && activityTemplate.needsDate) {
      const futureDate = new Date();
      futureDate.setDate(
        futureDate.getDate() + Math.floor(Math.random() * 30) + 1
      );
      activityData.date = formatDate(futureDate);
    }

    // Add finance specific data
    if (selectedCategory === "finance") {
      // Transaction amount if needed
      if ("needsAmount" in activityTemplate && activityTemplate.needsAmount) {
        activityData.amount = (
          Math.round(Math.random() * 10000) + 1000
        ).toLocaleString();
      }

      // Transaction type if needed
      if ("needsType" in activityTemplate && activityTemplate.needsType) {
        const types = ["income", "expense", "transfer"];
        activityData.type = types[Math.floor(Math.random() * types.length)];
      }

      // Transaction purpose if needed
      if ("needsPurpose" in activityTemplate && activityTemplate.needsPurpose) {
        const purposes = [
          "Software licenses",
          "Hardware purchase",
          "Office supplies",
          "Consulting services",
          "Employee training",
          "Project expenses",
        ];
        activityData.purpose =
          purposes[Math.floor(Math.random() * purposes.length)];
      }

      // Entity for budgets if needed
      if ("needsEntity" in activityTemplate && activityTemplate.needsEntity) {
        const entities = [
          "Q2 Operations",
          "Marketing Campaign",
          "R&D Department",
          "New Product Development",
          "Office Expansion",
        ];
        activityData.entity =
          entities[Math.floor(Math.random() * entities.length)];
      }

      // Report type if needed
      if (
        "needsReportType" in activityTemplate &&
        activityTemplate.needsReportType
      ) {
        const reportTypes = [
          "Monthly",
          "Quarterly",
          "Annual",
          "Expense",
          "Revenue",
        ];
        activityData.reportType =
          reportTypes[Math.floor(Math.random() * reportTypes.length)];
      }

      // Report period if needed
      if ("needsPeriod" in activityTemplate && activityTemplate.needsPeriod) {
        const periods = [
          "Q1 2025",
          "Q2 2025",
          "Q3 2025",
          "Q4 2025",
          "January 2025",
          "February 2025",
        ];
        activityData.period =
          periods[Math.floor(Math.random() * periods.length)];
      }
    }

    // Add system specific data
    if (selectedCategory === "system") {
      // Version for system updates if needed
      if ("needsVersion" in activityTemplate && activityTemplate.needsVersion) {
        activityData.version = `${
          Math.floor(Math.random() * 3) + 1
        }.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;
      }

      // Username if needed
      if (
        "needsUserName" in activityTemplate &&
        activityTemplate.needsUserName
      ) {
        // Use a cached user
        if (cache.users.size > 0) {
          userId = Array.from(cache.users.keys())[
            Math.floor(Math.random() * cache.users.size)
          ];
          activityData.userName =
            cache.users.get(userId)?.name || "Unknown User";
        } else {
          activityData.userName = `user${Math.floor(Math.random() * 100) + 1}`;
        }
      }

      // Report type if needed
      if (
        "needsReportType" in activityTemplate &&
        activityTemplate.needsReportType
      ) {
        const reportTypes = [
          "Monthly",
          "Quarterly",
          "Annual",
          "Expense",
          "Revenue",
          "Project Status",
        ];
        activityData.reportType =
          reportTypes[Math.floor(Math.random() * reportTypes.length)];
      }
    }

    // Generate the activity description using the template
    const description = activityTemplate.format(activityData);

    // Determine who performed this activity
    const isSystem = Boolean(
      "isSystem" in activityTemplate && activityTemplate.isSystem
    );
    if (!userId && userIds.length > 0 && !isSystem) {
      userId = userIds[Math.floor(Math.random() * userIds.length)];
    }

    // Generate timestamp
    const timestamp = timeDistribution();

    // Create the activity in the database
    await tx.insert(schema.activitiesFeed).values({
      id: createId(),
      action: activityTemplate.action,
      module: activityTemplate.module,
      description: description,
      projectId: projectId,
      productId: productId,
      clientId: clientId,
      employeeId: employeeId,
      taskId: taskId,
      milestoneId: milestoneId,
      userId: isSystem ? undefined : userId,
      isSystem: isSystem,
      timestamp: timestamp,
      details: activityData,
      icon: activityTemplate.icon,
      color: activityTemplate.color,
      priority: activityTemplate.priority || 0,
      tags: activityTemplate.tags || [],
    });
  }
}
