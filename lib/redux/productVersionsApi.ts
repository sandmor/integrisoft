import { api } from "./api";
import {
  ProductVersion,
  CreateProductVersionRequest,
  UpdateProductVersionRequest,
} from "@/lib/types/productVersions";

export const productVersionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getVersionsByProductId: build.query<ProductVersion[], string>({
      query: (productId) => `/products/${productId}/versions`,
      providesTags: (result, error, arg) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ProductVersions" as const,
                id,
              })),
              { type: "ProductVersions", id: "LIST" },
            ]
          : [{ type: "ProductVersions", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),
    addVersion: build.mutation<
      { id: string },
      Partial<CreateProductVersionRequest>
    >({
      query: (body) => ({
        url: `/products/${body.productId}/versions`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "ProductVersions", id: "LIST" },
        { type: "Products", id: arg.productId },
      ],
    }),
    updateVersion: build.mutation<
      { id: string },
      { id: string; version: Partial<UpdateProductVersionRequest> }
    >({
      query: ({ id, version }) => ({
        url: `/product-versions/${id}`,
        method: "PATCH",
        body: version,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "ProductVersions", id: arg.id },
        { type: "ProductVersions", id: "LIST" },
      ],
    }),
    deleteVersion: build.mutation<void, string>({
      query: (id) => ({ url: `/product-versions/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        { type: "ProductVersions", id },
        { type: "ProductVersions", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetVersionsByProductIdQuery,
  useAddVersionMutation,
  useUpdateVersionMutation,
  useDeleteVersionMutation,
} = productVersionsApi;
