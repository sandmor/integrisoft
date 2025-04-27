"use server";

import { db } from "../db";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "../auth";
import { headers } from "next/headers";
import { products, productVersions, employees, users } from "../db/schema";
import { eq, and, asc, desc, count, inArray, ilike } from "drizzle-orm";
import {
  Product,
  GetProductsParams,
  CreateProductRequest,
  UpdateProductRequest,
} from "../types/products";
import { alias } from "drizzle-orm/pg-core";

export async function getProducts(options?: GetProductsParams) {
  const { page = 0, pageSize = 10, sorts = [], filters = [] } = options || {};

  const filterConditions: any[] = [eq(products.isDeleted, false)];
  for (const filter of filters) {
    if (filter.value?.trim()) {
      switch (filter.field) {
        case "name":
          filterConditions.push(ilike(products.name, `%${filter.value}%`));
          break;
      }
    }
  }

  const totalCountResult = await db
    .select({ count: count() })
    .from(products)
    .where(and(...filterConditions));
  const totalCount = Number(totalCountResult[0]?.count || 0);

  const sortParams: any[] = [];
  for (const sort of sorts) {
    switch (sort.field) {
      case "name":
        sortParams.push(
          sort.direction === "asc" ? asc(products.name) : desc(products.name)
        );
        break;
    }
  }

  const productManagerEmployee = alias(employees, "productManagerEmployee");
  const techLeadEmployee = alias(employees, "techLeadEmployee");
  const productManagerUser = alias(users, "productManagerUser");
  const techLeadUser = alias(users, "techLeadUser");

  const results = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      repositoryUrl: products.repositoryUrl,
      documentationUrl: products.documentationUrl,
      productManager: {
        id: products.productManager,
        name: productManagerUser.name,
        lastName: productManagerUser.lastName,
      },
      techLead: {
        id: products.techLead,
        name: techLeadUser.name,
        lastName: techLeadUser.lastName,
      },
    })
    .from(products)
    .leftJoin(
      productManagerEmployee,
      eq(products.productManager, productManagerEmployee.id)
    )
    .leftJoin(
      productManagerUser,
      eq(productManagerEmployee.userId, productManagerUser.id)
    )
    .leftJoin(techLeadEmployee, eq(products.techLead, techLeadEmployee.id))
    .leftJoin(techLeadUser, eq(techLeadEmployee.userId, techLeadUser.id))
    .where(and(...filterConditions))
    .orderBy(...sortParams)
    .limit(pageSize)
    .offset(page * pageSize);

  const productIds = results.map((p) => p.id);
  const versionCounts = await db
    .select({ productId: productVersions.productId, count: count() })
    .from(productVersions)
    .where(
      and(
        inArray(productVersions.productId, productIds),
        eq(productVersions.isDeleted, false)
      )
    )
    .groupBy(productVersions.productId);
  const versionMap = new Map(
    versionCounts.map((v) => [v.productId, Number(v.count)])
  );

  const data: Product[] = results.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    repositoryUrl: p.repositoryUrl,
    documentationUrl: p.documentationUrl,
    versionCount: versionMap.get(p.id) || 0,
    productManager: p.productManager.id
      ? {
          id: p.productManager.id,
          name: [p.productManager.name, p.productManager.lastName]
            .filter(Boolean)
            .join(" "),
        }
      : undefined,
    techLead: p.techLead.id
      ? {
          id: p.techLead.id,
          name: [p.techLead.name, p.techLead.lastName]
            .filter(Boolean)
            .join(" "),
        }
      : undefined,
    createdAt: p.id, // placeholder, adjust if needed
    updatedAt: p.id,
  }));

  return { data, count: totalCount };
}

export async function getProductById(id: string) {
  const productManagerEmployee = alias(employees, "productManagerEmployee");
  const techLeadEmployee = alias(employees, "techLeadEmployee");
  const productManagerUser = alias(users, "productManagerUser");
  const techLeadUser = alias(users, "techLeadUser");

  const queryResult = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      repositoryUrl: products.repositoryUrl,
      documentationUrl: products.documentationUrl,
      productManager: {
        id: products.productManager,
        name: productManagerUser.name,
        lastName: productManagerUser.lastName,
      },
      techLead: {
        id: products.techLead,
        name: techLeadUser.name,
        lastName: techLeadUser.lastName,
      },
      versionCount: count(),
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(
      productManagerEmployee,
      eq(products.productManager, productManagerEmployee.id)
    )
    .leftJoin(
      productManagerUser,
      eq(productManagerEmployee.userId, productManagerUser.id)
    )
    .leftJoin(techLeadEmployee, eq(products.techLead, techLeadEmployee.id))
    .leftJoin(techLeadUser, eq(techLeadEmployee.userId, techLeadUser.id))
    .leftJoin(productVersions, eq(products.id, productVersions.productId))
    .groupBy(
      products.id,
      products.name,
      products.description,
      products.repositoryUrl,
      products.documentationUrl,
      products.productManager,
      products.techLead,
      productManagerUser.name,
      productManagerUser.lastName,
      techLeadUser.name,
      techLeadUser.lastName,
      products.createdAt,
      products.updatedAt
    )
    .where(and(eq(products.id, id), eq(products.isDeleted, false)))
    .then((res) => res[0] || null);

  if (!queryResult) return null;

  const formattedProduct: Product = {
    ...queryResult,
    createdAt:
      queryResult.createdAt instanceof Date
        ? queryResult.createdAt.toISOString()
        : queryResult.createdAt,
    updatedAt:
      queryResult.updatedAt instanceof Date
        ? queryResult.updatedAt.toISOString()
        : queryResult.updatedAt,
    productManager: queryResult.productManager.id
      ? {
          id: queryResult.productManager.id,
          name: [
            queryResult.productManager.name,
            queryResult.productManager.lastName,
          ]
            .filter(Boolean)
            .join(" "),
        }
      : undefined,
    techLead: queryResult.techLead.id
      ? {
          id: queryResult.techLead.id,
          name: [queryResult.techLead.name, queryResult.techLead.lastName]
            .filter(Boolean)
            .join(" "),
        }
      : undefined,
  };
  return formattedProduct;
}

export async function createProduct(
  data: CreateProductRequest
): Promise<string> {
  const id = createId();
  const now = new Date();
  await db.insert(products).values({
    id,
    name: data.name,
    description: data.description || null,
    repositoryUrl: data.repositoryUrl || null,
    documentationUrl: data.documentationUrl || null,
    productManager: data.productManagerId || null,
    techLead: data.techLeadId || null,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  });
  return id;
}

export async function updateProduct(id: string, data: UpdateProductRequest) {
  await db
    .update(products)
    .set({
      name: data.name,
      description: data.description || null,
      repositoryUrl: data.repositoryUrl || null,
      documentationUrl: data.documentationUrl || null,
      productManager: data.productManagerId || null,
      techLead: data.techLeadId || null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));
  return id;
}

export async function deleteProduct(id: string) {
  await db
    .update(products)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(products.id, id));
  return true;
}

export async function getProductEmployees() {
  const rows = await db
    .select({ id: employees.id, name: users.name })
    .from(employees)
    .innerJoin(users, eq(employees.userId, users.id))
    .where(eq(employees.isDeleted, false))
    .orderBy(asc(users.name));
  return rows; // [{ id, name }]
}
