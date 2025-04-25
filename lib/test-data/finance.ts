import * as schema from "../db/schema";
import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  TransactionCategoriesResult,
  TransactionCategory,
  TransactionType,
} from "./types";
import {
  addDays,
  addMonths,
  format,
  subMonths,
  subYears,
  addYears,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  subQuarters,
} from "date-fns";

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
): Promise<TransactionCategoriesResult> {
  const allCategoryIds: string[] = [];
  const categoriesByType: {
    income: TransactionCategory[];
    expense: TransactionCategory[];
    transfer: TransactionCategory[];
  } = {
    income: [],
    expense: [],
    transfer: [],
  };

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

    allCategoryIds.push(categoryId);
    categoriesByType.income.push({
      id: categoryId,
      name: name,
      type: "income",
    });
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

    allCategoryIds.push(categoryId);
    categoriesByType.expense.push({
      id: categoryId,
      name: name,
      type: "expense",
    });
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

    allCategoryIds.push(categoryId);
    categoriesByType.transfer.push({
      id: categoryId,
      name: name,
      type: "transfer",
    });
  }

  // Create the helper function for finding categories
  const findByNameAndType = (
    name: string,
    type: TransactionType
  ): TransactionCategory | undefined => {
    return categoriesByType[type].find((cat) => cat.name === name);
  };

  return {
    allCategoryIds,
    categoriesByType,
    findByNameAndType,
  };
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
  categories: TransactionCategoriesResult,
  costCenterIds: string[],
  projectIds: string[],
  userIds: string[]
) {
  // Get active cost centers
  const activeCostCenters = [];
  for (const costCenterId of costCenterIds) {
    const costCenter = await tx.query.costCenters.findFirst({
      where: eq(schema.costCenters.id, costCenterId),
    });

    if (costCenter && !costCenter.isDeleted) {
      activeCostCenters.push({
        id: costCenterId,
        name: costCenter.name,
        budget: Number(costCenter.budget || 100000),
        departmentId: costCenter.departmentId,
      });
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
      project.budget &&
      (project.status === "active" ||
        project.status === "completed" ||
        project.status === "planning")
    ) {
      activeProjects.push({
        id: projectId,
        name: project.name,
        status: project.status,
        budget: Number(project.budget),
        startDate: project.startDate,
        targetEndDate: project.targetEndDate,
        actualEndDate: project.actualEndDate,
        clientId: project.clientId,
      });
    }
  }

  // Get category objects for name lookup
  const categoryMap = new Map<string, { name: string; type: string }>();
  for (const type of ["income", "expense", "transfer"] as const) {
    for (const category of categories.categoriesByType[type]) {
      categoryMap.set(category.id, {
        name: category.name,
        type: category.type,
      });
    }
  }

  // Function to create a single transaction
  async function createTransaction(
    type: TransactionType,
    date: Date,
    amount: number,
    description: string,
    categoryId: string | null = null,
    costCenterId: string | null = null,
    projectId: string | null = null,
    isApproved: boolean = true,
    createdById: string | null = null,
    approvedById: string | null = null
  ) {
    // If no category ID provided, pick a random one of the correct type
    let selectedCategoryId = categoryId;
    if (!selectedCategoryId) {
      const typeCategories = categories.categoriesByType[type];
      if (typeCategories.length > 0) {
        const randomCat =
          typeCategories[Math.floor(Math.random() * typeCategories.length)];
        selectedCategoryId = randomCat.id;
      }
    }

    if (!selectedCategoryId) return null; // Skip if no suitable category

    // Random creator and approver if not specified
    const creator =
      createdById || userIds[Math.floor(Math.random() * userIds.length)];
    const approver = isApproved
      ? approvedById ||
        (Math.random() > 0.1
          ? userIds[Math.floor(Math.random() * userIds.length)]
          : null)
      : null;

    // Transaction ID
    const transactionId = createId();

    // Approval date is typically 0-3 days after transaction date
    const approvalDelay = Math.floor(Math.random() * 4) * 24 * 60 * 60 * 1000;
    const approvalDate = approver
      ? new Date(date.getTime() + approvalDelay)
      : null;

    // Insert transaction
    await tx
      .insert(schema.transactions)
      .values({
        id: transactionId,
        type: type as any,
        amount: amount.toFixed(2),
        description: description,
        date: date,
        categoryId: selectedCategoryId,
        costCenterId: costCenterId,
        projectId: projectId,
        createdById: creator,
        approvedById: approver,
        approvedAt: approvalDate,
        createdAt: date,
        updatedAt: date,
        isDeleted: false,
      })
      .execute();

    return transactionId;
  }

  // Define time period (past 16 months to future 2 months)
  const startDate = subMonths(new Date(), 16);
  const endDate = addMonths(new Date(), 2);

  // Create arrays for different time periods
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  const quarters = eachQuarterOfInterval({ start: startDate, end: endDate });

  // Get category IDs for common transactions
  const salaryCat = categories.findByNameAndType("Salaries", "expense");
  const rentCat = categories.findByNameAndType("Office Rent", "expense");
  const utilitiesCat = categories.findByNameAndType("Utilities", "expense");
  const softwareCat = categories.findByNameAndType(
    "Software Subscriptions",
    "expense"
  );
  const travelCat = categories.findByNameAndType("Travel", "expense");
  const marketingCat = categories.findByNameAndType("Marketing", "expense");
  const clientPaymentCat = categories.findByNameAndType(
    "Client Payments",
    "income"
  );
  const serviceRevenueCat = categories.findByNameAndType(
    "Service Revenue",
    "income"
  );
  const transferCat = categories.findByNameAndType(
    "Inter-department Transfer",
    "transfer"
  );
  const equipmentCat = categories.findByNameAndType("Equipment", "expense");
  const professionalServicesCat = categories.findByNameAndType(
    "Professional Services",
    "expense"
  );
  const officeSuppliesCat = categories.findByNameAndType(
    "Office Supplies",
    "expense"
  );

  // Generate base monthly expenses for all cost centers
  for (const costCenter of activeCostCenters) {
    // Monthly budget allocation
    const monthlyBudget = costCenter.budget / 12;

    // Company growth factor (slight growth in expenses over time)
    const growthFactorMonthly = 1.005; // 0.5% growth per month

    // Calculate seasonal factors
    function getSeasonalFactor(date: Date): number {
      const month = date.getMonth();
      // Q4 (months 9,10,11) tends to have higher expenses
      if (month >= 9 && month <= 11) return 1.2;
      // Q1 (months 0,1,2) tends to have lower expenses
      if (month >= 0 && month <= 2) return 0.85;
      // Q2 and Q3 are average
      return 1.0;
    }

    // Generate monthly recurring expenses for this cost center
    for (let i = 0; i < months.length; i++) {
      const currentMonth = months[i];
      const seasonalFactor = getSeasonalFactor(currentMonth);
      const growthFactor = Math.pow(growthFactorMonthly, i); // Compound growth

      // 1. SALARIES - Most stable expense, slight growth over time
      // Slight variations (bonuses in December, annual raises, etc)
      const salaryBase = monthlyBudget * 0.45; // 45% of budget goes to salaries
      let salaryAmount = salaryBase * growthFactor;

      // December bonus (month 11)
      if (currentMonth.getMonth() === 11) {
        salaryAmount *= 1.25; // 25% bonus in December
      }

      // Annual raises in January (month 0)
      if (currentMonth.getMonth() === 0 && i > 0) {
        salaryAmount *= 1.05; // 5% raise at beginning of year
      }

      // Random small fluctuation (±2%)
      const salaryFluct = 1 + (Math.random() * 0.04 - 0.02);
      salaryAmount *= salaryFluct;

      // Create salary transaction
      await createTransaction(
        "expense",
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 28), // End of month
        salaryAmount,
        `Monthly payroll for ${format(currentMonth, "MMMM yyyy")}`,
        salaryCat?.id || null,
        costCenter.id,
        null
      );

      // 2. RENT - Stable expense, increases annually by ~3-5%
      const rentBase = monthlyBudget * 0.12; // 12% of budget goes to rent
      let rentAmount = rentBase;

      // Annual rent increase in January or when the lease is renewed
      if (currentMonth.getMonth() === 0) {
        rentAmount *= 1.04; // 4% annual increase
      }

      await createTransaction(
        "expense",
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), // Beginning of month
        rentAmount,
        `Office rent payment for ${format(currentMonth, "MMMM yyyy")}`,
        rentCat?.id || null,
        costCenter.id,
        null
      );

      // 3. UTILITIES - Seasonal variation
      const utilityBase = monthlyBudget * 0.06; // 6% of budget for utilities

      // Utilities vary by season (higher in summer and winter for climate control)
      let utilitySeasonalFactor = 1.0;
      const month = currentMonth.getMonth();
      if (month === 0 || month === 1 || month === 11) {
        // Winter months (higher heating)
        utilitySeasonalFactor = 1.3;
      } else if (month === 6 || month === 7 || month === 8) {
        // Summer months (higher cooling)
        utilitySeasonalFactor = 1.4;
      }

      const utilityAmount = utilityBase * utilitySeasonalFactor * growthFactor;

      await createTransaction(
        "expense",
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15), // Middle of month
        utilityAmount,
        `Utilities payment for ${format(currentMonth, "MMMM yyyy")}`,
        utilitiesCat?.id || null,
        costCenter.id,
        null
      );

      // 4. SOFTWARE SUBSCRIPTIONS - Mostly stable, occasional increases
      if (softwareCat) {
        const softwareBase = monthlyBudget * 0.08; // 8% for software
        let softwareAmount = softwareBase;

        // Occasional subscription price increases
        if (Math.random() < 0.1) {
          softwareAmount *= 1.1; // 10% increase occasionally
        }

        await createTransaction(
          "expense",
          new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 5),
          softwareAmount,
          `Software subscriptions for ${format(currentMonth, "MMMM yyyy")}`,
          softwareCat.id,
          costCenter.id,
          null
        );
      }

      // 5. MARKETING EXPENSES - Higher in certain seasons
      if (marketingCat && costCenter.name.includes("Marketing")) {
        const marketingBase = monthlyBudget * 0.2; // 20% for marketing departments

        // Marketing pushes: higher in Q4 and beginning of Q2
        let marketingFactor = 1.0;
        if (month === 3 || month === 4) {
          // Spring campaign
          marketingFactor = 1.3;
        } else if (month >= 9 && month <= 11) {
          // Holiday/end of year campaign
          marketingFactor = 1.5;
        }

        const marketingAmount =
          marketingBase * marketingFactor * seasonalFactor;

        await createTransaction(
          "expense",
          new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 12),
          marketingAmount,
          `Marketing expenses for ${format(
            currentMonth,
            "MMMM yyyy"
          )} campaign`,
          marketingCat.id,
          costCenter.id,
          null
        );
      }

      // 6. VARIABLE MISC EXPENSES - Random smaller expenses
      const miscExpenseCount = 2 + Math.floor(Math.random() * 4); // 2-5 misc expenses

      for (let j = 0; j < miscExpenseCount; j++) {
        const day = 1 + Math.floor(Math.random() * 28);
        const miscAmount =
          monthlyBudget * (0.01 + Math.random() * 0.04) * seasonalFactor; // 1-5% of monthly budget

        // Get a random expense category that isn't one of our major ones
        const usedCategoryIds = [
          salaryCat?.id,
          rentCat?.id,
          utilitiesCat?.id,
          softwareCat?.id,
          travelCat?.id,
        ].filter(Boolean) as string[];

        // Filter expense categories to exclude the used ones
        const availableExpenseCats = categories.categoriesByType.expense.filter(
          (cat) => !usedCategoryIds.includes(cat.id)
        );

        let randomCategory = null;
        if (availableExpenseCats.length > 0) {
          randomCategory =
            availableExpenseCats[
              Math.floor(Math.random() * availableExpenseCats.length)
            ];
        }

        // Random descriptions based on category
        let description;

        if (randomCategory) {
          if (randomCategory.name === "Office Supplies") {
            const supplies = [
              "printer paper",
              "ink cartridges",
              "notebooks",
              "pens",
              "desk organizers",
              "coffee supplies",
            ];
            const supplyItem =
              supplies[Math.floor(Math.random() * supplies.length)];
            description = `Purchase of ${supplyItem} for office`;
          } else if (randomCategory.name === "Equipment") {
            const equipment = [
              "laptop",
              "monitor",
              "keyboard",
              "office chair",
              "desk",
              "projector",
              "meeting room equipment",
            ];
            const equipItem =
              equipment[Math.floor(Math.random() * equipment.length)];
            description = `Purchase of ${equipItem} for ${costCenter.name}`;
          } else if (randomCategory.name === "Training") {
            const training = [
              "professional development",
              "technical certification",
              "workshop",
              "conference tickets",
              "team training",
            ];
            const trainingType =
              training[Math.floor(Math.random() * training.length)];
            description = `${trainingType} for staff`;
          } else if (randomCategory.name === "Professional Services") {
            const services = [
              "consulting",
              "legal services",
              "accounting services",
              "IT support",
              "security audit",
            ];
            const service =
              services[Math.floor(Math.random() * services.length)];
            description = `Payment for ${service}`;
          } else {
            description = `Miscellaneous ${randomCategory.name.toLowerCase()} expense`;
          }
        } else {
          description = `Miscellaneous operating expense for ${costCenter.name}`;
        }

        await createTransaction(
          "expense",
          new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
          miscAmount,
          description,
          randomCategory?.id || null,
          costCenter.id,
          null
        );
      }

      // 7. INCOME TRANSACTIONS - Certain departments generate revenue
      if (
        costCenter.name.includes("Sales") ||
        costCenter.departmentId === null ||
        Math.random() < 0.3
      ) {
        // 30% chance for other departments to generate some income

        const incomeCount = costCenter.name.includes("Sales")
          ? 5 + Math.floor(Math.random() * 5) // 5-9 income transactions for sales
          : Math.floor(Math.random() * 3); // 0-2 for others

        for (let j = 0; j < incomeCount; j++) {
          const day = 1 + Math.floor(Math.random() * 28);

          // Income tends to be higher in certain months (Q4)
          let incomeFactor = seasonalFactor;

          // Base income is proportional to department budget
          const incomeBase = monthlyBudget * (0.2 + Math.random() * 0.4);
          const incomeAmount = incomeBase * incomeFactor * growthFactor;

          // A few large transactions or many small ones
          const finalAmount =
            Math.random() < 0.2
              ? incomeAmount * 3 // 20% chance of large transaction
              : incomeAmount;

          let incomeDescription;
          if (costCenter.name.includes("Sales")) {
            const products = [
              "software license",
              "consulting package",
              "support contract",
              "implementation services",
              "maintenance agreement",
            ];
            const product =
              products[Math.floor(Math.random() * products.length)];
            incomeDescription = `Revenue from ${product} sale`;
          } else {
            incomeDescription = `Miscellaneous revenue for ${costCenter.name}`;
          }

          await createTransaction(
            "income",
            new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
            finalAmount,
            incomeDescription,
            serviceRevenueCat?.id || null,
            costCenter.id,
            null
          );
        }
      }
    }

    // 8. QUARTERLY EXPENSES - Some expenses happen quarterly
    for (const quarter of quarters) {
      if (travelCat) {
        // Quarterly business travel
        const travelBase = monthlyBudget * 0.15; // 15% of monthly budget
        const travelAmount = travelBase * (0.8 + Math.random() * 0.4); // 80-120% of base amount

        const travelDay = 10 + Math.floor(Math.random() * 15); // Between 10th-25th of first month
        const travelMonth = quarter.getMonth();
        const travelYear = quarter.getFullYear();

        await createTransaction(
          "expense",
          new Date(travelYear, travelMonth, travelDay),
          travelAmount,
          `Quarterly business travel expenses for ${format(
            quarter,
            "QQQ yyyy"
          )}`,
          travelCat.id,
          costCenter.id,
          null
        );
      }

      // Quarterly reviews/adjustments - may lead to transfers between cost centers
      if (Math.random() < 0.4 && transferCat) {
        // 40% chance each quarter
        for (const otherCenter of activeCostCenters) {
          if (otherCenter.id !== costCenter.id && Math.random() < 0.3) {
            // 30% chance for each pair
            const transferAmount =
              monthlyBudget * (0.05 + Math.random() * 0.15); // 5-20% of monthly budget

            const transferDescription = `Quarterly budget reallocation from ${costCenter.name} to ${otherCenter.name}`;

            // Create the outgoing transfer
            await createTransaction(
              "transfer",
              new Date(quarter.getFullYear(), quarter.getMonth() + 2, 28), // End of quarter
              transferAmount,
              transferDescription + " (outgoing)",
              transferCat.id,
              costCenter.id,
              null
            );

            // Create the incoming transfer
            await createTransaction(
              "transfer",
              new Date(quarter.getFullYear(), quarter.getMonth() + 2, 28), // End of quarter
              transferAmount,
              transferDescription + " (incoming)",
              transferCat.id,
              otherCenter.id,
              null
            );
          }
        }
      }
    }

    // 9. ANNUAL EXPENSES - Some big expenses happen once a year
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    for (const year of [lastYear, currentYear]) {
      // Annual insurance payment
      if (professionalServicesCat) {
        const insuranceAmount = monthlyBudget * 1.2; // 120% of monthly budget

        await createTransaction(
          "expense",
          new Date(year, 1, 15), // February 15th
          insuranceAmount,
          `Annual insurance premium payment for ${year}`,
          professionalServicesCat.id,
          costCenter.id,
          null
        );
      }

      // Annual company retreat (only for certain cost centers)
      if (Math.random() < 0.3 && travelCat) {
        const retreatAmount = monthlyBudget * 2; // 2x monthly budget

        await createTransaction(
          "expense",
          new Date(year, 5, 15), // June 15th
          retreatAmount,
          `Annual team building retreat expenses for ${year}`,
          travelCat.id,
          costCenter.id,
          null
        );
      }
    }
  }

  // Generate project-specific transactions
  for (const project of activeProjects) {
    // Skip projects without start dates or budgets
    if (!project.startDate || !project.budget) {
      continue;
    }

    // Define project timespan
    const projectStart = new Date(project.startDate);
    let projectEnd =
      project.actualEndDate ||
      project.targetEndDate ||
      addMonths(new Date(), 3);
    if (!projectEnd) {
      projectEnd = addMonths(projectStart, 6); // Default to 6 month projects
    }

    // Ensure projectEnd is a Date object
    if (!(projectEnd instanceof Date)) {
      projectEnd = new Date(projectEnd);
    }

    // For projects that started before our data range, adjust start
    const effectiveStart = startDate > projectStart ? startDate : projectStart;
    // For projects that end after our data range, adjust end
    const effectiveEnd = endDate < projectEnd ? endDate : projectEnd;

    // Skip if project is completely outside our date range
    if (effectiveStart > effectiveEnd) {
      continue;
    }

    // Calculate project months
    const projectMonths = eachMonthOfInterval({
      start: effectiveStart,
      end: effectiveEnd,
    });

    // Total project budget
    const projectBudget = project.budget;

    // Project budget distribution pattern based on status
    let budgetDistribution: number[] = [];

    // Calculate distribution pattern (0-100%) across months
    if (project.status === "planning") {
      // Planning projects have minimal early expenses
      budgetDistribution = projectMonths.map((_, i) =>
        i === 0 ? 0.05 : i === 1 ? 0.1 : 0.02
      );
    } else if (project.status === "active") {
      // Active projects follow a bell curve with more expenses in middle
      const midpoint = projectMonths.length / 2;
      budgetDistribution = projectMonths.map((_, i) => {
        const distFromMid = Math.abs(i - midpoint) / midpoint;
        return 0.1 + 0.2 * (1 - distFromMid);
      });
    } else if (project.status === "completed") {
      // Completed projects had higher early expenses and diminishing later ones
      budgetDistribution = projectMonths.map((_, i, arr) => {
        const normalizedPosition = i / arr.length;
        // Higher expenses in first 2/3, then tapering off
        return normalizedPosition < 0.7
          ? 0.15 - normalizedPosition * 0.05
          : 0.1 - normalizedPosition * 0.05;
      });
    }

    // Normalize the distribution to sum to 90% (leaving 10% for random expenses)
    const sum = budgetDistribution.reduce((a, b) => a + b, 0);
    budgetDistribution = budgetDistribution.map((v) => (v / sum) * 0.9);

    // For each month in the project timeframe
    for (let i = 0; i < projectMonths.length; i++) {
      const month = projectMonths[i];
      const monthBudget = projectBudget * budgetDistribution[i];

      if (monthBudget < 100) continue; // Skip minimal budget months

      // Staff expenses (~60% of month budget)
      const staffExpense = monthBudget * 0.6 * (0.9 + Math.random() * 0.2);

      await createTransaction(
        "expense",
        new Date(month.getFullYear(), month.getMonth(), 15),
        staffExpense,
        `Project staff costs for ${project.name} - ${format(
          month,
          "MMMM yyyy"
        )}`,
        salaryCat?.id || null,
        null,
        project.id
      );

      // Equipment/materials (~20% of month budget, but not every month)
      if (Math.random() < 0.7 && equipmentCat) {
        const equipmentExpense =
          monthBudget * 0.2 * (0.8 + Math.random() * 0.4);

        await createTransaction(
          "expense",
          new Date(month.getFullYear(), month.getMonth(), 10),
          equipmentExpense,
          `Project equipment and materials for ${project.name}`,
          equipmentCat.id,
          null,
          project.id
        );
      }

      // Misc project expenses (10-15%)
      const miscCount = 1 + Math.floor(Math.random() * 3); // 1-3 misc expenses per month
      for (let j = 0; j < miscCount; j++) {
        const miscAmount = monthBudget * 0.05 * (0.7 + Math.random() * 0.6);
        const day = 1 + Math.floor(Math.random() * 28);

        // Random expense category
        const randomCat =
          categories.categoriesByType.expense[
            Math.floor(
              Math.random() * categories.categoriesByType.expense.length
            )
          ];

        await createTransaction(
          "expense",
          new Date(month.getFullYear(), month.getMonth(), day),
          miscAmount,
          `Miscellaneous expenses for ${project.name}`,
          randomCat?.id || null,
          null,
          project.id
        );
      }
    }

    // Client payments for projects with clients (income)
    if (project.clientId && clientPaymentCat) {
      let paymentSchedule: any[] = [];

      if (project.status === "completed") {
        // Completed projects have all payments
        // Determine number of payments based on project duration
        const durationMonths = projectMonths.length;
        const paymentCount = Math.max(
          2,
          Math.min(Math.ceil(durationMonths / 2), 5)
        );

        // Create payment schedule
        paymentSchedule = Array(paymentCount)
          .fill(0)
          .map((_, i) => {
            const position = i / (paymentCount - 1); // 0 to 1
            const monthIndex = Math.floor(
              position * (projectMonths.length - 1)
            );
            const month = projectMonths[monthIndex];

            // Payment is roughly project budget / payment count, with some variation
            const basePayment = projectBudget / paymentCount;
            const amount = basePayment * (0.95 + Math.random() * 0.1);

            return {
              date: new Date(
                month.getFullYear(),
                month.getMonth(),
                15 + Math.floor(Math.random() * 10)
              ),
              amount,
              isInitial: i === 0,
              isFinal: i === paymentCount - 1,
            };
          });
      } else if (project.status === "active") {
        // Active projects have initial payment and maybe some progress payments
        const durationMonths = projectMonths.length;
        const progressPaymentCount = Math.min(
          2,
          Math.floor(durationMonths / 3)
        );

        // Initial payment (30-40% of budget)
        paymentSchedule.push({
          date: new Date(
            projectMonths[0].getFullYear(),
            projectMonths[0].getMonth(),
            5 + Math.floor(Math.random() * 10)
          ),
          amount: projectBudget * (0.3 + Math.random() * 0.1),
          isInitial: true,
          isFinal: false,
        });

        // Progress payments
        for (let i = 0; i < progressPaymentCount; i++) {
          const monthIndex = Math.floor(
            ((i + 1) * projectMonths.length) / (progressPaymentCount + 2)
          );
          if (monthIndex < projectMonths.length) {
            const month = projectMonths[monthIndex];
            paymentSchedule.push({
              date: new Date(
                month.getFullYear(),
                month.getMonth(),
                15 + Math.floor(Math.random() * 10)
              ),
              amount: projectBudget * (0.15 + Math.random() * 0.1), // 15-25% each progress payment
              isInitial: false,
              isFinal: false,
            });
          }
        }
      } else if (project.status === "planning") {
        // Planning projects might have a small initial payment
        if (Math.random() < 0.5) {
          paymentSchedule.push({
            date: new Date(
              projectMonths[0].getFullYear(),
              projectMonths[0].getMonth(),
              5 + Math.floor(Math.random() * 10)
            ),
            amount: projectBudget * (0.1 + Math.random() * 0.1), // 10-20% initial payment
            isInitial: true,
            isFinal: false,
          });
        }
      }

      // Create income transactions for the payments
      for (const payment of paymentSchedule) {
        // Only create if the payment date is within our data range
        if (payment.date >= startDate && payment.date <= endDate) {
          let description = "";

          if (payment.isInitial) {
            description = `Initial payment for project: ${project.name}`;
          } else if (payment.isFinal) {
            description = `Final payment for completed project: ${project.name}`;
          } else {
            description = `Progress payment for project: ${project.name}`;
          }

          await createTransaction(
            "income",
            payment.date,
            payment.amount,
            description,
            clientPaymentCat.id,
            null,
            project.id,
            true // Always approved
          );
        }
      }
    }
  }

  // Generate quarterly special transactions
  for (const quarter of quarters) {
    // Tax payments (Q1, Q2, Q3, Q4)
    if (professionalServicesCat) {
      const taxMonth = quarter.getMonth();
      const taxYear = quarter.getFullYear();

      // Get company-wide cost center for tax payments
      const companyCostCenter = activeCostCenters.find(
        (c) => c.name === "Office Infrastructure"
      );

      if (companyCostCenter) {
        // Calculate tax amount based on company size (total budgets)
        const totalBudgets = activeCostCenters.reduce(
          (sum, cc) => sum + cc.budget,
          0
        );
        const quarterlyTaxAmount = totalBudgets * 0.05; // 5% of total budgets

        await createTransaction(
          "expense",
          new Date(taxYear, taxMonth + 2, 25), // End of quarter
          quarterlyTaxAmount,
          `Quarterly tax payment - ${format(quarter, "QQQ yyyy")}`,
          professionalServicesCat.id,
          companyCostCenter.id,
          null
        );
      }
    }

    // Dividend payments to shareholders (once per quarter, if profitable)
    if (Math.random() < 0.7 && professionalServicesCat) {
      // 70% of quarters have dividend payments
      const companyCostCenter = activeCostCenters.find(
        (c) => c.name === "Corporate Events"
      );

      if (companyCostCenter) {
        const quarterlyDividendAmount =
          activeCostCenters.reduce((sum, cc) => sum + cc.budget, 0) * 0.02; // 2% of total budgets

        await createTransaction(
          "expense",
          new Date(quarter.getFullYear(), quarter.getMonth() + 2, 15), // Mid-end of quarter
          quarterlyDividendAmount,
          `Quarterly dividend payment to shareholders - ${format(
            quarter,
            "QQQ yyyy"
          )}`,
          professionalServicesCat.id,
          companyCostCenter.id,
          null
        );
      }
    }

    // Quarterly planning/strategy expenses
    const planningCostCenter = activeCostCenters.find(
      (c) => c.departmentId !== null
    );
    if (planningCostCenter && professionalServicesCat) {
      const planningExpense = planningCostCenter.budget * 0.03; // 3% of budget

      await createTransaction(
        "expense",
        new Date(quarter.getFullYear(), quarter.getMonth(), 5), // Beginning of quarter
        planningExpense,
        `Quarterly planning and strategy session - ${format(
          quarter,
          "QQQ yyyy"
        )}`,
        professionalServicesCat.id,
        planningCostCenter.id,
        null
      );
    }
  }

  // Generate annual special transactions
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  for (const year of [previousYear, currentYear]) {
    // Annual audit fees
    const auditCostCenter = activeCostCenters.find(
      (c) => c.name === "Office Infrastructure"
    );
    if (auditCostCenter && professionalServicesCat) {
      const totalBudgets = activeCostCenters.reduce(
        (sum, cc) => sum + cc.budget,
        0
      );
      const auditFee = totalBudgets * 0.01; // 1% of total budgets

      await createTransaction(
        "expense",
        new Date(year, 2, 15), // March 15th
        auditFee,
        `Annual financial audit fees for ${year}`,
        professionalServicesCat.id,
        auditCostCenter.id,
        null
      );
    }

    // Annual holiday party
    const partyCostCenter = activeCostCenters.find(
      (c) => c.name === "Corporate Events"
    );
    if (partyCostCenter && officeSuppliesCat) {
      const employeeCount = userIds.length;
      const partyBudget = employeeCount * 150; // $150 per employee

      await createTransaction(
        "expense",
        new Date(year, 11, 15), // December 15th
        partyBudget,
        `Annual holiday party expenses for ${year}`,
        officeSuppliesCat.id,
        partyCostCenter.id,
        null
      );
    }

    // Annual software license renewals (major expenses)
    const softwareCostCenter = activeCostCenters.find(
      (c) => c.name === "Software Licenses"
    );
    if (softwareCostCenter && softwareCat) {
      const employeeCount = userIds.length;
      const licenseCost = employeeCount * 800; // $800 per employee for major software

      await createTransaction(
        "expense",
        new Date(year, 5, 30), // June 30th
        licenseCost,
        `Annual enterprise software license renewals for ${year}`,
        softwareCat.id,
        softwareCostCenter.id,
        null
      );
    }
  }
}
