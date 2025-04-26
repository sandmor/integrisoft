import { api } from "./api";
import { PaginatedResponse } from "../types";
import {
  Product,
  CreateProductRequest,
  UpdateProductRequest,
} from "@/lib/types/products";

export const productsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query<
      PaginatedResponse<Product>,
      {
        page?: number;
        pageSize?: number;
        sorts?: string[];
        filters?: string[];
      }
    >({
      query: ({ page, pageSize, sorts, filters }) => {
        const params = new URLSearchParams();
        if (page !== undefined) params.append("page", page.toString());
        if (pageSize !== undefined)
          params.append("pageSize", pageSize.toString());
        sorts?.forEach((sort) => params.append("sorts", sort));
        filters?.forEach((filter) => params.append("filters", filter));
        return `/products?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Products" as const,
                id,
              })),
              { type: "Products", id: "LIST" },
            ]
          : [{ type: "Products", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),
    getProductById: build.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_, __, id) => [{ type: "Products", id }],
    }),
    addProduct: build.mutation<{ id: string }, Partial<CreateProductRequest>>({
      query: (body) => ({ url: "/products", method: "POST", body }),
      invalidatesTags: [{ type: "Products", id: "LIST" }],
    }),
    updateProduct: build.mutation<
      { id: string },
      { id: string; product: Partial<UpdateProductRequest> }
    >({
      query: ({ id, product }) => ({
        url: `/products/${id}`,
        method: "PATCH",
        body: product,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Products", id: arg.id },
        { type: "Products", id: "LIST" },
      ],
    }),
    deleteProduct: build.mutation<void, string>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: (_, __, id) => [
        { type: "Products", id },
        { type: "Products", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;
