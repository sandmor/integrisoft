import { NextRequest, NextResponse } from "next/server";
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from "@/lib/actions/products";
import { tryCatch } from "@/lib/error-handler";
import { UpdateProductRequest } from "@/lib/types/products";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const product = await tryCatch(() => getProductById(id), {
    customErrorMessage: "Failed to fetch product",
  });
  return NextResponse.json(product);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = (await request.json()) as UpdateProductRequest;
  const updatedId = await tryCatch(() => updateProduct(id, body), {
    customErrorMessage: "Failed to update product",
  });
  return NextResponse.json({ id: updatedId });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await tryCatch(() => deleteProduct(id), {
    customErrorMessage: "Failed to delete product",
  });
  return NextResponse.json({ success: true });
}
