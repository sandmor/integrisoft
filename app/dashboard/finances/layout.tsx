import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function FinancesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col space-y-6">
      <Card className="p-2">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="dashboard" asChild>
              <Link href="/dashboard/finances">Dashboard</Link>
            </TabsTrigger>
            <TabsTrigger value="transactions" asChild>
              <Link href="/dashboard/finances/transactions">Transactions</Link>
            </TabsTrigger>
            <TabsTrigger value="budgets" asChild>
              <Link href="/dashboard/finances/budgets">Budgets</Link>
            </TabsTrigger>
            <TabsTrigger value="cost-centers" asChild>
              <Link href="/dashboard/finances/cost-centers">Cost Centers</Link>
            </TabsTrigger>
            <TabsTrigger value="reports" asChild>
              <Link href="/dashboard/finances/reports">Reports</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>
      {children}
    </div>
  );
}
