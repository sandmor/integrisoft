import { db } from "../db";
import { TestDataOptions, TestDataResult } from "./types";

// Import all data generators
import { clearAllData } from "./cleanup";
import {
  generateUsers,
  generateDepartmentsAndPositions,
  generateSkills,
  generateEmployees,
  generateEmployeeSkills,
  assignDepartmentManagers,
} from "./users";
import {
  generateCostCenters,
  generateTransactionCategories,
  generateBudgets,
  generateTransactions,
} from "./finance";
import {
  generateProducts,
  generateProductVersions,
  generateTechnicalSpecs,
  generateProductDependencies,
} from "./products";
import {
  generateClients,
  generateClientContacts,
  generateContracts,
  generateClientInteractions,
  generateSLAs,
} from "./clients";
import {
  generateProjects,
  generateMilestones,
  generateTasks,
  generateProjectTeamMembers,
} from "./projects";
import { generateSystemSettings } from "./settings";
import { generateMetrics } from "./metrics";
import { generateSavedReports } from "./reports";
import { generateNotifications } from "./notifications";
import { generateActivities } from "./activities";

// This function generates a complete fictional company with test data
export async function populateTestData(
  options: TestDataOptions
): Promise<TestDataResult> {
  // Default options
  const config = {
    userCount: 50,
    departmentCount: 8,
    productCount: 12,
    clientCount: 15,
    projectCount: 20,
    resetData: false,
    ...options,
  };

  console.log("Starting database population with test data...");

  // Start a transaction to ensure all data is inserted atomically
  return await db.transaction(async (tx) => {
    // Clear all data if requested
    if (config.resetData) {
      console.log("Clearing existing data...");
      await clearAllData(tx);
    }

    // Generate data in the correct order to maintain relationships
    console.log("Generating users...");
    const userIds = await generateUsers(tx, config.userCount);

    console.log("Generating departments and positions...");
    const { departmentIds, positionIds } =
      await generateDepartmentsAndPositions(tx, config.departmentCount);

    console.log("Generating skills...");
    const skillIds = await generateSkills(tx);

    console.log("Generating employees...");
    const employeeIds = await generateEmployees(
      tx,
      userIds,
      departmentIds,
      positionIds
    );

    console.log("Assigning employee skills...");
    await generateEmployeeSkills(tx, employeeIds, skillIds);

    console.log("Setting department managers...");
    await assignDepartmentManagers(tx, departmentIds, employeeIds);

    console.log("Generating cost centers...");
    const costCenterIds = await generateCostCenters(tx, departmentIds);

    console.log("Generating transaction categories...");
    const categoryIds = await generateTransactionCategories(tx);

    console.log("Generating products...");
    const productIds = await generateProducts(
      tx,
      employeeIds,
      config.productCount
    );

    console.log("Generating product versions...");
    await generateProductVersions(tx, productIds, userIds);

    console.log("Generating technical specifications...");
    await generateTechnicalSpecs(tx, productIds, userIds);

    console.log("Generating product dependencies...");
    await generateProductDependencies(tx, productIds);

    console.log("Generating clients...");
    const clientIds = await generateClients(
      tx,
      employeeIds,
      userIds,
      config.clientCount
    );

    console.log("Generating client contacts...");
    const clientContactIds = await generateClientContacts(tx, clientIds);

    console.log("Generating projects...");
    const projectIds = await generateProjects(
      tx,
      clientIds,
      productIds,
      employeeIds,
      userIds,
      config.projectCount
    );

    console.log("Generating milestones...");
    const milestoneIds = await generateMilestones(tx, projectIds);

    console.log("Generating tasks...");
    await generateTasks(tx, projectIds, milestoneIds, employeeIds, userIds);

    console.log("Generating project team members...");
    await generateProjectTeamMembers(tx, projectIds, employeeIds);

    console.log("Generating contracts...");
    const contractIds = await generateContracts(
      tx,
      clientIds,
      projectIds,
      userIds
    );

    console.log("Generating client interactions...");
    await generateClientInteractions(
      tx,
      clientIds,
      clientContactIds,
      employeeIds,
      userIds
    );

    console.log("Generating service level agreements...");
    await generateSLAs(tx, clientIds, contractIds, userIds);

    console.log("Generating budgets...");
    await generateBudgets(tx, costCenterIds, projectIds, userIds);

    console.log("Generating transactions...");
    await generateTransactions(
      tx,
      categoryIds,
      costCenterIds,
      projectIds,
      userIds
    );

    console.log("Generating system settings...");
    await generateSystemSettings(tx);

    console.log("Generating metrics...");
    await generateMetrics(tx, projectIds, employeeIds);

    console.log("Generating saved reports...");
    await generateSavedReports(tx, userIds);

    console.log("Generating notifications...");
    await generateNotifications(tx, userIds, projectIds);

    console.log("Generating activities feed...");
    await generateActivities(
      tx,
      userIds,
      employeeIds,
      projectIds,
      productIds,
      clientIds
    );

    console.log("Test data generation completed successfully!");

    return {
      userCount: userIds.length,
      departmentCount: departmentIds.length,
      productCount: productIds.length,
      clientCount: clientIds.length,
      projectCount: projectIds.length,
    };
  });
}
