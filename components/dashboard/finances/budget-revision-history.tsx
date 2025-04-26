import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Minus } from "lucide-react";

type DeltaType = "increase" | "decrease" | "unchanged";

export interface BudgetRevision {
  id: string;
  version: number;
  date: Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  amount: number;
  previousAmount: number;
  reason: string;
  notes?: string;
  categories: Array<{
    name: string;
    amount: number;
    previousAmount: number;
  }>;
}

interface BudgetRevisionHistoryProps {
  budgetId: string;
  budgetName: string;
  revisions: BudgetRevision[];
  onViewRevisionDetails: (revisionId: string) => void;
  onCompareRevisions: (revisionId1: string, revisionId2: string) => void;
  onRestoreBudget: (revisionId: string) => void;
}

// Custom badge delta component to replace Tremor's BadgeDelta
const BadgeDelta = ({
  deltaType,
  size = "xs",
  children,
}: {
  deltaType: DeltaType;
  size?: "xs" | "sm";
  children: React.ReactNode;
}) => {
  const getColorClass = () => {
    switch (deltaType) {
      case "increase":
        return "bg-green-100 text-green-800";
      case "decrease":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "text-xs px-2 py-0.5";
      default:
        return "text-xs px-1.5 py-0.5";
    }
  };

  return (
    <span
      className={`rounded-full inline-flex items-center gap-0.5 font-medium ${getColorClass()} ${getSizeClass()}`}
    >
      {deltaType === "increase" && <ArrowUpNarrowWide className="h-3 w-3" />}
      {deltaType === "decrease" && <ArrowDownNarrowWide className="h-3 w-3" />}
      {deltaType === "unchanged" && <Minus className="h-3 w-3" />}
      {children}
    </span>
  );
};

// Custom tooltip for the area chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-md p-2 shadow-sm">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-sm">
          Amount: <span className="font-medium">{payload[0].value}</span>
        </p>
      </div>
    );
  }

  return null;
};

export function BudgetRevisionHistory({
  budgetId,
  budgetName,
  revisions,
  onViewRevisionDetails,
  onCompareRevisions,
  onRestoreBudget,
}: BudgetRevisionHistoryProps) {
  const sortedRevisions = [...revisions].sort((a, b) => b.version - a.version);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getDeltaType = (current: number, previous: number): DeltaType => {
    if (current === previous) return "unchanged";
    return current > previous ? "increase" : "decrease";
  };

  // Create chart data for budget amount over time
  const chartData = sortedRevisions
    .slice()
    .reverse()
    .map((revision) => ({
      date: formatDate(revision.date),
      Amount: revision.amount,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>Budget Revision History</span>
          <Badge variant="outline">
            {sortedRevisions.length}{" "}
            {sortedRevisions.length === 1 ? "Revision" : "Revisions"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedRevisions.length > 0 ? (
          <>
            <div className="mb-6">
              <ChartContainer
                config={{ Amount: { label: "Amount", color: "#3b82f6" } }}
                className="w-full h-[130px]"
              >
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide domain={["auto", "auto"]} />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Amount"
                    stroke="var(--color-Amount)"
                    fill="var(--color-Amount)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {sortedRevisions.map((revision, index) => {
                const percentChange = getPercentageChange(
                  revision.amount,
                  revision.previousAmount
                );
                const deltaType = getDeltaType(
                  revision.amount,
                  revision.previousAmount
                );

                return (
                  <AccordionItem value={revision.id} key={revision.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className="rounded-full h-7 w-7 p-0 flex items-center justify-center"
                          >
                            v{revision.version}
                          </Badge>
                          <div className="text-left">
                            <div className="font-medium">
                              {formatDate(revision.date)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {deltaType === "increase" ? (
                                <ArrowUpNarrowWide className="h-3 w-3 text-green-500" />
                              ) : deltaType === "decrease" ? (
                                <ArrowDownNarrowWide className="h-3 w-3 text-red-500" />
                              ) : null}
                              <span>{revision.reason}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <BadgeDelta deltaType={deltaType} size="xs">
                            {percentChange.toFixed(1)}%
                          </BadgeDelta>
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(revision.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              by {revision.user.name}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-10 space-y-4">
                        {revision.notes && (
                          <div className="text-sm italic">
                            &ldquo;{revision.notes}&rdquo;
                          </div>
                        )}

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">
                            Category Changes:
                          </h4>
                          <div className="space-y-2">
                            {revision.categories.map((category) => {
                              const categoryDelta = getDeltaType(
                                category.amount,
                                category.previousAmount
                              );
                              const categoryPercentChange = getPercentageChange(
                                category.amount,
                                category.previousAmount
                              );

                              return (
                                <div
                                  key={category.name}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span>{category.name}</span>
                                  <div className="flex items-center gap-2">
                                    <BadgeDelta
                                      deltaType={categoryDelta}
                                      size="xs"
                                    >
                                      {categoryPercentChange.toFixed(1)}%
                                    </BadgeDelta>
                                    <span>
                                      {formatCurrency(category.amount)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={revision.user.avatar} />
                              <AvatarFallback>
                                {revision.user.name
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              Revised by {revision.user.name}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewRevisionDetails(revision.id)}
                            >
                              Details
                            </Button>
                            {index < sortedRevisions.length - 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  onCompareRevisions(
                                    revision.id,
                                    sortedRevisions[index + 1].id
                                  )
                                }
                              >
                                Compare
                              </Button>
                            )}
                            {index > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRestoreBudget(revision.id)}
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              No revision history available.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
