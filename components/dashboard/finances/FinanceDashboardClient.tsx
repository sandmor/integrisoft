"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  RevenueExpenseChart,
  CashFlowChart,
  RecentTransactions,
  OverviewCard,
} from "@/components/dashboard/finances";
import { useGetFinancialSummaryQuery } from "@/lib/redux/financesApi";

export default function FinanceDashboardClient() {
  const {
    data: financialSummaryResponse,
    isLoading,
    error,
  } = useGetFinancialSummaryQuery();

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex flex-col space-y-6">
        <h1 className="text-3xl font-bold">Finance Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow h-64">
              <Skeleton className="h-6 w-40 mb-4" />
              <Skeleton className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-3xl font-bold text-red-600">Error</h1>
        <p className="text-gray-600">Failed to load financial data</p>
      </div>
    );
  }

  const financialSummary = financialSummaryResponse?.data;

  // Calculate totals and trends from the data
  const totalRevenue = parseFloat(
    financialSummary?.summary.currentMonth.income || "0"
  );
  const totalExpenses = parseFloat(
    financialSummary?.summary.currentMonth.expenses || "0"
  );
  const netProfit = totalRevenue - totalExpenses;

  // Calculate change percentages
  const revenueTrend = financialSummary?.summary.changes.income || 0;
  const expenseTrend = financialSummary?.summary.changes.expenses || 0;
  const profitTrend = financialSummary?.summary.changes.profit || 0;

  // Calculate budget utilization percentage
  const budgetTotal = parseFloat(financialSummary?.budgets.total || "0");
  const budgetUtilizationPct =
    budgetTotal > 0 ? Math.round((totalExpenses / budgetTotal) * 100) : 0;

  // Generate monthly data for previous 6 months for the charts
  const revenueExpenseData =
    financialSummary?.summary.monthlyBreakdown?.map((item) => ({
      name: item.month,
      revenue: parseFloat(item.income),
      expenses: parseFloat(item.expenses),
    })) || [];

  // Generate cash flow data
  const cashFlowData = revenueExpenseData.map((item) => ({
    date: item.name,
    amount: item.revenue - item.expenses,
  }));

  // Format transactions for the RecentTransactions component
  const formattedTransactions =
    financialSummary?.recentTransactions?.map((transaction) => {
      // Ensure type is strictly 'income', 'expense', or 'transfer'
      const type: "income" | "expense" | "transfer" =
        transaction.type === "income"
          ? "income"
          : transaction.type === "expense"
          ? "expense"
          : "transfer";

      return {
        id: transaction.id,
        type,
        description: transaction.description || "",
        amount: parseFloat(transaction.amount),
        date: transaction.date,
        category: transaction.category?.name,
      };
    }) || [];

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-3xl font-bold">Finance Dashboard</h1>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          title="Total Revenue"
          value={new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(totalRevenue)}
          trend={revenueTrend}
          icon="dollar"
        />
        <OverviewCard
          title="Total Expenses"
          value={new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(totalExpenses)}
          trend={expenseTrend}
          icon="credit-card"
        />
        <OverviewCard
          title="Net Profit"
          value={new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(netProfit)}
          trend={profitTrend}
          icon="trending-up"
        />
        <OverviewCard
          title="Budget Utilization"
          value={`${budgetUtilizationPct}%`}
          trend={-expenseTrend}
          icon="pie-chart"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Revenue vs Expenses</h2>
          <RevenueExpenseChart data={revenueExpenseData} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Cash Flow</h2>
          <CashFlowChart data={cashFlowData} />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <RecentTransactions transactions={formattedTransactions} limit={5} />
      </div>
    </div>
  );
}
