import { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import EditTransactionFormClient from "@/components/dashboard/finances/EditTransactionFormClient";
import {
  getTransactionCategories,
  getCostCentersList,
} from "@/lib/actions/finances";
import { getProjectsList } from "@/lib/actions/projects";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "New Transaction | Finance | Integrisoft",
  description: "Create a new financial transaction",
};

export default async function NewTransactionPage() {
  // Fetch necessary data for the form
  const [categoriesResult, costCenters, projectsResponse] = await Promise.all([
    getTransactionCategories({ flat: true }),
    getCostCentersList(),
    getProjectsList({ page: 0, pageSize: 100 }),
  ]);
  const categories = categoriesResult as any; // TransactionCategoryItem[]
  const projects = projectsResponse?.data || [];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">New Transaction</h1>
        <Link href="/dashboard/finances/transactions">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <EditTransactionFormClient
        categories={categories}
        costCenters={costCenters}
        projects={projects}
      />
    </div>
  );
}
