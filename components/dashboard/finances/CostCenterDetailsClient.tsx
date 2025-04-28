"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useDeleteCostCenterMutation } from "@/lib/redux/financesApi";
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
import { Spinner } from "@/components/ui/spinner";
import { RecentTransactions } from "@/components/dashboard/finances/recent-transactions";
import { CostCenterDetail } from "@/lib/types/finances";

interface CostCenterDetailsClientProps {
  costCenter: CostCenterDetail;
}

export default function CostCenterDetailsClient({
  costCenter,
}: CostCenterDetailsClientProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteCostCenter, { isLoading: isDeleting }] =
    useDeleteCostCenterMutation();

  const handleDelete = async () => {
    try {
      await deleteCostCenter(costCenter.id).unwrap();
      toast.success("Cost center deleted successfully");
      router.push("/dashboard/finances/cost-centers");
    } catch (e: any) {
      toast.error(
        `Failed to delete cost center: ${e.data?.error || e.message}`
      );
    }
  };

  const fmtDate = (s: string) => format(new Date(s), "PPP");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Link href="/dashboard/finances/cost-centers">
            <Button variant="outline">Back</Button>
          </Link>
          <Link href={`/dashboard/finances/cost-centers/${costCenter.id}/edit`}>
            <Button>Edit</Button>
          </Link>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Cost Center</DialogTitle>
                <DialogDescription>
                  Are you sure? This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
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
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <strong>Description:</strong> {costCenter.description || "—"}
          </p>
          <p>
            <strong>Budget:</strong>{" "}
            {costCenter.budget
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(parseFloat(costCenter.budget))
              : "—"}
          </p>
          <p>
            <strong>Department:</strong> {costCenter.department?.name || "—"}
          </p>
          <p>
            <strong>Created:</strong> {fmtDate(costCenter.createdAt)}
          </p>
          <p>
            <strong>Updated:</strong> {fmtDate(costCenter.updatedAt)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          {costCenter.activeBudgets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costCenter.activeBudgets.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.name}</TableCell>
                    <TableCell>
                      {fmtDate(b.startDate)} — {fmtDate(b.endDate)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(parseFloat(b.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No active budgets</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Total Income:</strong>{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(parseFloat(costCenter.financialSummary.totalIncome))}
            </div>
            <div>
              <strong>Total Expenses:</strong>{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(parseFloat(costCenter.financialSummary.totalExpenses))}
            </div>
            <div>
              <strong>Balance:</strong>{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(parseFloat(costCenter.financialSummary.balance))}
            </div>
            <div>
              <strong>Transactions:</strong>{" "}
              {costCenter.financialSummary.transactionCount}
            </div>
          </div>
        </CardContent>
      </Card>

      <RecentTransactions
        transactions={costCenter.recentTransactions.map((t) => ({
          id: t.id,
          type: t.type,
          description: t.description || "",
          amount: parseFloat(t.amount),
          date: t.date,
          category: t.categoryName || undefined,
        }))}
        title="Recent Transactions"
        limit={5}
      />
    </div>
  );
}
