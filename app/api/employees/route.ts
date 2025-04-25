import { NextRequest, NextResponse } from "next/server";
import {
  getEmployees,
  createEmployee,
  getEmployeeById,
} from "@/lib/actions/employees";
import { tryCatch } from "@/lib/error-handler";
import { auth } from "@/lib/auth";
import {
  GetEmployeesParams,
  Employee,
  CreateEmployeeRequest,
} from "@/lib/types/employees";
import { PaginatedResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "0");
  const pageSize = Number(searchParams.get("pageSize") || "10");

  // Handle multi-column sorting
  const sorts = searchParams.getAll("sorts");
  const sortFields =
    sorts.length > 0
      ? sorts.map((sortItem) => {
          const [field, direction] = sortItem.split(":");
          return { field, direction: direction as "asc" | "desc" };
        })
      : [];

  // Handle multi-column filtering
  const filters = searchParams.getAll("filters");
  const filterFields =
    filters.length > 0
      ? filters.map((filterItem) => {
          const [field, value] = filterItem.split(":");
          return { field, value };
        })
      : [];

  try {
    // Note: Updated getEmployees function to support multi-column filtering and sorting
    const employees = await tryCatch(
      () =>
        getEmployees({
          page,
          pageSize,
          // Multi-column sorting
          sorts: sortFields,
          // Multi-column filtering
          filters: filterFields,
        } as GetEmployeesParams),
      {
        customErrorMessage: "Failed to fetch employees data",
      }
    );

    const { data, count } = employees || { data: [], count: 0 };

    const response: PaginatedResponse<Employee> = {
      data,
      totalCount: count,
      pageCount: Math.ceil(count / pageSize),
      page,
      pageSize,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create a new employee
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = (await req.json()) as CreateEmployeeRequest;
    const id = await tryCatch(
      () =>
        createEmployee({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          position: data.position,
          department: data.department,
          hireDate: data.hireDate,
          status: data.status,
          userId: data.userId,
        }),
      {
        customErrorMessage: "Failed to create employee",
      }
    );

    if (id === null) {
      return NextResponse.json(
        { error: "Failed to create employee" },
        { status: 500 }
      );
    }

    revalidatePath("/dashboard/employees");
    revalidatePath(`/dashboard/employees/${id}`);

    const newEmployee = await tryCatch(() => getEmployeeById(id), {
      customErrorMessage: "Failed to fetch new employee data",
    });

    return NextResponse.json(newEmployee as Employee);
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
