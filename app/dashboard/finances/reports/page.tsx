import { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Financial Reports | Integrisoft",
  description: "View and generate financial reports",
};

const reports = [
  {
    id: "income-statement",
    name: "Income Statement",
    description: "Shows revenue, expenses, and profit over a specific period",
    icon: "📊",
  },
  {
    id: "cash-flow",
    name: "Cash Flow Statement",
    description: "Displays cash inflows and outflows over a specific period",
    icon: "💰",
  },
  {
    id: "budget-variance",
    name: "Budget Variance Report",
    description: "Compares budgeted amounts to actual spending",
    icon: "📈",
  },
  {
    id: "project-financial",
    name: "Project Financial Report",
    description: "Financial performance by project",
    icon: "📁",
  },
];

export default function FinancialReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financial Reports</h2>
        <p className="text-muted-foreground">
          Generate, view, and export financial reports
        </p>
      </div>

      <Tabs defaultValue="standard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="standard">Standard Reports</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {reports.map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer hover:bg-muted/50"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {report.name}
                  </CardTitle>
                  <div className="text-2xl">{report.icon}</div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{report.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>
                Create your own custom financial reports with specific
                parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This feature will be implemented in Phase 4 as per the roadmap.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Set up automatic report generation and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This feature will be implemented in Phase 4 as per the roadmap.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
