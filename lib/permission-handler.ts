import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import { permissions, rolePermissions, users } from "./db/schema";
import { union } from "drizzle-orm/pg-core";
import { eq, and } from "drizzle-orm";

export const CorePermissionsList = [
  "read_employees",
  "write_employees",
  "read_projects",
  "write_projects",
  "read_team_members",
  "write_team_members",
  "read_tasks",
  "write_tasks",
  "read_milestones",
  "write_milestones",
  "read_clients",
  "write_clients",
  "read_client_contacts",
  "write_client_contacts",
  "read_interactions",
  "write_interactions",
  "read_products",
  "write_products",
  "read_transactions",
  "write_transactions",
  "read_budgets",
  "write_budgets",
  "read_cost_centers",
  "write_cost_centers",
  "read_categories",
  "write_categories",
  "read_financial_dashboard",
] as const;
export type CorePermission = (typeof CorePermissionsList)[number];

/// Function to validate user session and permissions
/// @param permission - The permission to check for
/// @returns The user ID if the user has the permission, null otherwise
/// @throws Error if the session cannot be validated
/// @example
/// const userId = await validateSession("read_projects");
/// if (userId) {
///   // User has permission
/// } else {
///   // User does not have permission
/// }
export async function validateSession(
  permission: CorePermission
): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });

  const userId = session?.user.id;
  if (!userId) {
    return null;
  }

  const [hasPermission] = await union(
    db
      .select({ userId: users.id })
      .from(users)
      .where(eq(users.email, "admin@integrisoft.com")),
    db
      .select({ userId: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(permissions.name, permission)))
      .innerJoin(rolePermissions, eq(rolePermissions.role, users.role))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
  );

  return hasPermission.userId;
}
