// Options for populating test data
export interface TestDataOptions {
  userCount?: number;
  departmentCount?: number;
  productCount?: number;
  clientCount?: number;
  projectCount?: number;
  resetData?: boolean; // Set to true to delete existing data before populating
}

// Return type for test data population
export interface TestDataResult {
  userCount: number;
  departmentCount: number;
  productCount: number;
  clientCount: number;
  projectCount: number;
}

// Department and positions return type
export interface DepartmentPositionResult {
  departmentIds: string[];
  positionIds: string[];
}

// Dependencies relation
export interface DependencyRelation {
  productId: string;
  dependsOnId: string;
}
