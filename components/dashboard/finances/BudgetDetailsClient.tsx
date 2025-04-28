"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useDeleteBudgetMutation } from "@/lib/redux/financesApi";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Edit, Trash } from "lucide-react";
import { BudgetDetail } from "@/lib/types/finances";

interface BudgetDetailsClientProps {
  budget: BudgetDetail;
}

export default function BudgetDetailsClient({
  budget,
}: BudgetDetailsClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteBudget, { isLoading: isDeleting }] = useDeleteBudgetMutation();

  const handleDelete = async () => {
    try {
      await deleteBudget(budget.id).unwrap();
      toast.success("Budget deleted successfully");
      router.push("/dashboard/finances/budgets");
    } catch (e: any) {
      toast.error(`Failed to delete budget. ${e.data?.error || e.message}`);
    }
  };

  const fmtDate = (s: string) => format(new Date(s), "PPP");
  const fmtAmount = (s: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(s));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex space-x-2">
          <Link href="/dashboard/finances/budgets">
            <Button variant="outline">Back</Button>
          </Link>
          <Link href={`/dashboard/finances/budgets/${budget.id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Budget</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this budget? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
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

      <Card>
        <CardHeader>
          <CardTitle>{budget.name}</CardTitle>
          <CardDescription>
            {budget.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            <strong>Period:</strong> {fmtDate(budget.startDate)} —{" "}
            {fmtDate(budget.endDate)}
          </p>
          <p>
            <strong>Allocated:</strong> {fmtAmount(budget.amount)}
          </p>
          <p>
            <strong>Spent:</strong> {fmtAmount(budget.spentAmount)}
          </p>
          <p>
            <strong>Remaining:</strong> {fmtAmount(budget.remainingAmount)}
          </p>
          <p>
            <strong>Utilization:</strong>{" "}
            {budget.utilizationPercentage.toFixed(1)}%
          </p>
          <p>
            <strong>Cost Center:</strong> {budget.costCenter?.name || "—"}
          </p>
          <p>
            <strong>Project:</strong> {budget.project?.name || "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budget.monthlyBreakdown.map((m) => (
                <TableRow key={m.month}>
                  <TableCell>{m.month}</TableCell>
                  <TableCell>{fmtAmount(m.expenses)}</TableCell>
                  <TableCell>{fmtAmount(m.income)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Expense Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budget.topExpenseCategories.map((c) => (
                <TableRow key={c.categoryId}>
                  <TableCell>{c.categoryName || "Unknown"}</TableCell>
                  <TableCell>{fmtAmount(c.totalAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
