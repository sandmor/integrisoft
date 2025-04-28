import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBudgetById } from "@/lib/actions/finances";
import BudgetEditFormClient from "@/components/dashboard/finances/BudgetEditFormClient";

export const metadata: Metadata = {
  title: "Edit Budget | Finances | Integrisoft",
  description: "Edit budget details",
};

export default async function EditBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const budget = await getBudgetById(id);
  if (!budget) notFound();
  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Budget</h1>
      <BudgetEditFormClient budget={budget} />
    </div>
  );
}
