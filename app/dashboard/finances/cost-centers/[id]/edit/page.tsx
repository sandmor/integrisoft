import { Metadata } from "next";
import { notFound } from "next/navigation";
import CostCenterFormClient from "@/components/dashboard/finances/CostCenterFormClient";
import { getCostCenterById } from "@/lib/actions/finances";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const costCenter = await getCostCenterById(id);
  if (!costCenter) {
    return { title: "Edit Cost Center Not Found | Finances | Integrisoft" };
  }
  return {
    title: `Edit ${costCenter.name} | Cost Centers | Finances | Integrisoft`,
    description: `Edit Cost center details for ${costCenter.name}`,
  };
}

export default async function EditCostCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const costCenter = await getCostCenterById(id);
  if (!costCenter) notFound();

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Cost Center</h1>
      <CostCenterFormClient costCenter={costCenter} />
    </div>
  );
}
