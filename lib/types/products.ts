export interface Product {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string | null;
  documentationUrl: string | null;
  productManager?: { id: string; name: string };
  techLead?: { id: string; name: string };
  versionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetProductsParams {
  page?: number;
  pageSize?: number;
  sorts?: Array<{ field: string; direction: "asc" | "desc" }>;
  filters?: Array<{ field: string; value: string }>;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  repositoryUrl?: string;
  documentationUrl?: string;
  productManagerId?: string;
  techLeadId?: string;
}

export interface UpdateProductRequest extends CreateProductRequest {}
