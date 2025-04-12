"use server";

import { db } from "@/lib/db";
import { employees, departments, positions, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";

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
};

export type NewEmployeeData = {
  name: string;
  lastName: string;
  email: string;
  department?: string;
  position?: string;
  hireDate: string;
  salary?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type UpdateEmployeeData = NewEmployeeData & {
  id: string;
};

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
    };
  } catch (error) {
    console.error("Error fetching employee:", error);
    return null;
  }
}

export async function createEmployee(
  data: NewEmployeeData
): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation, you would:
    // 1. Create a user record first
    // 2. Link user to employee record
    // 3. Find or create department and position records
    // For now, we'll create a placeholder implementation

    const employeeId = createId();

    await db.insert(employees).values({
      id: employeeId,
      hireDate: new Date(data.hireDate),
      salary: data.salary,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      // In a real implementation, you would link to actual user, department and position IDs
    });

    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (error) {
    console.error("Error creating employee:", error);
    return { success: false, error: "Failed to create employee" };
  }
}

export async function updateEmployee(
  data: UpdateEmployeeData
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(employees)
      .set({
        hireDate: new Date(data.hireDate),
        salary: data.salary,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, data.id));

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
