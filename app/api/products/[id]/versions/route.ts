import { NextRequest, NextResponse } from "next/server";
import {
  getVersionsByProductId,
  createProductVersion,
} from "@/lib/actions/productVersions";
import { tryCatch } from "@/lib/error-handler";
import { CreateProductVersionRequest } from "@/lib/types/productVersions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: productId } = params;
  const versions = await tryCatch(() => getVersionsByProductId(productId), {
    customErrorMessage: "Failed to fetch product versions",
  });
  return NextResponse.json(versions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: productId } = params;
  const body = (await request.json()) as CreateProductVersionRequest;
  body.productId = productId;
  const newId = await tryCatch(() => createProductVersion(body), {
    customErrorMessage: "Failed to create product version",
  });
  return NextResponse.json({ id: newId });
}
