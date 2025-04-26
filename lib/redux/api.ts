import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Base API configuration for RTK Query
export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "same-origin",
  }),
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    "Clients",
    "Projects",
    "Employees",
    "Products",
    "Finances",
    "ProductVersions",
  ],
  endpoints: () => ({}),
});
