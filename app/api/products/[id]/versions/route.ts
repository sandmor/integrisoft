import { validateSession } from "@/lib/permission-handler";
import { NextRequest, NextResponse } from "next/server";
import {
  getVersionsByProductId,
  createProductVersion,
} from "@/lib/actions/productVersions";
import { tryCatch } from "@/lib/error-handler";
import { CreateProductVersionRequest } from "@/lib/types/productVersions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("read_products"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const versions = await tryCatch(() => getVersionsByProductId(id), {
    customErrorMessage: "Failed to fetch product versions",
  });
  return NextResponse.json(versions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await validateSession("write_products");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as CreateProductVersionRequest;
  body.productId = id;
  const newId = await tryCatch(() => createProductVersion(body, userId), {
    customErrorMessage: "Failed to create product version",
  });
  return NextResponse.json({ id: newId });
}
