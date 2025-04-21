import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export interface BudgetAlert {
  id: string;
  budgetId: string;
  budgetName: string;
  type: "warning" | "critical" | "info";
  message: string;
  percentage: number;
  timestamp: Date;
  acknowledged: boolean;
  costCenter?: string;
  department?: string;
}

interface BudgetAlertsProps {
  alerts: BudgetAlert[];
  onAcknowledge: (alertId: string) => Promise<void>;
  onViewBudget: (budgetId: string) => void;
}

export function BudgetAlerts({
  alerts,
  onAcknowledge,
  onViewBudget,
}: BudgetAlertsProps) {
  const sortedAlerts = [...alerts].sort((a, b) => {
    // Sort by acknowledged status first
    if (a.acknowledged !== b.acknowledged) {
      return a.acknowledged ? 1 : -1;
    }
    // Then by type severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.type] - severityOrder[b.type];
  });

  const getAlertColor = (type: BudgetAlert["type"]) => {
    switch (type) {
      case "critical":
        return "destructive";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "default";
    }
  };

  const getProgressColor = (type: BudgetAlert["type"], percentage: number) => {
    if (type === "critical") return "bg-destructive";
    if (type === "warning") return "bg-warning";
    if (percentage > 90) return "bg-destructive";
    if (percentage > 75) return "bg-warning";
    return "bg-primary";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedAlerts.length > 0 ? (
          <div className="space-y-4">
            {sortedAlerts.map((alert) => (
              <Alert
                key={alert.id}
                variant={
                  alert.acknowledged
                    ? "default"
                    : (getAlertColor(alert.type) as any)
                }
                className={alert.acknowledged ? "opacity-70" : ""}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <AlertTitle className="flex items-center gap-2">
                      {alert.budgetName}
                      <Badge variant={getAlertColor(alert.type) as any}>
                        {alert.type.charAt(0).toUpperCase() +
                          alert.type.slice(1)}
                      </Badge>
                      {alert.acknowledged && (
                        <Badge variant="outline">Acknowledged</Badge>
                      )}
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      {alert.message}
                      {(alert.department || alert.costCenter) && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {alert.department && (
                            <span>Department: {alert.department}</span>
                          )}
                          {alert.department && alert.costCenter && (
                            <span> | </span>
                          )}
                          {alert.costCenter && (
                            <span>Cost Center: {alert.costCenter}</span>
                          )}
                        </div>
                      )}
                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Budget Utilization</span>
                          <span className="font-medium">
                            {alert.percentage}%
                          </span>
                        </div>
                        <Progress
                          value={alert.percentage}
                          className="h-2"
                          indicatorClassName={getProgressColor(
                            alert.type,
                            alert.percentage
                          )}
                        />
                      </div>
                    </AlertDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewBudget(alert.budgetId)}
                    >
                      View
                    </Button>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAcknowledge(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              No budget alerts at this time.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <span>Updates in real-time</span>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
      </CardFooter>
    </Card>
  );
}
