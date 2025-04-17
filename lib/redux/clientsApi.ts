import { api } from "./api";

type TypeSafeUpdate<T> = {
  [K in keyof T]?: T[K] extends Date | null | undefined
    ? Date | null | undefined
    : T[K];
};

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  pageCount: number;
}

export const clientsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getClients: build.query<
      PaginatedResponse<Client>,
      {
        page?: number;
        pageSize?: number;
        sorts?: string[];
        filters?: string[];
        status?: string;
      }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();

        if (params.page !== undefined)
          queryParams.append("page", params.page.toString());
        if (params.pageSize !== undefined)
          queryParams.append("pageSize", params.pageSize.toString());

        if (params.sorts) {
          params.sorts.forEach((sort) => queryParams.append("sorts", sort));
        }

        if (params.filters) {
          params.filters.forEach((filter) =>
            queryParams.append("filters", filter)
          );
        }

        if (params.status) {
          queryParams.append("filters", `status:${params.status}`);
        }

        return {
          url: `/clients?${queryParams.toString()}`,
          params,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Clients" as const,
                id,
              })),
              { type: "Clients", id: "LIST" },
            ]
          : [{ type: "Clients", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getClientById: build.query<Client, string>({
      query: (id) => `/clients/${id}`,
      providesTags: (_, __, id) => [{ type: "Clients", id }],
    }),

    addClient: build.mutation<
      Client,
      TypeSafeUpdate<Omit<Client, "id" | "createdAt" | "updatedAt">>
    >({
      query: (body) => ({
        url: "/clients",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Clients", id: "LIST" }],
      onQueryStarted: async (newClient, { dispatch, queryFulfilled }) => {
        const tempId = Date.now().toString();

        const optimisticClient = {
          ...newClient,
          id: tempId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Client;

        const patchResult = dispatch(
          clientsApi.util.updateQueryData("getClients", {}, (draft) => {
            draft.data.unshift(optimisticClient);
            draft.count = (draft.count || 0) + 1;
          })
        );

        try {
          const { data: createdClient } = await queryFulfilled;

          dispatch(
            clientsApi.util.updateQueryData("getClients", {}, (draft) => {
              const index = draft.data.findIndex(
                (client) => client.id === tempId
              );
              if (index !== -1) draft.data[index] = createdClient;
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    updateClient: build.mutation<
      Client,
      {
        id: string;
        client: TypeSafeUpdate<Omit<Client, "id" | "createdAt" | "updatedAt">>;
      }
    >({
      query: ({ id, client }) => ({
        url: `/clients/${id}`,
        method: "PATCH",
        body: client,
      }),
      invalidatesTags: (_, __, arg) => [
        { type: "Clients", id: arg.id },
        { type: "Clients", id: "LIST" },
      ],
      onQueryStarted: async ({ id, client }, { dispatch, queryFulfilled }) => {
        const safeUpdate = { ...client, updatedAt: new Date() };

        const listPatch = dispatch(
          clientsApi.util.updateQueryData("getClients", {}, (draft) => {
            const index = draft.data.findIndex((c) => c.id === id);
            if (index !== -1) {
              draft.data[index] = { ...draft.data[index], ...safeUpdate };
            }
          })
        );

        const detailPatch = dispatch(
          clientsApi.util.updateQueryData("getClientById", id, (draft) => {
            return { ...draft, ...safeUpdate };
          })
        );

        try {
          await queryFulfilled;
        } catch {
          listPatch.undo();
          detailPatch.undo();
        }
      },
    }),

    deleteClient: build.mutation<void, string>({
      query: (id) => ({
        url: `/clients/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, id) => [
        { type: "Clients", id },
        { type: "Clients", id: "LIST" },
      ],
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const listPatch = dispatch(
          clientsApi.util.updateQueryData("getClients", {}, (draft) => {
            const index = draft.data.findIndex((client) => client.id === id);
            if (index !== -1) {
              draft.data.splice(index, 1);
              draft.count = (draft.count || 0) - 1;
            }
          })
        );

        try {
          await queryFulfilled;
          dispatch(
            clientsApi.util.updateQueryData(
              "getClientById",
              id,
              () => undefined
            )
          );
        } catch {
          listPatch.undo();
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetClientsQuery,
  useGetClientByIdQuery,
  useAddClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
} = clientsApi;
