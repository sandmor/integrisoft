import { NextRequest, NextResponse } from "next/server";
import {
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "@/lib/actions/employees";
import { tryCatch } from "@/lib/error-handler";
import { validateSession } from "@/lib/permission-handler";
import { Employee, UpdateEmployeeRequest } from "@/lib/types/employees";
import { revalidatePath } from "next/cache";

// GET /api/employees/[id] - Get employee by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("user", "read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const employee = await tryCatch(() => getEmployeeById(id), {
      customErrorMessage: "Failed to fetch employee data",
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee as Employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// PATCH /api/employees/[id] - Update an employee
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("user", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const data = (await req.json()) as UpdateEmployeeRequest;
    await tryCatch(
      () =>
        updateEmployee({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          position: data.position,
          department: data.department,
          hireDate: data.hireDate,
          salary: data.salary,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          roles: data.roles,
          id,
        }),
      {
        customErrorMessage: "Failed to update employee",
      }
    );

    const updatedEmployee = await getEmployeeById(id);

    // Revalidate relevant paths
    revalidatePath("/dashboard/employees");
    revalidatePath(`/dashboard/employees/${id}`);

    return NextResponse.json(updatedEmployee as Employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] - Delete an employee
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("user", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    await tryCatch(() => deleteEmployee(id), {
      customErrorMessage: "Failed to delete employee",
    });

    // Revalidate relevant paths
    revalidatePath("/dashboard/employees");
    revalidatePath(`/dashboard/employees/${id}`);
    revalidatePath(`/dashboard/employees/${id}/*`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
