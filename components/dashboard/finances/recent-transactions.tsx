"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  category?: string;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  title?: string;
  limit?: number;
}

export function RecentTransactions({
  transactions,
  title = "Recent Transactions",
  limit = 5,
}: RecentTransactionsProps) {
  const limitedTransactions = transactions.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {limitedTransactions.length > 0 ? (
          <div className="space-y-4">
            {limitedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between border-b pb-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge
                      className={`${
                        transaction.type === "income"
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : transaction.type === "expense"
                          ? "bg-red-100 text-red-800 hover:bg-red-200"
                          : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                      }`}
                    >
                      {transaction.type.charAt(0).toUpperCase() +
                        transaction.type.slice(1)}
                    </Badge>
                    {transaction.category && (
                      <span className="text-sm text-muted-foreground">
                        {transaction.category}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/finances/transactions/${transaction.id}`}
                    className="text-lg font-medium text-blue-600 hover:underline"
                  >
                    {transaction.description ||
                      `${transaction.type} transaction`}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(transaction.date), "PPP")}
                  </div>
                </div>
                <div
                  className={`text-lg font-bold ${
                    transaction.type === "income"
                      ? "text-green-600"
                      : transaction.type === "expense"
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {transaction.type === "income"
                    ? "+"
                    : transaction.type === "expense"
                    ? "-"
                    : ""}
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(Math.abs(transaction.amount))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No recent transactions
          </div>
        )}
      </CardContent>
    </Card>
  );
}
