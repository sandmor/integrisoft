import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  CreditCard,
  PieChart,
} from "lucide-react";

interface OverviewCardProps {
  title: string;
  value: string;
  change?: number;
  icon?:
    | "dollar"
    | "credit-card"
    | "trending-up"
    | "pie-chart"
    | React.ReactNode;
  description?: string;
  className?: string;
  trend?: number;
}

export function OverviewCard({
  title,
  value,
  change,
  icon,
  description,
  className,
  trend,
}: OverviewCardProps) {
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }

    switch (icon) {
      case "dollar":
        return <DollarSign className="h-5 w-5 text-muted-foreground" />;
      case "credit-card":
        return <CreditCard className="h-5 w-5 text-muted-foreground" />;
      case "trending-up":
        return <TrendingUp className="h-5 w-5 text-muted-foreground" />;
      case "pie-chart":
        return <PieChart className="h-5 w-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {renderIcon()}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">{value}</p>
          {trend != null && (
            <div className="flex items-center mt-1">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <p
                className={`text-sm font-medium ${
                  trend > 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {trend > 0 ? "+" : ""}
                {trend}%
              </p>
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
