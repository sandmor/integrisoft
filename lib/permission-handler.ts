import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import {
  accessLevelEnum,
  moduleTypeEnum,
  permissions,
  rolePermissions,
  userRoles,
  users,
} from "./db/schema";
import { union } from "drizzle-orm/pg-core";
import { eq, and, not, gte } from "drizzle-orm";

/// Function to validate user session and permissions
/// @param module The module to check permissions for
/// @param accessLevel The access level to check permissions for
/// @returns The user ID if the user has the permission, null otherwise
/// @throws Error if the session cannot be validated
/// @example
/// const userId = await validateSession("projects", "read");
/// if (userId) {
///   // User has permission
/// } else {
///   // User does not have permission
/// }
export async function validateSession(
  module: (typeof moduleTypeEnum.enumValues)[number],
  accessLevel: (typeof accessLevelEnum.enumValues)[number]
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
      .where(eq(users.email, "admin@integrisoft.com")), // Make sure that there is always an admin user
    db
      .select({ userId: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          not(eq(users.isDeleted, true)),
          eq(permissions.module, module),
          gte(permissions.accessLevel, accessLevel)
        )
      )
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
  ).limit(1);
  return hasPermission.userId;
}

/**
 * Get all modules a user has at least "read" access to
 * @param userId Optional user ID to check permissions for, defaults to current user from session
 * @returns Array of module names the user has permission to access
 */
export async function getUserAccessibleModules(
  userId?: string
): Promise<(typeof moduleTypeEnum.enumValues)[number][]> {
  // If no userId is provided, get it from the session
  let userIdToUse = userId;
  if (!userIdToUse) {
    const session = await auth.api.getSession({ headers: await headers() });
    userIdToUse = session?.user?.id;
  }

  // If still no userId, return empty array (no permissions)
  if (!userIdToUse) {
    return [];
  }

  // Check if this is an admin user (always has access to everything)
  const adminUser = await db
    .select()
    .from(users)
    .where(
      and(eq(users.id, userIdToUse), eq(users.email, "admin@integrisoft.com"))
    )
    .limit(1);

  if (adminUser.length > 0) {
    // Admin user has access to all modules
    return [...moduleTypeEnum.enumValues];
  }

  // Get all modules the user has at least "read" permission for
  const userModules = await db
    .selectDistinct({ module: permissions.module })
    .from(users)
    .where(
      and(
        eq(users.id, userIdToUse),
        not(eq(users.isDeleted, true)),
        gte(permissions.accessLevel, "read")
      )
    )
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId));

  return userModules.map(
    (item: { module: (typeof moduleTypeEnum.enumValues)[number] }) =>
      item.module
  );
}
