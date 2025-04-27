import { Metadata } from "next";
import FinanceDashboardClient from "@/components/dashboard/finances/FinanceDashboardClient";

export const metadata: Metadata = {
  title: "Finance Dashboard | Integrisoft",
  description: "Overview of financial performance, budgets, and transactions.",
};

export default function FinanceDashboardPage() {
  return <FinanceDashboardClient />;
}
