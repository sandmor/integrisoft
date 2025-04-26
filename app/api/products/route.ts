import { NextRequest, NextResponse } from "next/server";
import { getProducts, createProduct } from "@/lib/actions/products";
import { tryCatch } from "@/lib/error-handler";
import { GetProductsParams, CreateProductRequest } from "@/lib/types/products";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const page = Number(url.searchParams.get("page") || "0");
  const pageSize = Number(url.searchParams.get("pageSize") || "10");
  const sorts = url.searchParams.getAll("sorts").map((s) => {
    const [field, dir] = s.split(":");
    return { field, direction: dir as "asc" | "desc" };
  });
  const filters = url.searchParams.getAll("filters").map((f) => {
    const [field, value] = f.split(":");
    return { field, value };
  });

  const result = await tryCatch(
    () => getProducts({ page, pageSize, sorts, filters } as GetProductsParams),
    { customErrorMessage: "Failed to fetch products" }
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateProductRequest;
  const id = await tryCatch(() => createProduct(body), {
    customErrorMessage: "Failed to create product",
  });
  return NextResponse.json({ id });
}
