import { format } from "date-fns";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import TransactionDetailsClient from "@/components/dashboard/finances/TransactionDetailsClient";
import { getTransactionById } from "@/lib/actions/finances";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const transaction = await getTransactionById(id);
  if (!transaction) {
    return { title: "Transaction Not Found | Finances | Integrisoft" };
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
    description: `Transaction details for ${typeLabel.toLowerCase()} of ${amountLabel} on ${formatDate(
      transaction.date
    )}`,
  };
}

export default async function TransactionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transaction = await getTransactionById(id);
  if (!transaction) notFound();
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
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">{titleLabel}</h1>
      <TransactionDetailsClient transaction={transaction} />
    </>
  );
}
