import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Download, Filter, SortAsc, SortDesc } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface DepartmentCost {
  id: string;
  name: string;
  budget: number;
  actualSpend: number;
  previousYearSpend: number;
  employeeCount: number;
  costPerEmployee: number;
  projects: number;
  categories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  trend: Array<{
    month: string;
    planned: number;
    actual: number;
  }>;
}

type SortField =
  | "name"
  | "budget"
  | "actualSpend"
  | "variance"
  | "costPerEmployee";
type SortDirection = "asc" | "desc";

interface DepartmentCostAnalysisProps {
  departments: Department[];
  departmentCosts: Record<string, DepartmentCost>;
  fiscalYear: string;
  onExport: (
    departmentId: string | "all",
    format: "csv" | "pdf" | "excel"
  ) => void;
  onFiscalYearChange: (year: string) => void;
}

export function DepartmentCostAnalysis({
  departments,
  departmentCosts,
  fiscalYear,
  onExport,
  onFiscalYearChange,
}: DepartmentCostAnalysisProps) {
  const [activeDepartment, setActiveDepartment] = useState<string>(
    departments.length > 0 ? departments[0].id : ""
  );
  const [sortField, setSortField] = useState<SortField>("budget");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf" | "excel">(
    "excel"
  );
  const [activeTab, setActiveTab] = useState("overview");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate variance percentages
  const calculateVariance = (budget: number, actual: number) => {
    if (budget === 0) return { amount: actual, percentage: 0 };
    const variance = budget - actual;
    const percentage = (variance / budget) * 100;
    return { amount: variance, percentage };
  };

  // Generate comparison data for all departments
  const departmentComparison = departments
    .map((dept) => {
      const costData = departmentCosts[dept.id];
      if (!costData) return null;

      const variance = calculateVariance(costData.budget, costData.actualSpend);
      const yearOverYearChange =
        costData.previousYearSpend > 0
          ? ((costData.actualSpend - costData.previousYearSpend) /
              costData.previousYearSpend) *
            100
          : 0;

      return {
        id: costData.id,
        name: costData.name,
        budget: costData.budget,
        actualSpend: costData.actualSpend,
        variance: variance.amount,
        variancePercentage: variance.percentage,
        yearOverYearChange,
        employeeCount: costData.employeeCount,
        costPerEmployee: costData.costPerEmployee,
      };
    })
    .filter(Boolean);

  // Apply sorting to the comparison data
  const sortedDepartments = [...departmentComparison].sort((a, b) => {
    let aValue, bValue;

    if (sortField === "name") {
      aValue = a!.name;
      bValue = b!.name;
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (sortField === "variance") {
      aValue = a!.variancePercentage;
      bValue = b!.variancePercentage;
    } else {
      aValue = a![sortField];
      bValue = b![sortField];
    }

    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  });

  // Get total amounts for all departments
  const totals = departmentComparison.reduce(
    (acc, dept) => {
      acc.budget += dept!.budget;
      acc.actualSpend += dept!.actualSpend;
      acc.employeeCount += dept!.employeeCount;
      return acc;
    },
    { budget: 0, actualSpend: 0, employeeCount: 0, costPerEmployee: 0 }
  );

  totals.costPerEmployee =
    totals.employeeCount > 0 ? totals.actualSpend / totals.employeeCount : 0;

  // Selected department data
  const selectedDepartment = departmentCosts[activeDepartment];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <SortAsc className="h-4 w-4" />
    ) : (
      <SortDesc className="h-4 w-4" />
    );
  };

  // Chart data for the selected department
  const categoryData = selectedDepartment?.categories || [];
  const trendData = selectedDepartment?.trend || [];

  // Department cost breakdown for comparison chart
  const costBreakdownData = departments.map((dept) => {
    const cost = departmentCosts[dept.id];
    return {
      name: dept.name,
      value: cost?.actualSpend || 0,
    };
  });

  // Department efficiency data for per-employee comparison
  const efficiencyData = departments.map((dept) => {
    const cost = departmentCosts[dept.id];
    return {
      name: dept.name,
      "Cost Per Employee": cost?.costPerEmployee || 0,
    };
  });

  // COLORS for charts
  const CHART_COLORS = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Department Cost Analysis</h2>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={fiscalYear} onValueChange={onFiscalYearChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Fiscal Year" />
            </SelectTrigger>
            <SelectContent>
              {["FY2023", "FY2024", "FY2025"].map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
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
              onClick={() => onExport("all", exportFormat)}
              title="Export All Departments"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Cost Comparison</CardTitle>
          <CardDescription>
            Budget vs. actual spending across all departments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="w-[180px] cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Department {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("budget")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Budget {getSortIcon("budget")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("actualSpend")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Actual {getSortIcon("actualSpend")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("variance")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Variance {getSortIcon("variance")}
                    </div>
                  </TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead
                    className="cursor-pointer text-right"
                    onClick={() => handleSort("costPerEmployee")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Cost/Employee {getSortIcon("costPerEmployee")}
                    </div>
                  </TableHead>
                  <TableHead className="w-[60px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDepartments.map((dept) => {
                  const isOverBudget = dept!.variance < 0;
                  const variance = Math.abs(dept!.variancePercentage);
                  const isSelected = dept!.id === activeDepartment;

                  return (
                    <TableRow
                      key={dept!.id}
                      onClick={() => setActiveDepartment(dept!.id)}
                      className={`cursor-pointer ${
                        isSelected ? "bg-muted/50" : ""
                      }`}
                    >
                      <TableCell className="font-medium">
                        {dept!.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(dept!.budget)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(dept!.actualSpend)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            isOverBudget ? "text-red-500" : "text-green-500"
                          }
                        >
                          {isOverBudget ? "-" : "+"}
                          {formatCurrency(Math.abs(dept!.variance))}
                          <span className="text-xs ml-1">
                            ({formatPercentage(variance)})
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>{dept!.employeeCount}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(dept!.costPerEmployee)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExport(dept!.id, exportFormat);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.budget)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.actualSpend)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        totals.budget - totals.actualSpend < 0
                          ? "text-red-500"
                          : "text-green-500"
                      }
                    >
                      {totals.budget - totals.actualSpend < 0 ? "-" : "+"}
                      {formatCurrency(
                        Math.abs(totals.budget - totals.actualSpend)
                      )}
                      <span className="text-xs ml-1">
                        (
                        {formatPercentage(
                          Math.abs(
                            ((totals.budget - totals.actualSpend) /
                              totals.budget) *
                              100
                          )
                        )}
                        )
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>{totals.employeeCount}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.costPerEmployee)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedDepartment ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedDepartment.name} - Detailed Analysis</CardTitle>
            <CardDescription>
              Cost analysis for fiscal year {fiscalYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="categories">Cost Categories</TabsTrigger>
                <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Budget Utilization
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPercentage(
                          (selectedDepartment.actualSpend /
                            selectedDepartment.budget) *
                            100
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(selectedDepartment.actualSpend)} of{" "}
                        {formatCurrency(selectedDepartment.budget)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Year-Over-Year Change
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {selectedDepartment.previousYearSpend > 0 ? (
                          <span
                            className={
                              selectedDepartment.actualSpend >
                              selectedDepartment.previousYearSpend
                                ? "text-orange-500"
                                : "text-green-500"
                            }
                          >
                            {formatPercentage(
                              ((selectedDepartment.actualSpend -
                                selectedDepartment.previousYearSpend) /
                                selectedDepartment.previousYearSpend) *
                                100
                            )}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedDepartment.previousYearSpend > 0 ? (
                          <>
                            compared to{" "}
                            {formatCurrency(
                              selectedDepartment.previousYearSpend
                            )}{" "}
                            last year
                          </>
                        ) : (
                          "No data from previous year"
                        )}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Cost Efficiency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(selectedDepartment.costPerEmployee)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        per employee ({selectedDepartment.employeeCount} total)
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Department Cost Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ChartContainer
                        config={{ value: { label: "Value", color: "#8884d8" } }}
                        className="w-full h-full"
                      >
                        <PieChart>
                          <Pie
                            data={costBreakdownData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {costBreakdownData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                        </PieChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Cost Per Employee Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ChartContainer
                        config={{
                          "Cost Per Employee": {
                            label: "Cost Per Employee",
                            color: "#1f77b4",
                          },
                        }}
                        className="w-full h-full"
                      >
                        <BarChart
                          data={efficiencyData}
                          margin={{ top: 10, right: 30, left: 40, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={70}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            tickFormatter={(value) =>
                              `$${(value / 1000).toFixed(0)}k`
                            }
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar
                            dataKey="Cost Per Employee"
                            fill="var(--color-Cost Per Employee)"
                            animationDuration={1000}
                          />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="categories">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Cost Category Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">
                                  Amount
                                </TableHead>
                                <TableHead className="text-right">
                                  % of Total
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {categoryData.map((category) => (
                                <TableRow key={category.name}>
                                  <TableCell className="font-medium">
                                    {category.name}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(category.amount)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatPercentage(category.percentage)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/30">
                                <TableCell className="font-bold">
                                  Total
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatCurrency(
                                    selectedDepartment.actualSpend
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  100%
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="h-80">
                        <ChartContainer
                          config={{
                            amount: { label: "Amount", color: "#8884d8" },
                          }}
                          className="w-full h-full"
                        >
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              dataKey="amount"
                              nameKey="name"
                              label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              {categoryData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    CHART_COLORS[index % CHART_COLORS.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                          </PieChart>
                        </ChartContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Monthly Budget vs. Actual Spending
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ChartContainer
                      config={{
                        planned: { label: "Budget", color: "#1f77b4" },
                        actual: { label: "Actual", color: "#ff7f0e" },
                      }}
                      className="w-full h-full"
                    >
                      <LineChart
                        data={trendData}
                        margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis
                          tickFormatter={(value) =>
                            `$${(value / 1000).toFixed(0)}k`
                          }
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line
                          type="monotone"
                          dataKey="planned"
                          stroke="var(--color-planned)"
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                          name="Budget"
                          animationDuration={1000}
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="var(--color-actual)"
                          strokeWidth={2}
                          name="Actual"
                          animationDuration={1000}
                        />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            Data for fiscal year {fiscalYear}
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">
              Select a department to view detailed analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
