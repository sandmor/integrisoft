import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import EditTransactionFormClient from "@/components/dashboard/finances/EditTransactionFormClient";
import {
  getTransactionById,
  getTransactionCategories,
  getCostCentersList,
} from "@/lib/actions/finances";
import { getProjectsList } from "@/lib/actions/projects";
import { TransactionCategoryItem } from "@/lib/types/finances";
import { format } from "date-fns";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const transaction = await getTransactionById(id);
  if (!transaction) {
    return { title: "Edit Transaction Not Found | Finances | Integrisoft" };
  }
  // Format amount
  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP");
  };
  const typeLabel =
    transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
  const amountLabel = `$${formatAmount(transaction.amount)}`;
  const titleLabel = `${typeLabel} ${amountLabel} on ${formatDate(
    transaction.date
  )}`;
  return {
    title: `${titleLabel} | Finances | Integrisoft`,
    description: `Edit details for ${typeLabel.toLowerCase()} of ${amountLabel} on ${formatDate(
      transaction.date
    )}`,
  };
}

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch data concurrently on the server
  const [transaction, categoriesResult, costCenters, projectsResponse] =
    await Promise.all([
      getTransactionById(id),
      getTransactionCategories({ flat: true }),
      getCostCentersList(),
      getProjectsList({ page: 0, pageSize: 100 }),
    ]);

  // Handle transaction not found
  if (!transaction) {
    notFound(); // Use Next.js notFound for better handling
  }

  // Type cast the categories to match the expected type in the component
  const categories = categoriesResult as TransactionCategoryItem[];

  const projects = projectsResponse?.data || []; // Extract projects data

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Transaction</h1>
        <Link href={`/dashboard/finances/transactions/${id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      {/* Render the client component with fetched data */}
      <EditTransactionFormClient
        transaction={transaction}
        categories={categories}
        costCenters={costCenters}
        projects={projects}
      />
    </div>
  );
}
