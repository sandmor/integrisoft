import { Metadata } from "next";
import { notFound } from "next/navigation";
import CostCenterDetailsClient from "@/components/dashboard/finances/CostCenterDetailsClient";
import { getCostCenterById } from "@/lib/actions/finances";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const costCenter = await getCostCenterById(id);
  if (!costCenter) {
    return { title: "Cost Center Not Found | Finances | Integrisoft" };
  }
  return {
    title: `${costCenter.name} | Cost Centers | Finances | Integrisoft`,
    description: `Cost center details for ${costCenter.name}`,
  };
}

export default async function CostCenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const costCenter = await getCostCenterById(id);
  if (!costCenter) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cost Center: {costCenter.name}</h1>
      <CostCenterDetailsClient costCenter={costCenter} />
    </div>
  );
}
