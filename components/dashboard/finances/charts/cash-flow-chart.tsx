import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DataPoint = {
  date: string;
  amount: number;
};

interface CashFlowChartProps {
  data: DataPoint[];
  title?: string;
  className?: string;
  height?: number;
  showArea?: boolean;
}

export function CashFlowChart({
  data,
  title = "Cash Flow Trend",
  className,
  height = 350,
  showArea = true,
}: CashFlowChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ amount: { label: "Amount", color: "#8884d8" } }}
          className={`w-full h-[${height}px]`}
        >
          {showArea ? (
            <AreaChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip
                formatter={(value) => [
                  `$${(value as number).toLocaleString()}`,
                  undefined,
                ]}
                labelFormatter={(label) => `Date: ${label}`}
                content={<ChartTooltipContent />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--color-amount)"
                fill="var(--color-amount)"
                fillOpacity={0.3}
              />
            </AreaChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip
                formatter={(value) => [
                  `$${(value as number).toLocaleString()}`,
                  undefined,
                ]}
                labelFormatter={(label) => `Date: ${label}`}
                content={<ChartTooltipContent />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--color-amount)"
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
