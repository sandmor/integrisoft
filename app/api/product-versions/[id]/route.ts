import { NextRequest, NextResponse } from "next/server";
import {
  getProductVersionById,
  updateProductVersion,
  deleteProductVersion,
} from "@/lib/actions/productVersions";
import { tryCatch } from "@/lib/error-handler";
import { UpdateProductVersionRequest } from "@/lib/types/productVersions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const version = await tryCatch(() => getProductVersionById(id), {
    customErrorMessage: "Failed to fetch product version",
  });
  return NextResponse.json(version);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = (await request.json()) as UpdateProductVersionRequest;
  const updatedId = await tryCatch(() => updateProductVersion(id, body), {
    customErrorMessage: "Failed to update product version",
  });
  return NextResponse.json({ id: updatedId });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await tryCatch(() => deleteProductVersion(id), {
    customErrorMessage: "Failed to delete product version",
  });
  return NextResponse.json({ success: true });
}
