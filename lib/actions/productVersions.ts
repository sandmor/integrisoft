"use server";

import { db } from "../db";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "../auth";
import { headers } from "next/headers";
import { productVersions } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  ProductVersion,
  CreateProductVersionRequest,
  UpdateProductVersionRequest,
} from "../types/productVersions";

export async function getVersionsByProductId(
  productId: string
): Promise<ProductVersion[]> {
  const rows = await db
    .select()
    .from(productVersions)
    .where(eq(productVersions.productId, productId))
    .orderBy(productVersions.releaseDate);

  return rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    versionNumber: r.versionNumber,
    status: r.status,
    releaseDate: r.releaseDate ? r.releaseDate.toISOString() : null,
    releaseNotes: r.releaseNotes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createProductVersion(
  data: CreateProductVersionRequest
): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");

  const id = createId();
  const now = new Date();
  await db.insert(productVersions).values({
    id,
    productId: data.productId,
    versionNumber: data.versionNumber,
    status: data.status || "development",
    releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
    releaseNotes: data.releaseNotes || null,
    createdById: session.user.id,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  });
  return id;
}

export async function updateProductVersion(
  id: string,
  data: UpdateProductVersionRequest
): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  await db
    .update(productVersions)
    .set({
      versionNumber: data.versionNumber,
      status: data.status || "development",
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
      releaseNotes: data.releaseNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(productVersions.id, id));
  return id;
}

export async function deleteProductVersion(id: string): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  await db
    .update(productVersions)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(productVersions.id, id));
  return true;
}

export async function getProductVersionById(
  id: string
): Promise<ProductVersion | null> {
  const row = await db
    .select()
    .from(productVersions)
    .where(eq(productVersions.id, id))
    .then((res) => res[0] || null);
  if (!row) return null;
  return {
    id: row.id,
    productId: row.productId,
    versionNumber: row.versionNumber,
    status: row.status,
    releaseDate: row.releaseDate ? row.releaseDate.toISOString() : null,
    releaseNotes: row.releaseNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
