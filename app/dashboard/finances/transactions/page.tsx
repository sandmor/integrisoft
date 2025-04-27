import TransactionsClient from "@/components/dashboard/finances/TransactionsClient";
import { getTransactionList } from "@/lib/actions/finances";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transactions | Finances | Integrisoft",
  description: "Manage financial transactions across your organization",
};

export default async function TransactionsPage() {
  // Fetch initial data on the server
  const initialData = await getTransactionList({
    page: 0,
    pageSize: 10,
    sorts: ["-date"],
  });
  // Pass the data to the client component
  return <TransactionsClient initialData={initialData} />;
}
