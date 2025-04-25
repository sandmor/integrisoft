// Shared types for employee-related operations between frontend and backend
export type EmployeeStatus = "active" | "inactive" | "on-leave";

// Employee entity type
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  status: EmployeeStatus;
  hireDate: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  salary?: string;
}

export interface EmployeeWithDetails extends Employee {
  contactEmail?: string;
  contactPhone?: string;
  role: "admin" | "manager" | "employee";
}

// Query parameters for getEmployees
export interface GetEmployeesParams {
  page?: number;
  pageSize?: number;
  sorts?: Array<{ field: string; direction: "asc" | "desc" }>;
  filters?: Array<{ field: string; value: string }>;
  status?: string;
  department?: string;
}

// Employee creation request type
export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  hireDate: string;
  status: EmployeeStatus;
  userId?: string;
}

// Employee update request type
export interface UpdateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  hireDate: string;
  status: EmployeeStatus;
  userId?: string;
}
