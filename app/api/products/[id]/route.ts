import { NextRequest, NextResponse } from "next/server";
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from "@/lib/actions/products";
import { tryCatch } from "@/lib/error-handler";
import { UpdateProductRequest } from "@/lib/types/products";
import { validateSession } from "@/lib/permission-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("product", "read"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const product = await tryCatch(() => getProductById(id), {
    customErrorMessage: "Failed to fetch product",
  });
  return NextResponse.json(product);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("product", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as UpdateProductRequest;
  const updatedId = await tryCatch(() => updateProduct(id, body), {
    customErrorMessage: "Failed to update product",
  });
  return NextResponse.json({ id: updatedId });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateSession("product", "write"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await tryCatch(() => deleteProduct(id), {
    customErrorMessage: "Failed to delete product",
  });
  return NextResponse.json({ success: true });
}
