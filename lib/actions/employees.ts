"use server";

import { db } from "@/lib/db";
import {
  employees,
  departments,
  positions,
  users,
  accounts,
  roles,
  userRoles,
} from "@/lib/db/schema";
import { eq, and, desc, count, ilike, asc, not, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import {
  GetEmployeesParams,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeWithDetails,
  Department,
  Position,
} from "../types/employees";

// Fetch all departments
export async function getDepartments(): Promise<Department[]> {
  const result = await db.query.departments.findMany({
    where: (departments, { eq }) => eq(departments.isDeleted, false),
    orderBy: (departments, { asc }) => [asc(departments.name)],
  });

  return result.map((department) => ({
    id: department.id,
    name: department.name,
  }));
}

// Fetch all positions
export async function getPositions(departmentId?: string): Promise<Position[]> {
  const query = db.query.positions.findMany({
    where: (positions, { eq, and }) =>
      departmentId
        ? and(
            eq(positions.isDeleted, false),
            eq(positions.departmentId, departmentId)
          )
        : eq(positions.isDeleted, false),
    orderBy: (positions, { asc }) => [asc(positions.title)],
  });

  const result = await query;

  return result.map((position) => ({
    id: position.id,
    title: position.title,
    departmentId: position.departmentId || undefined,
  }));
}

export async function getEmployees(options?: GetEmployeesParams): Promise<{
  data: EmployeeWithDetails[];
  count: number;
}> {
  const { page = 0, pageSize = 10, sorts = [], filters = [] } = options || {};

  // Prepare filter conditions
  const filterConditions = [];

  // Always start with isDeleted = false
  filterConditions.push(eq(employees.isDeleted, false));

  // Add filter conditions for each filter
  for (const filter of filters) {
    if (filter.value && filter.value.trim() !== "") {
      switch (filter.field) {
        case "firstName":
          filterConditions.push(ilike(users.name, `%${filter.value}%`));
          break;
        case "lastName":
          filterConditions.push(ilike(users.lastName, `%${filter.value}%`));
          break;
        case "email":
          filterConditions.push(ilike(users.email, `%${filter.value}%`));
          break;
        case "department":
          filterConditions.push(ilike(departments.name, `%${filter.value}%`));
          break;
        case "position":
          filterConditions.push(ilike(positions.title, `%${filter.value}%`));
          break;
        case "status":
          filterConditions.push(
            eq(employees.isDeleted, filter.value === "inactive")
          );
          break;
      }
    }
  }

  // Count total matching records
  const countResult = await db
    .select({ count: count() })
    .from(employees)
    .leftJoin(users, eq(employees.userId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(and(...filterConditions))
    .then((res) => Number(res[0]?.count || 0));

  // Prepare sort parameters
  const sortParams = [];

  if (sorts.length > 0) {
    for (const sort of sorts) {
      switch (sort.field) {
        case "firstName":
          sortParams.push(
            sort.direction === "asc" ? asc(users.name) : desc(users.name)
          );
          break;
        case "lastName":
          sortParams.push(
            sort.direction === "asc"
              ? asc(users.lastName)
              : desc(users.lastName)
          );
          break;
        case "email":
          sortParams.push(
            sort.direction === "asc" ? asc(users.email) : desc(users.email)
          );
          break;
        case "department":
          sortParams.push(
            sort.direction === "asc"
              ? asc(departments.name)
              : desc(departments.name)
          );
          break;
        case "position":
          sortParams.push(
            sort.direction === "asc"
              ? asc(positions.title)
              : desc(positions.title)
          );
          break;
        case "hireDate":
          sortParams.push(
            sort.direction === "asc"
              ? asc(employees.hireDate)
              : desc(employees.hireDate)
          );
          break;
      }
    }
  }

  const employeeRows = await db
    .select({
      id: employees.id,
      firstName: users.name,
      lastName: users.lastName,
      email: users.email,
      department: departments.name,
      position: positions.title,
      hireDate: employees.hireDate,
      salary: employees.salary,
      contactEmail: employees.contactEmail,
      contactPhone: employees.contactPhone,
      isDeleted: employees.isDeleted,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
    })
    .from(employees)
    .leftJoin(users, eq(employees.userId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(and(...filterConditions))
    .orderBy(...sortParams)
    .limit(pageSize)
    .offset(page * pageSize);

  // Extract employee IDs for roles lookup
  const employeeIds = employeeRows.map((r) => r.id);

  const roleRows = await db
    .select({ userId: userRoles.userId, role: roles.name })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, employeeIds));

  // Group roles by userId
  const rolesMap = new Map<string, string[]>();
  for (const { userId, role } of roleRows) {
    if (!rolesMap.has(userId)) rolesMap.set(userId, []);
    if (role !== null) {
      rolesMap.get(userId)!.push(role);
    }
  }

  // Combine core employee data with roles
  const data = employeeRows.map((row) => ({
    id: row.id,
    firstName: row.firstName || "N/A",
    lastName: row.lastName || "N/A",
    email: row.email || "N/A",
    department: row.department || "",
    position: row.position || "",
    hireDate: row.hireDate.toISOString(),
    salary: row.salary ?? undefined,
    contactEmail: row.contactEmail ?? undefined,
    contactPhone: row.contactPhone ?? undefined,
    isDeleted: row.isDeleted,
    roles: rolesMap.get(row.id) || [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return {
    data,
    count: countResult,
  };
}

export async function getEmployeeById(
  id: string
): Promise<EmployeeWithDetails | null> {
  const result = await db
    .select({
      id: employees.id,
      firstName: users.name,
      lastName: users.lastName,
      email: users.email,
      department: departments.name,
      position: positions.title,
      hireDate: employees.hireDate,
      salary: employees.salary,
      contactEmail: employees.contactEmail,
      contactPhone: employees.contactPhone,
      isDeleted: employees.isDeleted,
      role: roles.name,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
    })
    .from(employees)
    .leftJoin(users, eq(employees.userId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(userRoles, eq(employees.userId, userRoles.userId))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(employees.id, id), not(eq(employees.isDeleted, true))));

  if (result.length === 0) return null;
  const employee = result[0];
  const rolesList = result.map((r) => r.role).filter((r) => r !== null);

  return {
    id: employee.id,
    firstName: employee.firstName || "N/A",
    lastName: employee.lastName || "N/A",
    email: employee.email || "N/A",
    department: employee.department || "",
    position: employee.position || "",
    isDeleted: employee.isDeleted,
    hireDate: employee.hireDate.toISOString(),
    contactPhone: employee.contactPhone ?? undefined,
    contactEmail: employee.contactEmail ?? undefined,
    salary: employee.salary ?? undefined,
    roles: rolesList,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

export async function createEmployee(
  data: CreateEmployeeRequest
): Promise<string> {
  // Get auth context for password hashing
  const authContext = await auth.$context;
  const userId = createId();
  const employeeId = createId();

  // Start a transaction to create both user and employee records
  await db.transaction(async (tx) => {
    // Create user record
    await tx.insert(users).values({
      id: userId,
      email: data.email,
      name: data.firstName, // Map firstName to name
      lastName: data.lastName,
      isActive: true,
      emailVerified: true, // Auto-verify for admin-created accounts
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });

    // Create account with password if needed
    const hashedPassword = await authContext.password.hash(data.password);
    await tx.insert(accounts).values({
      id: createId(),
      userId: userId,
      providerId: "credential",
      accountId: data.email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Find or create department if provided
    let departmentId = undefined;
    if (data.department) {
      const departmentRecord = await tx.query.departments.findFirst({
        where: (departments, { eq }) => eq(departments.name, data.department),
      });

      if (departmentRecord) {
        departmentId = departmentRecord.id;
      } else {
        // Create new department if it doesn't exist
        const newDeptId = createId();
        await tx.insert(departments).values({
          id: newDeptId,
          name: data.department,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
        });
        departmentId = newDeptId;
      }
    }

    // Find or create position if provided
    let positionId = undefined;
    if (data.position) {
      const positionRecord = await tx.query.positions.findFirst({
        where: (positions, { eq }) => eq(positions.title, data.position),
      });

      if (positionRecord) {
        positionId = positionRecord.id;
      } else {
        // Create new position if it doesn't exist
        const newPosId = createId();
        await tx.insert(positions).values({
          id: newPosId,
          title: data.position,
          departmentId,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
        });
        positionId = newPosId;
      }
    }

    // Create employee record
    await tx.insert(employees).values({
      id: employeeId,
      userId: userId,
      hireDate: new Date(data.hireDate),
      isDeleted: false,
      salary: data.salary,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      departmentId,
      positionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Get requested roles ids
    const rolesQuery = await db
      .select({
        id: roles.id,
        name: roles.name,
      })
      .from(roles)
      .where(inArray(roles.name, data.roles));

    const roleIds = rolesQuery.map((role) => role.id);
    // Insert roles for the user
    for (const roleId of roleIds) {
      await tx.insert(userRoles).values({
        userId: userId,
        roleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });

  return employeeId;
}

export async function updateEmployee(
  data: UpdateEmployeeRequest
): Promise<string> {
  // Get auth context for password hashing if needed
  const authContext = await auth.$context;

  // Fetch existing employee to get userId and current department/position
  const employeeRecord = await db.query.employees.findFirst({
    where: (employees, { eq }) => eq(employees.id, data.id),
  });
  if (!employeeRecord) throw new Error("Employee not found");
  const userId = employeeRecord.userId!;

  // Perform updates in a transaction
  await db.transaction(async (tx) => {
    // Update user record
    const userUpdates: any = { updatedAt: new Date() };
    if (data.firstName) userUpdates.name = data.firstName;
    if (data.lastName) userUpdates.lastName = data.lastName;
    if (data.email) userUpdates.email = data.email;
    await tx.update(users).set(userUpdates).where(eq(users.id, userId));

    // Update account credentials if email or password changed
    if (data.email || data.password) {
      const accountUpdates: any = { updatedAt: new Date() };
      if (data.email) accountUpdates.accountId = data.email;
      if (data.password) {
        const hashed = await authContext.password.hash(data.password);
        accountUpdates.password = hashed;
      }
      await tx
        .update(accounts)
        .set(accountUpdates)
        .where(
          and(
            eq(accounts.userId, userId),
            eq(accounts.providerId, "credential")
          )
        );
    }

    // Determine departmentId
    let departmentId = employeeRecord.departmentId;
    if (data.department) {
      const dept = await tx.query.departments.findFirst({
        where: (departments, { eq }) => eq(departments.name, data.department!),
      });
      if (dept) departmentId = dept.id;
      else {
        const newDeptId = createId();
        await tx.insert(departments).values({
          id: newDeptId,
          name: data.department,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
        });
        departmentId = newDeptId;
      }
    }

    // Determine positionId
    let positionId = employeeRecord.positionId;
    if (data.position) {
      const pos = await tx.query.positions.findFirst({
        where: (positions, { eq }) => eq(positions.title, data.position!),
      });
      if (pos) positionId = pos.id;
      else {
        const newPosId = createId();
        await tx.insert(positions).values({
          id: newPosId,
          title: data.position,
          departmentId,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
        });
        positionId = newPosId;
      }
    }

    // Update employee record
    const empUpdates: any = { updatedAt: new Date(), departmentId, positionId };
    if (data.hireDate) empUpdates.hireDate = new Date(data.hireDate);
    if (data.salary !== undefined) empUpdates.salary = data.salary;
    if (data.contactEmail !== undefined)
      empUpdates.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined)
      empUpdates.contactPhone = data.contactPhone;
    await tx.update(employees).set(empUpdates).where(eq(employees.id, data.id));

    // Update roles
    if (data.roles) {
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));
      const rolesQuery = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(inArray(roles.name, data.roles));
      const roleIds = rolesQuery.map((r) => r.id);
      for (const roleId of roleIds) {
        await tx.insert(userRoles).values({
          userId: userId,
          roleId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  });

  return data.id;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  // Soft delete the employee
  await db
    .update(employees)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(employees.id, id));

  return true;
}

// Fetch all roles
export async function getRoles(): Promise<string[]> {
  const result = await db.query.roles.findMany({
    orderBy: (roles, { asc }) => [asc(roles.name)],
  });

  return result.map((role) => role.name);
}
