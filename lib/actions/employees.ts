"use server";

import { db } from "@/lib/db";
import {
  employees,
  departments,
  positions,
  users,
  accounts,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

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

export type Employee = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  department: string | null;
  position: string | null;
  hireDate: Date;
  salary: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  role?: "admin" | "manager" | "employee"; // Added role field
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
  try {
    const result = await db.query.departments.findMany({
      where: (departments, { eq }) => eq(departments.isDeleted, false),
      orderBy: (departments, { asc }) => [asc(departments.name)],
    });

    return result.map((department) => ({
      id: department.id,
      name: department.name,
    }));
  } catch (error) {
    console.error("Error fetching departments:", error);
    return [];
  }
}

// Fetch all positions
export async function getPositions(departmentId?: string): Promise<Position[]> {
  try {
    let query = db.query.positions.findMany({
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
  } catch (error) {
    console.error("Error fetching positions:", error);
    return [];
  }
}

export async function getEmployees(): Promise<Employee[]> {
  try {
    const result = await db.query.employees.findMany({
      with: {
        users: true,
        departments: true,
        positions: true,
      },
      where: (employees, { eq }) => eq(employees.isDeleted, false),
    });

    return result.map((employee) => ({
      id: employee.id,
      name: employee.users?.name || "N/A",
      lastName: employee.users?.lastName || "N/A",
      email: employee.users?.email || "N/A",
      department: employee.departments?.name || null,
      position: employee.positions?.title || null,
      hireDate: employee.hireDate,
      salary: employee.salary ? Number(employee.salary) : null,
      contactEmail: employee.contactEmail || null,
      contactPhone: employee.contactPhone || null,
    }));
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
}

export async function getEmployee(id: string): Promise<Employee | null> {
  try {
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
      name: result.users?.name || "N/A",
      lastName: result.users?.lastName || "N/A",
      email: result.users?.email || "N/A",
      department: result.departments?.name || null,
      position: result.positions?.title || null,
      hireDate: result.hireDate,
      salary: result.salary ? Number(result.salary) : null,
      contactEmail: result.contactEmail || null,
      contactPhone: result.contactPhone || null,
      role:
        (result.users?.role as "admin" | "manager" | "employee") || "employee", // Including the role from users table
    };
  } catch (error) {
    console.error("Error fetching employee:", error);
    return null;
  }
}

export async function createEmployee(
  data: CreateEmployeeData
): Promise<{ success: boolean; error?: string }> {
  try {
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
        name: data.name,
        lastName: data.lastName,
        role: data.role || "employee",
        isActive: true,
        emailVerified: true, // Auto-verify for admin-created accounts
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      });

      // Create account with password
      const hashedPassword = await authContext.password.hash(data.password);
      await tx.insert(accounts).values({
        id: createId(),
        userId: userId,
        providerId: "credentials",
        accountId: data.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Find or create department if provided
      let departmentId = undefined;
      if (data.department) {
        const departmentRecord = await tx.query.departments.findFirst({
          where: (departments, { eq }) =>
            eq(departments.name, data.department!),
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
          where: (positions, { eq }) => eq(positions.title, data.position!),
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
        salary: data.salary,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        departmentId,
        positionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      });
    });

    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (error) {
    console.error("Error creating employee:", error);
    return { success: false, error: "Failed to create employee" };
  }
}

export async function updateEmployee(
  data: NewEmployeeData & { id: string; password?: string; role?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, get the employee record to find the linked userId
    const employeeRecord = await db.query.employees.findFirst({
      where: (employees, { eq }) => eq(employees.id, data.id),
      columns: {
        userId: true,
        departmentId: true,
        positionId: true,
      },
    });

    if (!employeeRecord) {
      return { success: false, error: "Employee not found" };
    }

    // Get auth context for password hashing if needed
    const authContext = await auth.$context;

    // Start a transaction to update both user and employee records
    await db.transaction(async (tx) => {
      // Update the user record if userId exists
      if (employeeRecord.userId) {
        const userData: Record<string, any> = {
          name: data.name,
          lastName: data.lastName,
          email: data.email,
          updatedAt: new Date(),
        };

        // Only update role if provided
        if (data.role) {
          userData.role = data.role;
        }

        await tx
          .update(users)
          .set(userData)
          .where(eq(users.id, employeeRecord.userId));

        // Update password if provided
        if (data.password && data.password.trim() !== "") {
          const hashedPassword = await authContext.password.hash(data.password);

          // Find the account to update
          const userAccount = await tx.query.accounts.findFirst({
            where: (accounts, { eq }) =>
              eq(accounts.userId, employeeRecord.userId!),
          });

          if (userAccount) {
            await tx
              .update(accounts)
              .set({
                password: hashedPassword,
                updatedAt: new Date(),
              })
              .where(eq(accounts.id, userAccount.id));
          }
        }
      }

      // Update department if provided
      let departmentId = employeeRecord.departmentId;
      if (data.department) {
        // Find the department by name
        const departmentRecord = await tx.query.departments.findFirst({
          where: (departments, { eq }) =>
            eq(departments.name, data.department!),
          columns: { id: true },
        });

        departmentId = departmentRecord?.id || departmentId;
      }

      // Update position if provided
      let positionId = employeeRecord.positionId;
      if (data.position) {
        // Find the position by title
        const positionRecord = await tx.query.positions.findFirst({
          where: (positions, { eq }) => eq(positions.title, data.position!),
          columns: { id: true },
        });

        positionId = positionRecord?.id || positionId;
      }

      // Update the employee record
      await tx
        .update(employees)
        .set({
          hireDate: new Date(data.hireDate),
          salary: data.salary,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          departmentId,
          positionId,
          updatedAt: new Date(),
        })
        .where(eq(employees.id, data.id));
    });

    revalidatePath(`/dashboard/employees/${data.id}`);
    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (error) {
    console.error("Error updating employee:", error);
    return { success: false, error: "Failed to update employee" };
  }
}

export async function deleteEmployee(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Soft delete the employee
    await db
      .update(employees)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(employees.id, id));

    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (error) {
    console.error("Error deleting employee:", error);
    return { success: false, error: "Failed to delete employee" };
  }
}
