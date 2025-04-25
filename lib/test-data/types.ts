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

// Transaction category types
export type TransactionType = "income" | "expense" | "transfer";

// Transaction category interface
export interface TransactionCategory {
  id: string;
  name: string;
  type: TransactionType;
}

// Grouped transaction categories by type
export interface TransactionCategoriesResult {
  allCategoryIds: string[];
  categoriesByType: {
    income: TransactionCategory[];
    expense: TransactionCategory[];
    transfer: TransactionCategory[];
  };
  // Helper to quickly find a category by name and type
  findByNameAndType: (
    name: string,
    type: TransactionType
  ) => TransactionCategory | undefined;
}
