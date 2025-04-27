import { Metadata } from "next";
import { notFound } from "next/navigation";
import BudgetDetailsClient from "@/components/dashboard/finances/BudgetDetailsClient";
import { getBudgetById } from "@/lib/actions/finances";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const budget = await getBudgetById(id);
  if (!budget) {
    return { title: "Budget Not Found | Finances | Integrisoft" };
  }
  return {
    title: `${budget.name} | Budgets | Finances | Integrisoft`,
    description: `Budget details for ${budget.name}`,
  };
}

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const budget = await getBudgetById(id);
  if (!budget) notFound();
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">{budget.name}</h1>
      <BudgetDetailsClient budget={budget} />
    </>
  );
}
