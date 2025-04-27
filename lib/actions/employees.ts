"use server";

import { db } from "@/lib/db";
import {
  employees,
  departments,
  positions,
  users,
  accounts,
} from "@/lib/db/schema";
import { eq, and, desc, count, ilike, asc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/lib/auth";
import {
  GetEmployeesParams,
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeWithDetails,
} from "../types/employees";

// Department type
export type Department = {
  id: string;
  name: string;
};

// Position type
export type Position = {
  id: string;
  title: string;
  departmentId?: string;
};

export type NewEmployeeData = {
  name: string;
  lastName: string;
  email: string;
  department?: string;
  position?: string;
  hireDate: Date;
  salary?: string;
  contactEmail?: string;
  contactPhone?: string;
};

// New type for creating an employee with user account
export type CreateEmployeeData = NewEmployeeData & {
  password: string;
  role?: "admin" | "manager" | "employee";
};

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
  data: Employee[];
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

  // Build the final query with all filters, sorts, and pagination
  const finalQuery = db
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
      status: employees.isDeleted,
    })
    .from(employees)
    .leftJoin(users, eq(employees.userId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(and(...filterConditions))
    .orderBy(...sortParams)
    .limit(pageSize)
    .offset(page * pageSize);

  // Execute the query
  const results = await finalQuery;

  // Map the results to the Employee type
  const data: Employee[] = results.map((employee) => ({
    id: employee.id,
    firstName: employee.firstName || "N/A",
    lastName: employee.lastName || "N/A",
    email: employee.email || "N/A",
    department: employee.department || "",
    position: employee.position || "",
    hireDate: employee.hireDate.toISOString(),
    status: employee.status ? "inactive" : "active",
    // Include optional fields
    userId: undefined, // Not exposed in API
    createdAt: undefined,
    updatedAt: undefined,
  }));

  return {
    data,
    count: countResult,
  };
}

export async function getEmployeeById(
  id: string
): Promise<EmployeeWithDetails | null> {
  const result = await db.query.employees.findFirst({
    with: {
      users: true,
      departments: true,
      positions: true,
    },
    where: (employees, { eq, and }) =>
      and(eq(employees.id, id), eq(employees.isDeleted, false)),
  });

  if (!result) return null;

  return {
    id: result.id,
    firstName: result.users?.name || "N/A",
    lastName: result.users?.lastName || "N/A",
    email: result.users?.email || "N/A",
    department: result.departments?.name || "",
    position: result.positions?.title || "",
    status: result.isDeleted
      ? "inactive"
      : ("active" as "active" | "inactive" | "on-leave"),
    hireDate: result.hireDate.toISOString(),
    userId: result.userId || undefined,
    contactPhone: result.contactPhone || undefined,
    contactEmail: result.contactEmail || undefined,
    salary: result.salary || undefined,
    role:
      (result.users?.role as "admin" | "manager" | "employee") || "employee",
    createdAt: result.createdAt?.toISOString(),
    updatedAt: result.updatedAt?.toISOString(),
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
      role: "employee", // Default role
      isActive: true,
      emailVerified: true, // Auto-verify for admin-created accounts
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    });

    // Create account with password if needed
    // (simplified for now, may need to be updated based on your auth implementation)
    const hashedPassword = await authContext.password.hash(
      "temporary-password"
    );
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
      // Use isDeleted to track status
      isDeleted: data.status === "inactive",
      contactEmail: data.email,
      departmentId,
      positionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  return employeeId;
}

export async function updateEmployee(
  id: string,
  data: UpdateEmployeeRequest
): Promise<string> {
  // First, get the employee record to find the linked userId
  const employeeRecord = await db.query.employees.findFirst({
    where: (employees, { eq }) => eq(employees.id, id),
    columns: {
      userId: true,
      departmentId: true,
      positionId: true,
    },
  });

  if (!employeeRecord) {
    throw new Error("Employee not found");
  }

  // Get auth context for password hashing if needed
  const authContext = await auth.$context;

  // Start a transaction to update both user and employee records
  await db.transaction(async (tx) => {
    // Update the user record if userId exists
    if (employeeRecord.userId) {
      const userData: Record<string, any> = {
        name: data.firstName,
        lastName: data.lastName,
        email: data.email,
        updatedAt: new Date(),
      };

      await tx
        .update(users)
        .set(userData)
        .where(eq(users.id, employeeRecord.userId));
    }

    // Update department if provided
    let departmentId = employeeRecord.departmentId;
    if (data.department) {
      // Find the department by name
      const departmentRecord = await tx.query.departments.findFirst({
        where: (departments, { eq }) => eq(departments.name, data.department),
        columns: { id: true },
      });

      departmentId = departmentRecord?.id || departmentId;
    }

    // Update position if provided
    let positionId = employeeRecord.positionId;
    if (data.position) {
      // Find the position by title
      const positionRecord = await tx.query.positions.findFirst({
        where: (positions, { eq }) => eq(positions.title, data.position),
        columns: { id: true },
      });

      positionId = positionRecord?.id || positionId;
    }

    // Update the employee record
    await tx
      .update(employees)
      .set({
        hireDate: new Date(data.hireDate),
        isDeleted: data.status === "inactive",
        departmentId,
        positionId,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id));
  });

  return id;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  // Soft delete the employee
  await db
    .update(employees)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(employees.id, id));

  return true;
}
