import { NextRequest, NextResponse } from "next/server";
import { getClients } from "@/lib/actions/clients";
import { tryCatch } from "@/lib/error-handler";

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
    // Note: Updated getClients function to support multi-column filtering and sorting
    const clients = await tryCatch(
      () =>
        getClients({
          page,
          pageSize,
          // Multi-column sorting
          sorts: sortFields,
          // Multi-column filtering
          filters: filterFields,
        }),
      {
        customErrorMessage: "Failed to fetch clients data",
      }
    );

    const { data, count } = clients || { data: [], count: 0 };

    return NextResponse.json({
      data,
      pageCount: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
