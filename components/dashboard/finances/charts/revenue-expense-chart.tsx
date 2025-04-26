import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DataPoint = {
  name: string;
  revenue: number;
  expenses: number;
};

interface RevenueExpenseChartProps {
  data: DataPoint[];
  title?: string;
  className?: string;
  height?: number;
}

export function RevenueExpenseChart({
  data,
  title = "Revenue vs Expenses",
  className,
  height = 350,
}: RevenueExpenseChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            revenue: { label: "Revenue", color: "#10b981" },
            expenses: { label: "Expenses", color: "#ef4444" },
          }}
          className={`w-full h-[${height}px]`}
        >
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip
              formatter={(value) => [
                `$${(value as number).toLocaleString()}`,
                undefined,
              ]}
              labelFormatter={(label) => `Period: ${label}`}
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="revenue" name="Revenue" fill="var(--color-revenue)" />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="var(--color-expenses)"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
