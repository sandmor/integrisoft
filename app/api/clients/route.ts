import { NextRequest, NextResponse } from "next/server";
import { getClients } from "@/lib/actions/clients";
import { tryCatch } from "@/lib/error-handler";
import { GetClientsParams, Client } from "@/lib/types/clients";
import { PaginatedResponse } from "@/lib/types";
import { validateSession } from "@/lib/permission-handler";

export async function GET(request: NextRequest) {
  if (!(await validateSession("read_clients"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "0");
  const pageSize = Number(searchParams.get("pageSize") || "10");

  const sorts = searchParams.getAll("sorts");
  const sortFields =
    sorts.length > 0
      ? sorts.map((sortItem) => {
          const [field, direction] = sortItem.split(":");
          return { field, direction: direction as "asc" | "desc" };
        })
      : [];

  const filters = searchParams.getAll("filters");
  const filterFields =
    filters.length > 0
      ? filters.map((filterItem) => {
          const [field, value] = filterItem.split(":");
          return { field, value };
        })
      : [];

  try {
    const clients = await tryCatch(
      () =>
        getClients({
          page,
          pageSize,
          sorts: sortFields,
          filters: filterFields,
        } as GetClientsParams),
      {
        customErrorMessage: "Failed to fetch clients data",
      }
    );

    const { data, count } = clients || { data: [], count: 0 };

    const response: PaginatedResponse<Client> = {
      data,
      totalCount: count,
      pageCount: Math.ceil(count / pageSize),
      page,
      pageSize,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
