import { PaginatedResponse } from "../types";
import { api } from "./api";
import {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
} from "@/lib/types/clients";

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

    addClient: build.mutation<Client, Partial<CreateClientRequest>>({
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Client;

        const patchResult = dispatch(
          clientsApi.util.updateQueryData("getClients", {}, (draft) => {
            draft.data.unshift(optimisticClient);
            draft.totalCount = (draft.totalCount || 0) + 1;
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
        client: Partial<UpdateClientRequest>;
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
        const listPatch = dispatch(
          clientsApi.util.updateQueryData("getClients", {}, (draft) => {
            const index = draft.data.findIndex((c) => c.id === id);
            if (index !== -1) {
              draft.data[index] = { ...draft.data[index], ...client };
            }
          })
        );

        const detailPatch = dispatch(
          clientsApi.util.updateQueryData("getClientById", id, (draft) => {
            return { ...draft, ...client };
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
              draft.totalCount = (draft.totalCount || 0) - 1;
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
