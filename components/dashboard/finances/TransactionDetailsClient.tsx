"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, Trash, CheckCircle, XCircle, History } from "lucide-react";
import Link from "next/link";
import { useDeleteTransactionMutation } from "@/lib/redux/financesApi";
import { format } from "date-fns";
import { TransactionDetail } from "@/lib/types/finances";

interface TransactionDetailsClientProps {
  transaction: TransactionDetail;
}

export default function TransactionDetailsClient({
  transaction,
}: TransactionDetailsClientProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTransaction, { isLoading: isDeleting }] =
    useDeleteTransactionMutation();

  const handleDelete = async () => {
    try {
      await deleteTransaction(transaction.id).unwrap();
      router.push("/dashboard/finances/transactions");
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // Format transaction data
  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format date from ISO string
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP");
  };

  // Determine transaction status
  const status = transaction.approvedAt ? "approved" : "pending";

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">
            View and manage transaction details
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/finances/transactions">
            <Button variant="outline">Back to Transactions</Button>
          </Link>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Transaction</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this transaction? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center">
        <div
          className={`
          px-3 py-1 rounded-full text-sm font-medium inline-flex items-center
          ${status === "approved" ? "bg-green-100 text-green-800" : ""}
          ${status === "pending" ? "bg-yellow-100 text-yellow-800" : ""}
        `}
        >
          {status === "approved" && <CheckCircle className="h-4 w-4 mr-1" />}
          {status === "approved" ? "Approved" : "Pending"}
        </div>
      </div>

      {/* Transaction Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>Information about this transaction</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transaction Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <Select defaultValue={transaction.type} disabled>
                  <SelectTrigger id="type">
                    <SelectValue placeholder={transaction.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    className="pl-8"
                    value={formatAmount(transaction.amount)}
                    disabled
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  value={formatDate(transaction.date)}
                  disabled
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={transaction.category?.name || "Uncategorized"}
                  disabled
                />
              </div>

              {/* Cost Center */}
              <div className="space-y-2">
                <Label htmlFor="costCenter">Cost Center</Label>
                <Input
                  id="costCenter"
                  value={transaction.costCenter?.name || "None"}
                  disabled
                />
              </div>

              {/* Project */}
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Input
                  id="project"
                  value={transaction.project?.name || "None"}
                  disabled
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={transaction.description || ""}
                disabled
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Link
            href={`/dashboard/finances/transactions/${transaction.id}/edit`}
          >
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Transaction
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Created/Updated Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <History className="h-5 w-5 mr-2" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transaction.approvedAt && (
              <div className="border-l-2 border-green-200 pl-4 py-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2 bg-green-500"></div>
                  <span className="font-medium">Approved</span>
                  <span className="text-muted-foreground mx-2">by</span>
                  <span>{transaction.approvedBy?.name || "System"}</span>
                  <span className="text-muted-foreground ml-2">
                    {formatDate(transaction.approvedAt)}
                  </span>
                </div>
              </div>
            )}
            <div className="border-l-2 border-blue-200 pl-4 py-2">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full mr-2 bg-blue-500"></div>
                <span className="font-medium">Created</span>
                <span className="text-muted-foreground mx-2">by</span>
                <span>{transaction.createdBy?.name || "System"}</span>
                <span className="text-muted-foreground ml-2">
                  {formatDate(transaction.createdAt)}
                </span>
              </div>
            </div>
            <div className="border-l-2 border-gray-200 pl-4 py-2">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full mr-2 bg-gray-500"></div>
                <span className="font-medium">Updated</span>
                <span className="text-muted-foreground ml-2">
                  {formatDate(transaction.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
