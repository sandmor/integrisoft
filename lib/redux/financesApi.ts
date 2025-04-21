import { api } from "./api";
import { transactionTypeEnum } from "../db/schema";
import {
  TransactionListItem,
  TransactionDetail,
  TransactionListResponse,
  TransactionFilters,
  TransactionQueryParams,
  TransactionCreateInput,
  TransactionUpdateInput,
  TransactionCategoryItem,
  TransactionCategoryDetail,
  TransactionCategoryWithChildren,
  TransactionCategoryQueryParams,
  TransactionCategoryCreateInput,
  TransactionCategoryUpdateInput,
  BudgetListItem,
  BudgetDetail,
  BudgetListResponse,
  BudgetFilters,
  BudgetQueryParams,
  BudgetCreateInput,
  BudgetUpdateInput,
  CostCenterListItem,
  CostCenterWithStats,
  CostCenterDetail,
  CostCenterQueryParams,
  CostCenterCreateInput,
  CostCenterUpdateInput,
  FinancialDashboardResponse,
} from "../types/finances";

// Create the finances API endpoints
export const financesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Transaction endpoints
    getTransactions: builder.query<
      TransactionListResponse,
      TransactionQueryParams
    >({
      query: ({
        page = 1,
        pageSize = 10,
        sorts = [],
        filters = {},
        dateFrom,
        dateTo,
      }) => {
        const params = new URLSearchParams();

        // Add pagination
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());

        // Add sorts
        sorts.forEach((sort) => params.append("sorts", sort));

        // Add filters
        if (filters.type) params.append("filters", `type:${filters.type}`);
        if (filters.categoryId)
          params.append("filters", `categoryId:${filters.categoryId}`);
        if (filters.costCenterId)
          params.append("filters", `costCenterId:${filters.costCenterId}`);
        if (filters.projectId)
          params.append("filters", `projectId:${filters.projectId}`);
        if (filters.createdById)
          params.append("filters", `createdById:${filters.createdById}`);
        if (filters.approvedById)
          params.append("filters", `approvedById:${filters.approvedById}`);
        if (filters.amount)
          params.append("filters", `amount:${filters.amount}`);
        if (filters.description)
          params.append("filters", `description:${filters.description}`);
        if (filters.approved !== undefined)
          params.append("filters", `approved:${filters.approved}`);
        if (dateFrom || filters.dateFrom)
          params.append("dateFrom", dateFrom || filters.dateFrom || "");
        if (dateTo || filters.dateTo)
          params.append("dateTo", dateTo || filters.dateTo || "");

        return {
          url: `/finances/transactions?${params.toString()}`,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Finances" as const,
                id,
              })),
              { type: "Finances", id: "LIST" },
            ]
          : [{ type: "Finances", id: "LIST" }],
    }),

    getTransaction: builder.query<TransactionDetail, string>({
      query: (id) => `/finances/transactions/${id}`,
      providesTags: (result, error, id) => [{ type: "Finances", id }],
    }),

    createTransaction: builder.mutation<
      TransactionDetail,
      TransactionCreateInput
    >({
      query: (body) => ({
        url: `/finances/transactions`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Finances", id: "LIST" }],
    }),

    updateTransaction: builder.mutation<
      TransactionDetail,
      { id: string; transaction: TransactionUpdateInput }
    >({
      query: ({ id, transaction }) => ({
        url: `/finances/transactions/${id}`,
        method: "PATCH",
        body: transaction,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Finances", id },
        { type: "Finances", id: "LIST" },
      ],
    }),

    deleteTransaction: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/finances/transactions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Finances", id: "LIST" }],
    }),

    // Transaction Category endpoints
    getTransactionCategories: builder.query<
      TransactionCategoryWithChildren[] | TransactionCategoryItem[],
      TransactionCategoryQueryParams
    >({
      query: ({ type, flat }) => {
        const params = new URLSearchParams();
        if (type) params.append("type", type);
        if (flat !== undefined) params.append("flat", flat.toString());

        return {
          url: `/finances/categories?${params.toString()}`,
        };
      },
      providesTags: [{ type: "Finances", id: "CATEGORIES" }],
    }),

    getTransactionCategory: builder.query<TransactionCategoryDetail, string>({
      query: (id) => `/finances/categories/${id}`,
      providesTags: (result, error, id) => [
        { type: "Finances", id: `CATEGORY_${id}` },
      ],
    }),

    createTransactionCategory: builder.mutation<
      TransactionCategoryItem,
      TransactionCategoryCreateInput
    >({
      query: (body) => ({
        url: `/finances/categories`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Finances", id: "CATEGORIES" }],
    }),

    updateTransactionCategory: builder.mutation<
      TransactionCategoryItem,
      { id: string; category: TransactionCategoryUpdateInput }
    >({
      query: ({ id, category }) => ({
        url: `/finances/categories/${id}`,
        method: "PATCH",
        body: category,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Finances", id: `CATEGORY_${id}` },
        { type: "Finances", id: "CATEGORIES" },
      ],
    }),

    deleteTransactionCategory: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/finances/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Finances", id: "CATEGORIES" }],
    }),

    // Budget endpoints
    getBudgets: builder.query<BudgetListResponse, BudgetQueryParams>({
      query: ({
        page = 1,
        pageSize = 10,
        sorts = [],
        filters = {},
        dateFrom,
        dateTo,
      }) => {
        const params = new URLSearchParams();

        // Add pagination
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());

        // Add sorts
        sorts.forEach((sort) => params.append("sorts", sort));

        // Add filters
        if (filters.projectId)
          params.append("filters", `projectId:${filters.projectId}`);
        if (filters.costCenterId)
          params.append("filters", `costCenterId:${filters.costCenterId}`);
        if (filters.createdById)
          params.append("filters", `createdById:${filters.createdById}`);
        if (filters.amount)
          params.append("filters", `amount:${filters.amount}`);
        if (filters.name) params.append("filters", `name:${filters.name}`);
        if (filters.description)
          params.append("filters", `description:${filters.description}`);
        if (dateFrom || filters.dateFrom)
          params.append("dateFrom", dateFrom || filters.dateFrom || "");
        if (dateTo || filters.dateTo)
          params.append("dateTo", dateTo || filters.dateTo || "");

        return {
          url: `/finances/budgets?${params.toString()}`,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Finances" as const,
                id: `BUDGET_${id}`,
              })),
              { type: "Finances", id: "BUDGETS" },
            ]
          : [{ type: "Finances", id: "BUDGETS" }],
    }),

    getBudget: builder.query<BudgetDetail, string>({
      query: (id) => `/finances/budgets/${id}`,
      providesTags: (result, error, id) => [
        { type: "Finances", id: `BUDGET_${id}` },
      ],
    }),

    createBudget: builder.mutation<BudgetListItem, BudgetCreateInput>({
      query: (body) => ({
        url: `/finances/budgets`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Finances", id: "BUDGETS" }],
    }),

    updateBudget: builder.mutation<
      BudgetListItem,
      { id: string; budget: BudgetUpdateInput }
    >({
      query: ({ id, budget }) => ({
        url: `/finances/budgets/${id}`,
        method: "PATCH",
        body: budget,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Finances", id: `BUDGET_${id}` },
        { type: "Finances", id: "BUDGETS" },
      ],
    }),

    deleteBudget: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/finances/budgets/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Finances", id: "BUDGETS" }],
    }),

    // Cost Center endpoints
    getCostCenters: builder.query<
      CostCenterListItem[] | CostCenterWithStats[],
      CostCenterQueryParams
    >({
      query: ({ departmentId, withStats }) => {
        const params = new URLSearchParams();
        if (departmentId) params.append("departmentId", departmentId);
        if (withStats !== undefined)
          params.append("withStats", withStats.toString());

        return {
          url: `/finances/cost-centers?${params.toString()}`,
        };
      },
      providesTags: [{ type: "Finances", id: "COST_CENTERS" }],
    }),

    getCostCenter: builder.query<CostCenterDetail, string>({
      query: (id) => `/finances/cost-centers/${id}`,
      providesTags: (result, error, id) => [
        { type: "Finances", id: `COST_CENTER_${id}` },
      ],
    }),

    createCostCenter: builder.mutation<
      CostCenterListItem,
      CostCenterCreateInput
    >({
      query: (body) => ({
        url: `/finances/cost-centers`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Finances", id: "COST_CENTERS" }],
    }),

    updateCostCenter: builder.mutation<
      CostCenterListItem,
      { id: string; costCenter: CostCenterUpdateInput }
    >({
      query: ({ id, costCenter }) => ({
        url: `/finances/cost-centers/${id}`,
        method: "PATCH",
        body: costCenter,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Finances", id: `COST_CENTER_${id}` },
        { type: "Finances", id: "COST_CENTERS" },
      ],
    }),

    deleteCostCenter: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/finances/cost-centers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Finances", id: "COST_CENTERS" }],
    }),

    // Financial Dashboard endpoints
    getFinancialSummary: builder.query<FinancialDashboardResponse, void>({
      query: () => `/finances/dashboard`,
      providesTags: [{ type: "Finances", id: "DASHBOARD" }],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in components
export const {
  // Transactions
  useGetTransactionsQuery,
  useGetTransactionQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,

  // Transaction Categories
  useGetTransactionCategoriesQuery,
  useGetTransactionCategoryQuery,
  useCreateTransactionCategoryMutation,
  useUpdateTransactionCategoryMutation,
  useDeleteTransactionCategoryMutation,

  // Budgets
  useGetBudgetsQuery,
  useGetBudgetQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,

  // Cost Centers
  useGetCostCentersQuery,
  useGetCostCenterQuery,
  useCreateCostCenterMutation,
  useUpdateCostCenterMutation,
  useDeleteCostCenterMutation,

  // Financial Dashboard
  useGetFinancialSummaryQuery,
} = financesApi;
