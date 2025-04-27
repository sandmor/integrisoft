import { Metadata } from "next";
import CostCenterFormClient from "@/components/dashboard/finances/CostCenterFormClient";

export const metadata: Metadata = {
  title: "Create New Cost Center | Finances | Integrisoft",
  description: "Create a new cost center for financial tracking",
};

export default function NewCostCenterPage() {
  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">New Cost Center</h1>
      <CostCenterFormClient isNew={true} />
    </div>
  );
}
