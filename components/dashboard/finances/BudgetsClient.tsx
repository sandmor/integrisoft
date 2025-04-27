"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "@/app/dashboard/finances/budgets/columns";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetListResponse } from "@/lib/types/finances";

interface BudgetsClientProps {
  initialData: BudgetListResponse;
}

export default function BudgetsClient({ initialData }: BudgetsClientProps) {
  const budgets = initialData.data;
  const totalPages = initialData.pageCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Budgets</h1>
        <Button asChild>
          <Link href="/dashboard/finances/budgets/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Budget
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={budgets}
        pageCount={totalPages}
        manualPagination={false}
        manualSorting={false}
        manualFiltering={false}
      />
    </div>
  );
}
