export interface ProductVersion {
  id: string;
  productId: string;
  versionNumber: string;
  status: "development" | "qa" | "production" | "deprecated";
  releaseDate: string | null;
  releaseNotes: string | null;
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductVersionRequest {
  productId: string;
  versionNumber: string;
  status?: "development" | "qa" | "production" | "deprecated";
  releaseDate?: string;
  releaseNotes?: string;
}

export interface UpdateProductVersionRequest
  extends CreateProductVersionRequest {}
