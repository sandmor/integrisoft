import { Metadata } from "next";
import CostCentersClient from "@/components/dashboard/finances/CostCentersClient";
import { getCostCentersList } from "@/lib/actions/finances";

export const metadata: Metadata = {
  title: "Cost Centers | Finances | Integrisoft",
  description: "Manage cost centers across your organization",
};

export default async function CostCentersPage() {
  // Fetch initial data server-side
  const initialData = await getCostCentersList();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cost Centers</h1>
      <CostCentersClient initialData={initialData} />
    </div>
  );
}
