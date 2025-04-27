import { Metadata } from "next";
import BudgetFormClient from "@/components/dashboard/finances/BudgetFormClient";

export const metadata: Metadata = {
  title: "Create New Budget | Finances | Integrisoft",
  description: "Create a new budget for financial planning",
};

export default function NewBudgetPage() {
  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">New Budget</h1>
      <BudgetFormClient isNew={true} />
    </div>
  );
}
