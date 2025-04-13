import * as schema from "../db/schema";
import { db } from "../db";

// Clear all data from all tables
export async function clearAllData(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
) {
  // Delete in reverse order of dependencies
  await tx.delete(schema.notifications).execute();
  await tx.delete(schema.savedReports).execute();
  await tx.delete(schema.metrics).execute();
  await tx.delete(schema.systemSettings).execute();
  await tx.delete(schema.changeHistory).execute();
  await tx.delete(schema.activitiesFeed).execute();
  await tx.delete(schema.serviceLevelAgreements).execute();
  await tx.delete(schema.clientInteractions).execute();
  await tx.delete(schema.contracts).execute();
  await tx.delete(schema.projectTeamMembers).execute();
  await tx.delete(schema.tasks).execute();
  await tx.delete(schema.milestones).execute();
  await tx.delete(schema.transactions).execute();
  await tx.delete(schema.budgets).execute();
  await tx.delete(schema.projects).execute();
  await tx.delete(schema.clientContacts).execute();
  await tx.delete(schema.clients).execute();
  await tx.delete(schema.productDependencies).execute();
  await tx.delete(schema.technicalSpecs).execute();
  await tx.delete(schema.productVersions).execute();
  await tx.delete(schema.products).execute();
  await tx.delete(schema.transactionCategories).execute();
  await tx.delete(schema.costCenters).execute();
  await tx.delete(schema.employeeSkills).execute();
  await tx.delete(schema.employees).execute();
  await tx.delete(schema.skills).execute();
  await tx.delete(schema.positions).execute();
  await tx.delete(schema.departments).execute();
  await tx.delete(schema.rolePermissions).execute();
  await tx.delete(schema.permissions).execute();
  await tx.delete(schema.verifications).execute();
  await tx.delete(schema.accounts).execute();
  await tx.delete(schema.sessions).execute();
  await tx.delete(schema.users).execute();
}
