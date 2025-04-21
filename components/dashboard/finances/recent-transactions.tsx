import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export interface RecentTransaction {
  id: string;
  type: "income" | "expense" | "transfer";
  description: string;
  amount: number;
  date: string;
  category?: string;
}

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
  title?: string;
  className?: string;
  limit?: number;
}

export function RecentTransactions({
  transactions,
  title = "Recent Transactions",
  className,
  limit = 5,
}: RecentTransactionsProps) {
  const displayTransactions = transactions.slice(0, limit);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Your latest financial activity</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/finances/transactions">View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full p-1",
                      transaction.type === "income"
                        ? "bg-green-100"
                        : transaction.type === "expense"
                        ? "bg-red-100"
                        : "bg-blue-100"
                    )}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUpIcon className="h-3 w-3 text-green-600" />
                    ) : transaction.type === "expense" ? (
                      <ArrowDownIcon className="h-3 w-3 text-red-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-blue-600" />
                    )}
                  </span>
                  <span className="font-medium">{transaction.description}</span>
                </TableCell>
                <TableCell>
                  {transaction.category && (
                    <Badge variant="outline">{transaction.category}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(transaction.date).toLocaleDateString()}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    transaction.type === "income"
                      ? "text-green-600"
                      : transaction.type === "expense"
                      ? "text-red-600"
                      : "text-blue-600"
                  )}
                >
                  {transaction.type === "income"
                    ? "+"
                    : transaction.type === "expense"
                    ? "-"
                    : ""}
                  ${transaction.amount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {displayTransactions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-4 text-muted-foreground"
                >
                  No recent transactions
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
