import { api } from "@/lib/redux/api";
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from "@/lib/types/employees";
import { PaginatedResponse } from "../types";

export const employeesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEmployees: build.query<
      PaginatedResponse<Employee>,
      {
        page?: number;
        pageSize?: number;
        sorts?: string[];
        filters?: string[];
        status?: string;
        department?: string;
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

        if (params.department) {
          queryParams.append("filters", `department:${params.department}`);
        }

        return {
          url: `/employees?${queryParams.toString()}`,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Employees" as const,
                id,
              })),
              { type: "Employees", id: "LIST" },
            ]
          : [{ type: "Employees", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getEmployeeById: build.query<Employee, string>({
      query: (id) => `/employees/${id}`,
      providesTags: (_, __, id) => [{ type: "Employees", id }],
    }),

    addEmployee: build.mutation<Employee, Partial<CreateEmployeeRequest>>({
      query: (body) => ({
        url: "/employees",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Employees", id: "LIST" }],
      onQueryStarted: async (newEmployee, { dispatch, queryFulfilled }) => {
        const tempId = Date.now().toString();

        const optimisticEmployee = {
          ...newEmployee,
          id: tempId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Employee;

        const patchResult = dispatch(
          employeesApi.util.updateQueryData("getEmployees", {}, (draft) => {
            draft.data.unshift(optimisticEmployee);
            draft.totalCount = (draft.totalCount || 0) + 1;
          })
        );

        try {
          const { data: createdEmployee } = await queryFulfilled;

          dispatch(
            employeesApi.util.updateQueryData("getEmployees", {}, (draft) => {
              const index = draft.data.findIndex(
                (employee) => employee.id === tempId
              );
              if (index !== -1) draft.data[index] = createdEmployee;
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    updateEmployee: build.mutation<
      Employee,
      {
        id: string;
        employee: Partial<UpdateEmployeeRequest>;
      }
    >({
      query: ({ id, employee }) => ({
        url: `/employees/${id}`,
        method: "PATCH",
        body: employee,
      }),
      invalidatesTags: (_, __, arg) => [
        { type: "Employees", id: arg.id },
        { type: "Employees", id: "LIST" },
      ],
      onQueryStarted: async (
        { id, employee },
        { dispatch, queryFulfilled }
      ) => {
        const listPatch = dispatch(
          employeesApi.util.updateQueryData("getEmployees", {}, (draft) => {
            const index = draft.data.findIndex((e) => e.id === id);
            if (index !== -1) {
              const updatedEmployee = {
                ...draft.data[index],
                ...employee,
              };
              draft.data[index] = updatedEmployee;
            }
          })
        );

        const detailPatch = dispatch(
          employeesApi.util.updateQueryData("getEmployeeById", id, (draft) => {
            return {
              ...draft,
              ...employee,
            };
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

    deleteEmployee: build.mutation<void, string>({
      query: (id) => ({
        url: `/employees/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, id) => [
        { type: "Employees", id },
        { type: "Employees", id: "LIST" },
      ],
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const listPatch = dispatch(
          employeesApi.util.updateQueryData("getEmployees", {}, (draft) => {
            const index = draft.data.findIndex(
              (employee) => employee.id === id
            );
            if (index !== -1) {
              draft.data.splice(index, 1);
              draft.totalCount = (draft.totalCount || 0) - 1;
            }
          })
        );

        try {
          await queryFulfilled;
          dispatch(
            employeesApi.util.updateQueryData(
              "getEmployeeById",
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
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useAddEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeesApi;
