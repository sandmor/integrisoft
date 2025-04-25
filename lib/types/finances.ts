import { transactionTypeEnum } from "../db/schema";

// Transaction interfaces
export interface TransactionListItem {
  id: string;
  type: (typeof transactionTypeEnum.enumValues)[number];
  amount: string;
  description: string | null;
  date: string;
  categoryId: string | null;
  costCenterId: string | null;
  projectId: string | null;
  createdById: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    type: (typeof transactionTypeEnum.enumValues)[number];
  } | null;
  costCenter?: {
    id: string;
    name: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
}

export interface TransactionDetail extends TransactionListItem {
  approvedBy?: {
    id: string;
    name: string;
  } | null;
}

export interface TransactionListResponse {
  data: TransactionListItem[];
  totalCount: number;
  pageCount: number;
  page: number;
  pageSize: number;
}

export interface TransactionFilters {
  type?: (typeof transactionTypeEnum.enumValues)[number];
  categoryId?: string;
  costCenterId?: string;
  projectId?: string;
  createdById?: string;
  approvedById?: string;
  amount?: string; // Format: "min-max", e.g., "100-500" or "100-" or "-500"
  description?: string;
  approved?: boolean;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
}

export interface TransactionQueryParams {
  page?: number;
  pageSize?: number;
  sorts?: string[];
  filters?: TransactionFilters;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransactionCreateInput {
  type: (typeof transactionTypeEnum.enumValues)[number];
  amount: string;
  description?: string;
  date: string;
  categoryId: string;
  costCenterId?: string;
  projectId?: string;
  approvedById?: string;
}

export interface TransactionUpdateInput {
  type?: (typeof transactionTypeEnum.enumValues)[number];
  amount?: string;
  description?: string;
  date?: string;
  categoryId?: string;
  costCenterId?: string;
  projectId?: string;
  approvedById?: string | null;
}

// Transaction Category interfaces
export interface TransactionCategoryItem {
  id: string;
  name: string;
  type: (typeof transactionTypeEnum.enumValues)[number];
  description: string | null;
  parentCategoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionCategoryDetail extends TransactionCategoryItem {
  childCategories?: TransactionCategoryItem[];
  parentCategory?: TransactionCategoryItem;
  transactionCount: number;
}

export interface TransactionCategoryWithChildren
  extends TransactionCategoryItem {
  children: TransactionCategoryWithChildren[];
}

export interface TransactionCategoryQueryParams {
  type?: (typeof transactionTypeEnum.enumValues)[number];
  flat?: boolean;
}

export interface TransactionCategoryCreateInput {
  name: string;
  type: (typeof transactionTypeEnum.enumValues)[number];
  description?: string;
  parentCategoryId?: string;
}

export interface TransactionCategoryUpdateInput {
  name?: string;
  type?: (typeof transactionTypeEnum.enumValues)[number];
  description?: string | null;
  parentCategoryId?: string | null;
}

// Budget interfaces
export interface BudgetListItem {
  id: string;
  name: string;
  amount: string;
  description: string | null;
  startDate: string;
  endDate: string;
  costCenterId: string | null;
  projectId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  costCenter?: {
    id: string;
    name: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
  };
  spentAmount: string;
  remainingAmount: string;
  utilizationPercentage: number;
}

export interface BudgetDetail extends BudgetListItem {
  spentAmount: string;
  incomeAmount: string;
  remainingAmount: string;
  utilizationPercentage: number;
  monthlyBreakdown: {
    month: string;
    expenses: string;
    income: string;
  }[];
  topExpenseCategories: {
    categoryId: string;
    categoryName: string | null;
    totalAmount: string;
  }[];
}

export interface BudgetListResponse {
  data: BudgetListItem[];
  totalCount: number;
  pageCount: number;
  page: number;
  pageSize: number;
}

export interface BudgetFilters {
  projectId?: string;
  costCenterId?: string;
  createdById?: string;
  amount?: string; // Format: "min-max"
  name?: string;
  description?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
}

export interface BudgetQueryParams {
  page?: number;
  pageSize?: number;
  sorts?: string[];
  filters?: BudgetFilters;
  dateFrom?: string;
  dateTo?: string;
}

export interface BudgetCreateInput {
  name: string;
  amount: string;
  description?: string;
  startDate: string;
  endDate: string;
  costCenterId?: string;
  projectId?: string;
}

export interface BudgetUpdateInput {
  name?: string;
  amount?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string;
}

// Cost Center interfaces
export interface CostCenterListItem {
  id: string;
  name: string;
  description: string | null;
  budget: string | null;
  departmentId: string | null;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface CostCenterWithStats extends CostCenterListItem {
  activeBudgets: {
    id: string;
    name: string;
    amount: string;
    startDate: string;
    endDate: string;
  }[];
  transactionCount: number;
  totalExpenses: string;
  totalIncome: string;
  balance: string;
}

export interface CostCenterDetail extends CostCenterListItem {
  activeBudgets: {
    id: string;
    name: string;
    amount: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    updatedAt: string;
  }[];
  financialSummary: {
    totalExpenses: string;
    totalIncome: string;
    balance: string;
    transactionCount: number;
    monthlyBreakdown: {
      month: string;
      expenses: string;
      income: string;
    }[];
    topExpenseCategories: {
      categoryId: string;
      categoryName: string | null;
      totalAmount: string;
    }[];
  };
  recentTransactions: {
    id: string;
    type: (typeof transactionTypeEnum.enumValues)[number];
    amount: string;
    description: string | null;
    date: string;
    categoryId: string | null;
    categoryName: string | null;
    createdAt: string;
  }[];
}

export interface CostCenterQueryParams {
  departmentId?: string;
  withStats?: boolean;
}

export interface CostCenterCreateInput {
  name: string;
  description?: string;
  budget?: string;
  departmentId?: string;
}

export interface CostCenterUpdateInput {
  name?: string;
  description?: string | null;
  budget?: string | null;
  departmentId?: string | null;
}

// Financial Dashboard interfaces
export interface FinancialDashboardResponse {
  success: boolean;
  data: {
    summary: {
      currentMonth: {
        income: string;
        expenses: string;
        profit: string;
        transactionCount: number;
      };
      previousMonth: {
        income: string;
        expenses: string;
        profit: string;
        transactionCount: number;
      };
      changes: {
        income: number;
        expenses: number;
        profit: number;
      };
      monthlyBreakdown: {
        month: string;
        income: string;
        expenses: string;
      }[];
    };
    budgets: {
      total: string;
      count: number;
    };
    recentTransactions: TransactionListItem[];
    categoryDistribution: {
      categoryId: string;
      totalAmount: string;
      count: number;
    }[];
    costCenters: {
      id: string;
      name: string;
      budget: string;
    }[];
  };
}
