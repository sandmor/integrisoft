import { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Transaction Details | Finance | Integrisoft",
  description: "View and manage transaction details",
};

export default async function TransactionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // In a real app, you would fetch the transaction details based on params.id

  // Mock transaction data for demonstration
  const transaction = {
    id: id,
    date: "2025-04-15",
    type: "income",
    category: "Sales",
    amount: 5000.0,
    description: "Client payment - Project X",
    status: "approved",
    costCenter: "Main Office",
    project: "Project A",
    approvalHistory: [
      {
        date: "2025-04-15",
        user: "John Smith",
        action: "approved",
        notes: "Approved as per invoice #12345",
      },
      {
        date: "2025-04-14",
        user: "Jane Doe",
        action: "submitted",
        notes: "Submitted for approval",
      },
    ],
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Transaction {transaction.id}</h1>
          <p className="text-muted-foreground">
            View and manage transaction details
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/finances/transactions">
            <Button variant="outline">Back to Transactions</Button>
          </Link>
          <Dialog>
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
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive">Delete</Button>
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
          ${
            transaction.status === "approved"
              ? "bg-green-100 text-green-800"
              : ""
          }
          ${
            transaction.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : ""
          }
          ${transaction.status === "rejected" ? "bg-red-100 text-red-800" : ""}
        `}
        >
          {transaction.status === "approved" ? (
            <CheckCircle className="h-4 w-4 mr-1" />
          ) : transaction.status === "rejected" ? (
            <XCircle className="h-4 w-4 mr-1" />
          ) : null}
          {transaction.status === "approved"
            ? "Approved"
            : transaction.status === "pending"
            ? "Pending"
            : "Rejected"}
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
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-8"
                    defaultValue={transaction.amount}
                    disabled
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" defaultValue={transaction.date} disabled />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  defaultValue={transaction.category}
                  disabled
                />
              </div>

              {/* Cost Center */}
              <div className="space-y-2">
                <Label htmlFor="costCenter">Cost Center</Label>
                <Input
                  id="costCenter"
                  defaultValue={transaction.costCenter}
                  disabled
                />
              </div>

              {/* Project */}
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Input
                  id="project"
                  defaultValue={transaction.project}
                  disabled
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                defaultValue={transaction.description}
                disabled
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Link href={`/dashboard/finances/transactions/${id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Transaction
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Approval History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            Approval History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transaction.approvalHistory.map((item, index) => (
              <div key={index} className="border-l-2 border-gray-200 pl-4 py-2">
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      item.action === "approved"
                        ? "bg-green-500"
                        : item.action === "rejected"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="font-medium">
                    {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                  </span>
                  <span className="text-muted-foreground mx-2">by</span>
                  <span>{item.user}</span>
                  <span className="text-muted-foreground ml-2">
                    {item.date}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
