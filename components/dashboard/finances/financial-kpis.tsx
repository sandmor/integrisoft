import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Download, Info } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
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
import { Progress } from "@/components/ui/progress";
import {
  Tooltip as UITooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

// Interfaces
interface FinancialKPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  status: "success" | "warning" | "danger" | "neutral";
  previousValue: number;
  change: number;
  changeType: "positive" | "negative" | "neutral";
  description: string;
  trend: Array<{
    date: string;
    value: number;
  }>;
}

interface KPICategory {
  id: string;
  name: string;
  kpis: FinancialKPI[];
}

interface FinancialKPIsProps {
  categories: KPICategory[];
  timeRanges: Array<{
    id: string;
    name: string;
  }>;
  onExportKPIs: (format: "csv" | "pdf" | "excel") => void;
  onTimeRangeChange: (timeRangeId: string) => void;
}

const formatValue = (value: number, unit: string) => {
  if (unit === "$") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } else if (unit === "%") {
    return `${value.toFixed(1)}%`;
  } else {
    return `${value.toLocaleString()} ${unit}`;
  }
};

export function FinancialKPIs({
  categories,
  timeRanges,
  onExportKPIs,
  onTimeRangeChange,
}: FinancialKPIsProps) {
  const [activeCategory, setActiveCategory] = useState<string>(
    categories.length > 0 ? categories[0].id : ""
  );
  const [timeRange, setTimeRange] = useState<string>(
    timeRanges.length > 0 ? timeRanges[0].id : ""
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf" | "excel">(
    "excel"
  );

  const selectedCategory = categories.find((cat) => cat.id === activeCategory);

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    onTimeRangeChange(range);
  };

  const getStatusColor = (status: FinancialKPI["status"]): string => {
    switch (status) {
      case "success":
        return "#10b981"; // emerald-500
      case "warning":
        return "#f59e0b"; // amber-500
      case "danger":
        return "#ef4444"; // rose-500
      default:
        return "#64748b"; // slate-500
    }
  };

  const getStatusColorClass = (status: FinancialKPI["status"]): string => {
    switch (status) {
      case "success":
        return "text-emerald-500";
      case "warning":
        return "text-amber-500";
      case "danger":
        return "text-rose-500";
      default:
        return "text-slate-500";
    }
  };

  const formatChange = (change: number, unit: string) => {
    const prefix = change > 0 ? "+" : "";
    if (unit === "$") {
      return (
        prefix +
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(change)
      );
    } else if (unit === "%") {
      return `${prefix}${change.toFixed(1)}%`;
    } else {
      return `${prefix}${change.toLocaleString()} ${unit}`;
    }
  };

  const getChangeColor = (
    changeType: "positive" | "negative" | "neutral"
  ): string => {
    switch (changeType) {
      case "positive":
        return "text-green-500";
      case "negative":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
  ];

  if (!selectedCategory) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Financial KPIs</CardTitle>
          <CardDescription>
            Key performance indicators tracking financial health
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">No KPI categories available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">
          Financial Key Performance Indicators
        </h2>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
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
              size="sm"
              onClick={() => onExportKPIs(exportFormat)}
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="mb-6">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent
            key={category.id}
            value={category.id}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {category.kpis.map((kpi) => {
                const progressValue = (kpi.value / kpi.target) * 100;
                const statusColor = getStatusColor(kpi.status);

                return (
                  <Card key={kpi.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{kpi.name}</CardTitle>
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full"
                              >
                                <Info className="h-4 w-4" />
                                <span className="sr-only">Info</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{kpi.description}</p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-4">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-2xl font-bold">
                          {formatValue(kpi.value, kpi.unit)}
                        </span>
                        <Badge
                          variant={
                            kpi.status === "success"
                              ? "outline"
                              : kpi.status === "warning"
                              ? "secondary"
                              : kpi.status === "danger"
                              ? "destructive"
                              : "outline"
                          }
                          className="ml-2"
                        >
                          {kpi.status === "success"
                            ? "On Track"
                            : kpi.status === "warning"
                            ? "Caution"
                            : kpi.status === "danger"
                            ? "At Risk"
                            : "Neutral"}
                        </Badge>
                      </div>

                      <span
                        className={`text-sm ${getChangeColor(kpi.changeType)}`}
                      >
                        {formatChange(kpi.change, kpi.unit)} vs previous
                      </span>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>
                            {Math.min(100, Math.round(progressValue))}%
                          </span>
                        </div>
                        <Progress
                          value={progressValue}
                          className="h-2"
                          indicatorClassName={
                            kpi.status === "success"
                              ? "bg-emerald-500"
                              : kpi.status === "warning"
                              ? "bg-amber-500"
                              : kpi.status === "danger"
                              ? "bg-rose-500"
                              : "bg-slate-500"
                          }
                        />
                      </div>

                      <div className="mt-4 h-16">
                        <ChartContainer
                          config={{
                            value: { label: kpi.name, color: statusColor },
                          }}
                          className="w-full h-full"
                        >
                          <LineChart data={kpi.trend}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="var(--color-value)"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detailed Trend Charts */}
              {category.kpis.slice(0, 2).map((kpi) => (
                <Card key={`${kpi.id}-trend`}>
                  <CardHeader>
                    <CardTitle>{kpi.name} - Detailed Trend</CardTitle>
                    <CardDescription>
                      Tracking changes over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 w-full">
                      <ChartContainer
                        config={{
                          value: {
                            label: kpi.name,
                            color: getStatusColor(kpi.status),
                          },
                        }}
                        className="w-full h-full"
                      >
                        <AreaChart
                          data={kpi.trend}
                          margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--color-value)"
                            fill="var(--color-value)"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>KPI Comparison</CardTitle>
                <CardDescription>
                  Current value vs target for all KPIs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ChartContainer
                    config={{
                      "Current Value": {
                        label: "Current Value",
                        color: "#1e40af",
                      },
                      Target: { label: "Target", color: "#64748b" },
                    }}
                    className="w-full h-full"
                  >
                    <BarChart
                      data={category.kpis.map((kpi) => ({
                        name: kpi.name,
                        "Current Value": kpi.value,
                        Target: kpi.target,
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        width={150}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="Current Value"
                        fill="var(--color-Current Value)"
                        unit="$"
                      >
                        {category.kpis.map((kpi, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getStatusColor(kpi.status)}
                          />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="Target"
                        fill="var(--color-Target)"
                        unit="$"
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
