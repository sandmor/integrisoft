import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
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

interface BudgetCategory {
  id: string;
  name: string;
}

interface YearlyBudget {
  year: number;
  categories: Array<{
    categoryId: string;
    amount: number;
    actualAmount?: number;
    projectedAmount?: number;
  }>;
  totalAmount: number;
  totalActualAmount?: number;
  totalProjectedAmount?: number;
  inflationRate?: number;
}

interface MultiYearBudgetPlanningProps {
  budgetName: string;
  department: string;
  categories: BudgetCategory[];
  yearlyBudgets: YearlyBudget[];
  onSaveYearlyBudget: (yearlyBudget: YearlyBudget) => Promise<void>;
  onExportData: (format: "csv" | "excel" | "pdf") => Promise<void>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export function MultiYearBudgetPlanning({
  budgetName,
  department,
  categories,
  yearlyBudgets,
  onSaveYearlyBudget,
  onExportData,
}: MultiYearBudgetPlanningProps) {
  const [activeYear, setActiveYear] = useState<number>(
    yearlyBudgets.length > 0 ? yearlyBudgets[0].year : new Date().getFullYear()
  );
  const [activeTab, setActiveTab] = useState<string>("budget-planning");
  const [activeYearData, setActiveYearData] = useState<YearlyBudget>(
    yearlyBudgets.find((budget) => budget.year === activeYear) || {
      year: activeYear,
      categories: categories.map((category) => ({
        categoryId: category.id,
        amount: 0,
      })),
      totalAmount: 0,
    }
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "excel"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [inflationRate, setInflationRate] = useState<number>(2.5);

  const handleYearChange = (year: string) => {
    const numYear = parseInt(year);
    setActiveYear(numYear);

    const yearData = yearlyBudgets.find((budget) => budget.year === numYear);
    if (yearData) {
      setActiveYearData(yearData);
    } else {
      // Create new year data based on previous year + inflation
      const prevYearData = yearlyBudgets.find(
        (budget) => budget.year === numYear - 1
      );
      if (prevYearData) {
        const inflationMultiplier = 1 + inflationRate / 100;
        const newCategoriesData = categories.map((category) => {
          const prevCategory = prevYearData.categories.find(
            (c) => c.categoryId === category.id
          );
          const prevAmount = prevCategory?.amount || 0;
          return {
            categoryId: category.id,
            amount: Math.round(prevAmount * inflationMultiplier * 100) / 100,
          };
        });

        const newTotal = newCategoriesData.reduce(
          (sum, cat) => sum + cat.amount,
          0
        );

        setActiveYearData({
          year: numYear,
          categories: newCategoriesData,
          totalAmount: newTotal,
          inflationRate: inflationRate,
        });
      } else {
        setActiveYearData({
          year: numYear,
          categories: categories.map((category) => ({
            categoryId: category.id,
            amount: 0,
          })),
          totalAmount: 0,
          inflationRate: inflationRate,
        });
      }
    }
    setIsEditing(false);
  };

  const handleEditMode = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset to saved values
    const yearData = yearlyBudgets.find((budget) => budget.year === activeYear);
    if (yearData) {
      setActiveYearData(yearData);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Calculate total
    const totalAmount = activeYearData.categories.reduce(
      (sum, category) => sum + category.amount,
      0
    );

    const updatedBudget = {
      ...activeYearData,
      totalAmount,
    };

    try {
      await onSaveYearlyBudget(updatedBudget);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving budget:", error);
    }
  };

  const handleAmountChange = (categoryId: string, amount: number) => {
    const updatedCategories = activeYearData.categories.map((category) => {
      if (category.categoryId === categoryId) {
        return { ...category, amount };
      }
      return category;
    });

    const totalAmount = updatedCategories.reduce(
      (sum, category) => sum + category.amount,
      0
    );

    setActiveYearData({
      ...activeYearData,
      categories: updatedCategories,
      totalAmount,
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Prepare data for charts
  const yearlyTotalsData = yearlyBudgets.map((budget) => ({
    year: budget.year.toString(),
    Budget: budget.totalAmount,
    Actual: budget.totalActualAmount || 0,
    Projected: budget.totalProjectedAmount || budget.totalAmount,
  }));

  const categoryTrendsData = categories.map((category) => {
    const dataPoint: any = { name: category.name };

    yearlyBudgets.forEach((yearBudget) => {
      const categoryData = yearBudget.categories.find(
        (cat) => cat.categoryId === category.id
      );
      dataPoint[yearBudget.year] = categoryData?.amount || 0;
    });

    return dataPoint;
  });

  // Years for dropdown
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: 7 },
    (_, i) => currentYear + i - 2
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>{budgetName} - Multi-Year Planning</CardTitle>
            <CardDescription>{department}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={activeYear.toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={exportFormat}
              onValueChange={(value: "csv" | "excel" | "pdf") =>
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
              onClick={() => onExportData(exportFormat)}
            >
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="budget-planning">Budget Planning</TabsTrigger>
            <TabsTrigger value="yearly-comparison">
              Yearly Comparison
            </TabsTrigger>
            <TabsTrigger value="category-trends">Category Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="budget-planning">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Budget for Fiscal Year {activeYear}
              </h3>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>Save</Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={handleEditMode}>
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="mb-4 flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Inflation Rate (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={inflationRate}
                    onChange={(e) =>
                      setInflationRate(parseFloat(e.target.value))
                    }
                  />
                </div>
                <div className="flex-1"></div>
                <div className="flex-1"></div>
              </div>
            )}

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Category</TableHead>
                    <TableHead>Amount</TableHead>
                    {!isEditing && (
                      <>
                        <TableHead>Actual</TableHead>
                        <TableHead>Variance</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeYearData.categories.map((categoryData) => {
                    const category = categories.find(
                      (c) => c.id === categoryData.categoryId
                    );
                    const actualAmount = categoryData.actualAmount || 0;
                    const variance = actualAmount - categoryData.amount;
                    const variancePercent = categoryData.amount
                      ? (variance / categoryData.amount) * 100
                      : 0;

                    return (
                      <TableRow key={categoryData.categoryId}>
                        <TableCell className="font-medium">
                          {category?.name || "Unknown Category"}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={categoryData.amount}
                              onChange={(e) =>
                                handleAmountChange(
                                  categoryData.categoryId,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-[150px]"
                              min={0}
                              step={100}
                            />
                          ) : (
                            formatCurrency(categoryData.amount)
                          )}
                        </TableCell>
                        {!isEditing && (
                          <>
                            <TableCell>
                              {categoryData.actualAmount
                                ? formatCurrency(categoryData.actualAmount)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {categoryData.actualAmount ? (
                                <span
                                  className={
                                    variance < 0
                                      ? "text-green-500"
                                      : variance > 0
                                      ? "text-red-500"
                                      : ""
                                  }
                                >
                                  {formatCurrency(variance)} (
                                  {variancePercent.toFixed(1)}%)
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(activeYearData.totalAmount)}
                    </TableCell>
                    {!isEditing && (
                      <>
                        <TableCell className="font-bold">
                          {activeYearData.totalActualAmount
                            ? formatCurrency(activeYearData.totalActualAmount)
                            : "-"}
                        </TableCell>
                        <TableCell className="font-bold">
                          {activeYearData.totalActualAmount ? (
                            <span
                              className={
                                activeYearData.totalActualAmount -
                                  activeYearData.totalAmount <
                                0
                                  ? "text-green-500"
                                  : activeYearData.totalActualAmount -
                                      activeYearData.totalAmount >
                                    0
                                  ? "text-red-500"
                                  : ""
                              }
                            >
                              {formatCurrency(
                                activeYearData.totalActualAmount -
                                  activeYearData.totalAmount
                              )}
                              (
                              {(
                                ((activeYearData.totalActualAmount -
                                  activeYearData.totalAmount) /
                                  activeYearData.totalAmount) *
                                100
                              ).toFixed(1)}
                              %)
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="yearly-comparison">
            <div className="space-y-6">
              <h3 className="text-lg font-medium">
                Budget Comparison Across Years
              </h3>
              <div className="h-80 w-full">
                <ChartContainer
                  config={{
                    Budget: { label: "Budget", color: "#1e40af" },
                    Actual: { label: "Actual", color: "#15803d" },
                    Projected: { label: "Projected", color: "#f59e0b" },
                  }}
                  className="w-full h-full"
                >
                  <BarChart
                    data={yearlyTotalsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="Budget" fill="var(--color-Budget)" />
                    <Bar dataKey="Actual" fill="var(--color-Actual)" />
                    <Bar dataKey="Projected" fill="var(--color-Projected)" />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="category-trends">
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Budget Category Trends</h3>
              <div className="h-80 w-full">
                <ChartContainer
                  config={Object.fromEntries(
                    yearlyBudgets.map((yb, idx) => [
                      yb.year.toString(),
                      {
                        label: yb.year.toString(),
                        color: colorScheme[idx % colorScheme.length],
                      },
                    ])
                  )}
                  className="w-full h-full"
                >
                  <LineChart
                    data={categoryTrendsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    {yearlyBudgets.map((yearBudget, index) => (
                      <Line
                        key={yearBudget.year}
                        type="monotone"
                        dataKey={yearBudget.year.toString()}
                        stroke="var(--color-${yearBudget.year})"
                        activeDot={{ r: 8 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Color scheme for line charts
const colorScheme = [
  "#1e40af", // blue-800
  "#15803d", // green-700
  "#b91c1c", // red-700
  "#7c3aed", // violet-600
  "#0369a1", // sky-700
  "#c2410c", // orange-700
  "#5b21b6", // purple-800
  "#0f766e", // teal-700
  "#a16207", // amber-700
  "#86198f", // fuchsia-800
];
