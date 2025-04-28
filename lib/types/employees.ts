// Employee entity type
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  isDeleted: boolean;
  hireDate: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  salary?: string;
  contactEmail?: string;
  contactPhone?: string;
  roles: string[];
}

export type EmployeeWithDetails = Employee; // Kept for backward compatibility

// Query parameters for getEmployees
export interface GetEmployeesParams {
  page?: number;
  pageSize?: number;
  sorts?: Array<{ field: string; direction: "asc" | "desc" }>;
  filters?: Array<{ field: string; value: string }>;
}

// Employee creation request type
export type CreateEmployeeRequest = Omit<
  Employee,
  "id" | "userId" | "isDeleted" | "createdAt" | "updatedAt"
> & {
  password: string;
};

// Employee update request type
export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest> & {
  id: string;
};

// Department type
export type Department = {
  id: string;
  name: string;
};

// Position type
export type Position = {
  id: string;
  title: string;
  departmentId?: string;
};
