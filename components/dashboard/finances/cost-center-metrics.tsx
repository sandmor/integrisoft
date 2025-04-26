import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { CalendarIcon, Download } from "lucide-react";
import { useState } from "react";

interface CostCenterMetric {
  id: string;
  name: string;
  budget: number;
  spent: number;
  remaining: number;
  trend: Array<{
    date: string;
    budget: number;
    spent: number;
  }>;
  subcategories: Array<{
    id: string;
    name: string;
    budget: number;
    spent: number;
  }>;
  kpis: Array<{
    name: string;
    value: number;
    target: number;
    unit: string;
    status: "success" | "warning" | "danger";
  }>;
}

interface CostCenterMetricsProps {
  costCenters: Array<{
    id: string;
    name: string;
  }>;
  metrics: Record<string, CostCenterMetric>;
  timeRanges: Array<{
    id: string;
    name: string;
  }>;
  onExportData: (costCenterId: string, format: "csv" | "pdf" | "excel") => void;
  onDateRangeChange: (range: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export function CostCenterMetrics({
  costCenters,
  metrics,
  timeRanges,
  onExportData,
  onDateRangeChange,
}: CostCenterMetricsProps) {
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>(
    costCenters.length > 0 ? costCenters[0].id : ""
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(
    timeRanges.length > 0 ? timeRanges[0].id : ""
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf" | "excel">(
    "excel"
  );

  const selectedMetrics = metrics[selectedCostCenter];

  // Calculate utilization percentage
  const utilization = selectedMetrics
    ? (selectedMetrics.spent / selectedMetrics.budget) * 100
    : 0;

  // Prepare data for the pie chart
  const spendingData =
    selectedMetrics?.subcategories.map((subcategory) => ({
      name: subcategory.name,
      amount: subcategory.spent,
    })) || [];

  const handleCostCenterChange = (id: string) => {
    setSelectedCostCenter(id);
  };

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
    onDateRangeChange(range);
  };

  const getStatusColor = (status: "success" | "warning" | "danger") => {
    switch (status) {
      case "success":
        return "bg-green-500";
      case "warning":
        return "bg-orange-500";
      case "danger":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColorHex = (status: "success" | "warning" | "danger") => {
    switch (status) {
      case "success":
        return "#10b981"; // green-500
      case "warning":
        return "#f59e0b"; // orange-500
      case "danger":
        return "#ef4444"; // red-500
      default:
        return "#64748b"; // gray-500
    }
  };

  // Colors for pie chart
  const COLORS = [
    "#3b82f6",
    "#06b6d4",
    "#4f46e5",
    "#8b5cf6",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ];

  if (!selectedMetrics) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Cost Center Metrics</CardTitle>
          <CardDescription>
            Select a cost center to view its performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No cost center data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-2xl font-bold">Cost Center Performance</h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedCostCenter}
            onValueChange={handleCostCenterChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select cost center" />
            </SelectTrigger>
            <SelectContent>
              {costCenters.map((center) => (
                <SelectItem key={center.id} value={center.id}>
                  {center.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedTimeRange}
            onValueChange={handleTimeRangeChange}
          >
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.id} value={range.id}>
                  {range.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Select
              value={exportFormat}
              onValueChange={(value: "csv" | "pdf" | "excel") =>
                setExportFormat(value)
              }
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => onExportData(selectedCostCenter, exportFormat)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Budget Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(utilization)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(selectedMetrics.spent)} of{" "}
              {formatCurrency(selectedMetrics.budget)}
            </p>
            <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  utilization > 90
                    ? "bg-red-500"
                    : utilization > 75
                    ? "bg-orange-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <div>0%</div>
              <div>50%</div>
              <div>100%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Remaining Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(selectedMetrics.remaining)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercentage(100 - utilization)} remaining of total budget
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Badge
                variant={
                  selectedMetrics.remaining < 0 ? "destructive" : "outline"
                }
                className="rounded-sm"
              >
                {selectedMetrics.remaining < 0
                  ? "OVER BUDGET"
                  : "WITHIN BUDGET"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Key Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedMetrics.kpis.map((kpi) => {
                const percentage = (kpi.value / kpi.target) * 100;
                return (
                  <div key={kpi.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="text-sm">{kpi.name}</div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${getStatusColor(
                            kpi.status
                          )}`}
                        />
                        <span className="text-sm font-medium">
                          {kpi.value}
                          {kpi.unit}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          of {kpi.target}
                          {kpi.unit}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStatusColor(kpi.status)}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
            <CardDescription>
              Budget vs. actual spending over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ChartContainer
                config={{
                  budget: { label: "Budget", color: "#3b82f6" },
                  spent: { label: "Spent", color: "#f59e0b" },
                }}
                className="w-full h-full"
              >
                <AreaChart
                  data={selectedMetrics.trend}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="budget"
                    stroke="var(--color-budget)"
                    fill="var(--color-budget)"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="spent"
                    stroke="var(--color-spent)"
                    fill="var(--color-spent)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="h-72 w-full">
              <ChartContainer
                config={{ amount: { label: "Amount", color: "#8884d8" } }}
                className="w-full h-full"
              >
                <PieChart>
                  <Pie
                    data={spendingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    dataKey="amount"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {spendingData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    formatter={(value) => formatCurrency(value as number)}
                    content={<ChartTooltipContent />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subcategory Breakdown</CardTitle>
            <CardDescription>Budget vs. actual by subcategory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ChartContainer
                config={{
                  budget: { label: "Budget", color: "#3b82f6" },
                  spent: { label: "Spent", color: "#f59e0b" },
                }}
                className="w-full h-full"
              >
                <BarChart
                  data={selectedMetrics.subcategories}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis type="category" dataKey="name" width={150} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="budget"
                    name="Budget"
                    fill="var(--color-budget)"
                  />
                  <Bar dataKey="spent" name="Spent" fill="var(--color-spent)" />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
