import { Metadata } from "next";
import { getBudgetList } from "@/lib/actions/finances";
import BudgetsClient from "@/components/dashboard/finances/BudgetsClient";

export const metadata: Metadata = {
  title: "Budgets | Finances | Integrisoft",
  description: "Plan and track budgets across projects and cost centers",
};

export default async function BudgetsPage() {
  // Fetch budgets server-side
  const initialData = await getBudgetList({ page: 1, pageSize: 10 });
  return <BudgetsClient initialData={initialData} />;
}
