import { api } from "@/lib/redux/api";

// Serialized interface for Redux store
export interface SerializedEmployee
  extends Omit<Employee, "hireDate" | "createdAt" | "updatedAt"> {
  hireDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  status: "active" | "inactive" | "on-leave";
  hireDate: Date;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  pageCount: number;
}

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

    addEmployee: build.mutation<Employee, Partial<Employee>>({
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
          hireDate: newEmployee.hireDate?.toJSON(),
          createdAt: new Date().toJSON(),
          updatedAt: new Date().toJSON(),
        } as unknown as Employee;

        const patchResult = dispatch(
          employeesApi.util.updateQueryData("getEmployees", {}, (draft) => {
            draft.data.unshift(optimisticEmployee);
            draft.count = (draft.count || 0) + 1;
          })
        );

        try {
          const { data: createdEmployee } = await queryFulfilled;

          const serializedEmployee = {
            ...createdEmployee,
            hireDate: createdEmployee.hireDate?.toJSON(),
            createdAt: createdEmployee.createdAt?.toJSON(),
            updatedAt: createdEmployee.updatedAt?.toJSON(),
          } as unknown as Employee;

          dispatch(
            employeesApi.util.updateQueryData("getEmployees", {}, (draft) => {
              const index = draft.data.findIndex(
                (employee) => employee.id === tempId
              );
              if (index !== -1) draft.data[index] = serializedEmployee;
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    updateEmployee: build.mutation<
      Employee,
      Partial<Employee> & { id: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/employees/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, arg) => [
        { type: "Employees", id: arg.id },
        { type: "Employees", id: "LIST" },
      ],
      onQueryStarted: async (updatedEmployee, { dispatch, queryFulfilled }) => {
        const serializedEmployee = {
          ...updatedEmployee,
          hireDate: updatedEmployee.hireDate?.toJSON(),
          updatedAt: new Date().toJSON(),
        } as unknown as Employee;

        const listPatch = dispatch(
          employeesApi.util.updateQueryData("getEmployees", {}, (draft) => {
            const index = draft.data.findIndex(
              (employee) => employee.id === updatedEmployee.id
            );
            if (index !== -1)
              draft.data[index] = {
                ...draft.data[index],
                ...serializedEmployee,
              };
          })
        );

        const detailPatch = dispatch(
          employeesApi.util.updateQueryData(
            "getEmployeeById",
            updatedEmployee.id,
            (draft) => {
              Object.assign(draft, { ...draft, ...serializedEmployee });
            }
          )
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
              draft.count = (draft.count || 0) - 1;
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
