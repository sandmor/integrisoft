import * as schema from "../db/schema";
import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Generate cost centers
export async function generateCostCenters(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  departmentIds: string[]
): Promise<string[]> {
  const costCenterIds: string[] = [];

  // Create a cost center for each department
  for (const departmentId of departmentIds) {
    // Get department info
    const department = await tx.query.departments.findFirst({
      where: eq(schema.departments.id, departmentId),
    });

    const costCenterId = createId();
    await tx
      .insert(schema.costCenters)
      .values({
        id: costCenterId,
        name: `${department?.name || "Department"} Operations`,
        description: `Cost center for ${
          department?.name || "department"
        } operational expenses.`,
        budget: (50000 + Math.floor(Math.random() * 950000)).toString(), // 50k-1M
        departmentId: departmentId,
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent({ days: 30 }),
        isDeleted: false,
      })
      .execute();

    costCenterIds.push(costCenterId);
  }

  // Create a few company-wide cost centers
  const companyWideCenters = [
    "Corporate Events",
    "Office Infrastructure",
    "Software Licenses",
    "Employee Benefits",
  ];

  for (const centerName of companyWideCenters) {
    const costCenterId = createId();
    await tx
      .insert(schema.costCenters)
      .values({
        id: costCenterId,
        name: centerName,
        description: `Company-wide cost center for ${centerName.toLowerCase()}.`,
        budget: (100000 + Math.floor(Math.random() * 400000)).toString(), // 100k-500k
        departmentId: null, // No department for company-wide centers
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent({ days: 30 }),
        isDeleted: false,
      })
      .execute();

    costCenterIds.push(costCenterId);
  }

  return costCenterIds;
}

// Generate transaction categories
export async function generateTransactionCategories(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<string[]> {
  const categoryIds: string[] = [];

  // Income categories
  const incomeCategories = [
    "Client Payments",
    "Service Revenue",
    "Product Sales",
    "Investment Income",
    "Licensing Revenue",
  ];

  // Expense categories
  const expenseCategories = [
    "Salaries",
    "Office Supplies",
    "Software Subscriptions",
    "Travel",
    "Marketing",
    "Professional Services",
    "Office Rent",
    "Equipment",
    "Training",
    "Utilities",
  ];

  // Transfer categories
  const transferCategories = [
    "Inter-department Transfer",
    "Project Allocation",
    "Cost Center Transfer",
  ];

  // Generate income categories
  for (const name of incomeCategories) {
    const categoryId = createId();
    await tx
      .insert(schema.transactionCategories)
      .values({
        id: categoryId,
        name: name,
        type: "income",
        description: `Income from ${name.toLowerCase()}.`,
        parentCategoryId: null, // Top-level categories
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .execute();

    categoryIds.push(categoryId);
  }

  // Generate expense categories
  for (const name of expenseCategories) {
    const categoryId = createId();
    await tx
      .insert(schema.transactionCategories)
      .values({
        id: categoryId,
        name: name,
        type: "expense",
        description: `Expenses related to ${name.toLowerCase()}.`,
        parentCategoryId: null, // Top-level categories
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .execute();

    categoryIds.push(categoryId);
  }

  // Generate transfer categories
  for (const name of transferCategories) {
    const categoryId = createId();
    await tx
      .insert(schema.transactionCategories)
      .values({
        id: categoryId,
        name: name,
        type: "transfer",
        description: `Transfers for ${name.toLowerCase()}.`,
        parentCategoryId: null, // Top-level categories
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      })
      .execute();

    categoryIds.push(categoryId);
  }

  return categoryIds;
}

// Generate budgets
export async function generateBudgets(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  costCenterIds: string[],
  projectIds: string[],
  userIds: string[]
) {
  // Create both cost center budgets and project budgets

  // Create annual budgets for cost centers
  for (const costCenterId of costCenterIds) {
    // Get cost center info
    const costCenter = await tx.query.costCenters.findFirst({
      where: eq(schema.costCenters.id, costCenterId),
    });

    // Random user as creator
    const randomUser = userIds[Math.floor(Math.random() * userIds.length)];

    // Current year budget
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1); // January 1st
    const endDate = new Date(currentYear, 11, 31); // December 31st

    await tx
      .insert(schema.budgets)
      .values({
        id: createId(),
        name: `${
          costCenter?.name || "Cost Center"
        } Annual Budget ${currentYear}`,
        amount: (costCenter?.budget || 100000).toString(),
        startDate: startDate,
        endDate: endDate,
        costCenterId: costCenterId,
        projectId: null,
        description: `Annual operating budget for ${
          costCenter?.name || "this cost center"
        }.`,
        createdById: randomUser,
        createdAt: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before start
        updatedAt: new Date(),
        isDeleted: false,
      })
      .execute();

    // Previous year budget (70% have it)
    if (Math.random() < 0.7) {
      const prevYear = currentYear - 1;
      const prevStartDate = new Date(prevYear, 0, 1);
      const prevEndDate = new Date(prevYear, 11, 31);

      // Previous year budget is 80-120% of current
      const prevAmount =
        Number(costCenter?.budget || 100000) * (0.8 + Math.random() * 0.4);

      await tx
        .insert(schema.budgets)
        .values({
          id: createId(),
          name: `${
            costCenter?.name || "Cost Center"
          } Annual Budget ${prevYear}`,
          amount: prevAmount.toString(),
          startDate: prevStartDate,
          endDate: prevEndDate,
          costCenterId: costCenterId,
          projectId: null,
          description: `Annual operating budget for ${
            costCenter?.name || "this cost center"
          }.`,
          createdById: randomUser,
          createdAt: new Date(
            prevStartDate.getTime() - 30 * 24 * 60 * 60 * 1000
          ), // 30 days before start
          updatedAt: new Date(),
          isDeleted: false,
        })
        .execute();
    }

    // Next year budget (30% have it planned)
    if (Math.random() < 0.3) {
      const nextYear = currentYear + 1;
      const nextStartDate = new Date(nextYear, 0, 1);
      const nextEndDate = new Date(nextYear, 11, 31);

      // Next year budget is 90-130% of current (expecting growth)
      const nextAmount =
        Number(costCenter?.budget || 100000) * (0.9 + Math.random() * 0.4);

      await tx
        .insert(schema.budgets)
        .values({
          id: createId(),
          name: `${
            costCenter?.name || "Cost Center"
          } Annual Budget ${nextYear}`,
          amount: nextAmount.toString(),
          startDate: nextStartDate,
          endDate: nextEndDate,
          costCenterId: costCenterId,
          projectId: null,
          description: `Projected annual operating budget for ${
            costCenter?.name || "this cost center"
          }.`,
          createdById: randomUser,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
        })
        .execute();
    }
  }

  // Create budgets for projects
  for (const projectId of projectIds) {
    // Get project info
    const project = await tx.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });

    if (!project || !project.budget) {
      continue; // Skip projects without budgets
    }

    // Random user as creator
    const randomUser = userIds[Math.floor(Math.random() * userIds.length)];

    await tx
      .insert(schema.budgets)
      .values({
        id: createId(),
        name: `${project.name} Project Budget`,
        amount: project.budget,
        startDate: project.startDate || new Date(),
        endDate:
          project.targetEndDate ||
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        costCenterId: null,
        projectId: projectId,
        description: `Budget allocation for ${project.name}.`,
        createdById: randomUser,
        createdAt: project.createdAt || new Date(),
        updatedAt: project.updatedAt || new Date(),
        isDeleted: false,
      })
      .execute();
  }
}

// Generate transactions
export async function generateTransactions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  categoryIds: string[],
  costCenterIds: string[],
  projectIds: string[],
  userIds: string[]
) {
  // Map categories by type for easy lookup
  const categoriesByType: Record<string, string[]> = {
    income: [],
    expense: [],
    transfer: [],
  };

  // Get all categories and organize them by type
  for (const categoryId of categoryIds) {
    const category = await tx.query.transactionCategories.findFirst({
      where: eq(schema.transactionCategories.id, categoryId),
    });

    if (category && category.type) {
      categoriesByType[category.type].push(categoryId);
    }
  }

  // Get active cost centers
  const activeCostCenters = [];
  for (const costCenterId of costCenterIds) {
    const costCenter = await tx.query.costCenters.findFirst({
      where: eq(schema.costCenters.id, costCenterId),
    });

    if (costCenter && !costCenter.isDeleted) {
      activeCostCenters.push(costCenterId);
    }
  }

  // Get active projects
  const activeProjects = [];
  for (const projectId of projectIds) {
    const project = await tx.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });

    if (
      project &&
      (project.status === "active" || project.status === "completed")
    ) {
      activeProjects.push(projectId);
    }
  }

  // Function to create a single transaction
  async function createTransaction(
    type: "income" | "expense" | "transfer",
    date: Date,
    minAmount: number,
    maxAmount: number,
    categoryId: string | null = null,
    costCenterId: string | null = null,
    projectId: string | null = null
  ) {
    // If no category ID provided, pick a random one of the correct type
    const typeCategories = categoriesByType[type];
    const selectedCategoryId =
      categoryId ||
      (typeCategories.length > 0
        ? typeCategories[Math.floor(Math.random() * typeCategories.length)]
        : null);

    if (!selectedCategoryId) return; // Skip if no suitable category

    // Get category for description
    const category = await tx.query.transactionCategories.findFirst({
      where: eq(schema.transactionCategories.id, selectedCategoryId),
    });

    // Generate amount
    const amount = minAmount + Math.random() * (maxAmount - minAmount);

    // Random creator and approver
    const creatorId = userIds[Math.floor(Math.random() * userIds.length)];
    const approverId =
      Math.random() > 0.2
        ? userIds[Math.floor(Math.random() * userIds.length)]
        : null;

    // Generate description
    let description;
    if (type === "income") {
      description = `Income from ${
        category?.name.toLowerCase() || "services"
      }.`;
    } else if (type === "expense") {
      description = `Expense for ${
        category?.name.toLowerCase() || "operations"
      }.`;
    } else {
      description = `Transfer between accounts for ${
        category?.name.toLowerCase() || "allocation"
      }.`;
    }

    // Transaction ID
    const transactionId = createId();

    // Insert transaction
    await tx
      .insert(schema.transactions)
      .values({
        id: transactionId,
        type: type as any,
        amount: amount.toString(),
        description: description,
        date: date,
        categoryId: selectedCategoryId,
        costCenterId: costCenterId,
        projectId: projectId,
        createdById: creatorId,
        approvedById: approverId,
        approvedAt: approverId
          ? new Date(date.getTime() + 1000 * 60 * 60 * 2)
          : null, // 2 hours after transaction
        createdAt: date,
        updatedAt: date,
        isDeleted: false,
      })
      .execute();

    return transactionId;
  }

  // 1. Generate monthly recurring transactions for each cost center
  // (salaries, rent, utilities, etc.)
  for (const costCenterId of activeCostCenters) {
    // Get cost center for context
    const costCenter = await tx.query.costCenters.findFirst({
      where: eq(schema.costCenters.id, costCenterId),
    });

    // Generate transactions for the past 12 months
    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth();

    // Find salary category
    const salaryCategory = await tx.query.transactionCategories.findFirst({
      where: eq(schema.transactionCategories.name, "Salaries"),
    });

    // Find rent category
    const rentCategory = await tx.query.transactionCategories.findFirst({
      where: eq(schema.transactionCategories.name, "Office Rent"),
    });

    // Find utilities category
    const utilitiesCategory = await tx.query.transactionCategories.findFirst({
      where: eq(schema.transactionCategories.name, "Utilities"),
    });

    // Monthly budget
    const monthlyBudget = Number(costCenter?.budget || 100000) / 12;

    // For the past 12 months
    for (let i = 0; i < 12; i++) {
      const month = (currentMonth - i + 12) % 12; // Go back i months
      const transactionYear = year - Math.floor((i - currentMonth) / 12);
      const transactionDate = new Date(transactionYear, month, 15);

      // Monthly salary (40-60% of budget)
      if (salaryCategory) {
        await createTransaction(
          "expense",
          new Date(transactionYear, month, 28), // End of month
          monthlyBudget * 0.4,
          monthlyBudget * 0.6,
          salaryCategory.id,
          costCenterId,
          null
        );
      }

      // Monthly rent (10-15% of budget)
      if (rentCategory) {
        await createTransaction(
          "expense",
          new Date(transactionYear, month, 1), // Beginning of month
          monthlyBudget * 0.1,
          monthlyBudget * 0.15,
          rentCategory.id,
          costCenterId,
          null
        );
      }

      // Monthly utilities (3-8% of budget)
      if (utilitiesCategory) {
        await createTransaction(
          "expense",
          new Date(transactionYear, month, 10), // Middle of month
          monthlyBudget * 0.03,
          monthlyBudget * 0.08,
          utilitiesCategory.id,
          costCenterId,
          null
        );
      }

      // Other miscellaneous expenses (10-20% of budget)
      const miscExpenseCount = 2 + Math.floor(Math.random() * 3); // 2-4 misc expenses
      for (let j = 0; j < miscExpenseCount; j++) {
        const day = 1 + Math.floor(Math.random() * 28);
        await createTransaction(
          "expense",
          new Date(transactionYear, month, day),
          monthlyBudget * 0.02,
          monthlyBudget * 0.07,
          null, // Random expense category
          costCenterId,
          null
        );
      }

      // Income for department cost centers (only some departments generate income)
      if (costCenter?.departmentId && Math.random() < 0.4) {
        const incomeCount = Math.floor(Math.random() * 3); // 0-2 income transactions
        for (let j = 0; j < incomeCount; j++) {
          const day = 1 + Math.floor(Math.random() * 28);
          await createTransaction(
            "income",
            new Date(transactionYear, month, day),
            monthlyBudget * 0.1,
            monthlyBudget * 0.5,
            null, // Random income category
            costCenterId,
            null
          );
        }
      }
    }
  }

  // 2. Generate project-specific transactions
  for (const projectId of activeProjects) {
    // Get project info
    const project = await tx.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
    });

    if (!project || !project.startDate || !project.budget) {
      continue;
    }

    // Calculate project duration in days
    const startDate = new Date(project.startDate);
    const endDate =
      project.actualEndDate || project.targetEndDate || new Date();
    const durationDays = Math.max(
      1,
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      )
    );

    // Total budget
    const totalBudget = Number(project.budget);

    // Generate 5-15 expenses for the project
    const expenseCount = 5 + Math.floor(Math.random() * 11);

    for (let i = 0; i < expenseCount; i++) {
      // Random date within project timeframe
      const daysOffset = Math.floor(Math.random() * durationDays);
      const transactionDate = new Date(
        startDate.getTime() + daysOffset * 24 * 60 * 60 * 1000
      );

      // Expense amount (2-10% of total budget)
      const minAmount = totalBudget * 0.02;
      const maxAmount = totalBudget * 0.1;

      await createTransaction(
        "expense",
        transactionDate,
        minAmount,
        maxAmount,
        null, // Random expense category
        null, // No cost center
        projectId
      );
    }

    // For completed projects, add income transactions (for client projects)
    if (project.status === "completed" && project.clientId) {
      // Client payments are typically 2-4 milestone payments
      const paymentCount = 2 + Math.floor(Math.random() * 3);

      for (let i = 0; i < paymentCount; i++) {
        // Payments are distributed throughout the project
        const paymentPosition = (i + 1) / (paymentCount + 1);
        const daysOffset = Math.floor(paymentPosition * durationDays);
        const transactionDate = new Date(
          startDate.getTime() + daysOffset * 24 * 60 * 60 * 1000
        );

        // Payment amount (roughly equal portions of total)
        const paymentAmount =
          (totalBudget / paymentCount) * (0.9 + Math.random() * 0.2);

        const clientPaymentCategory =
          await tx.query.transactionCategories.findFirst({
            where: eq(schema.transactionCategories.name, "Client Payments"),
          });

        await createTransaction(
          "income",
          transactionDate,
          paymentAmount * 0.95,
          paymentAmount * 1.05,
          clientPaymentCategory?.id,
          null, // No cost center
          projectId
        );
      }
    }
  }

  // 3. Generate random transfers between cost centers (occasional reallocation of funds)
  if (activeCostCenters.length >= 2 && categoriesByType.transfer.length > 0) {
    // Generate 5-10 transfers
    const transferCount = 5 + Math.floor(Math.random() * 6);

    for (let i = 0; i < transferCount; i++) {
      // Random date in the past year
      const daysAgo = Math.floor(Math.random() * 365);
      const transactionDate = new Date(
        Date.now() - daysAgo * 24 * 60 * 60 * 1000
      );

      // Random cost centers (from and to)
      const fromIndex = Math.floor(Math.random() * activeCostCenters.length);
      // Ensure different "to" index
      let toIndex;
      do {
        toIndex = Math.floor(Math.random() * activeCostCenters.length);
      } while (toIndex === fromIndex);

      const fromCostCenterId = activeCostCenters[fromIndex];
      const toCostCenterId = activeCostCenters[toIndex];

      // Transfer amount (5k to 50k)
      await createTransaction(
        "transfer",
        transactionDate,
        5000,
        50000,
        null, // Random transfer category
        fromCostCenterId, // Record on the from cost center
        null
      );

      // Also create the receiving side of the transfer
      await createTransaction(
        "transfer",
        transactionDate,
        5000,
        50000,
        null, // Random transfer category
        toCostCenterId, // Record on the to cost center
        null
      );
    }
  }
}
