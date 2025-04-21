import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, XCircle } from "lucide-react";

type ApprovalStatus = "pending" | "approved" | "rejected";

interface ApprovalStep {
  id: string;
  name: string;
  role: string;
  status: ApprovalStatus;
  date?: Date;
  comments?: string;
  avatar?: string;
}

interface BudgetApprovalProps {
  budgetId: string;
  budgetName: string;
  fiscalYear: string;
  department: string;
  amount: number;
  currentStep: number;
  approvalSteps: ApprovalStep[];
  onApprove: (stepId: string, comments: string) => void;
  onReject: (stepId: string, comments: string) => void;
}

export function BudgetApproval({
  budgetId,
  budgetName,
  fiscalYear,
  department,
  amount,
  currentStep,
  approvalSteps,
  onApprove,
  onReject,
}: BudgetApprovalProps) {
  const [comments, setComments] = useState("");

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return "Not processed";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const isWorkflowComplete = () => {
    return approvalSteps.every(
      (step) => step.status === "approved" || step.status === "rejected"
    );
  };

  const isWorkflowRejected = () => {
    return approvalSteps.some((step) => step.status === "rejected");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle>{budgetName} - Budget Approval</CardTitle>
        <CardDescription className="flex flex-col space-y-1 mt-2">
          <div className="flex justify-between">
            <span>Department:</span>
            <span className="font-medium">{department}</span>
          </div>
          <div className="flex justify-between">
            <span>Fiscal Year:</span>
            <span className="font-medium">{fiscalYear}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-medium">{formatCurrency(amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium">
              {isWorkflowComplete() ? (
                isWorkflowRejected() ? (
                  <Badge variant="destructive">Rejected</Badge>
                ) : (
                  <Badge variant="success">Approved</Badge>
                )
              ) : (
                <Badge variant="warning">In Progress</Badge>
              )}
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <h4 className="text-sm font-medium mb-4">Approval Workflow</h4>
        <div className="space-y-6">
          {approvalSteps.map((step, index) => (
            <div key={step.id} className="relative">
              <div
                className={`flex items-start space-x-4 ${
                  index === currentStep
                    ? "bg-muted/50 p-4 rounded-md -mx-4"
                    : ""
                }`}
              >
                <Avatar className="mt-0.5">
                  <AvatarImage src={step.avatar} />
                  <AvatarFallback>
                    {step.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{step.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {step.role}
                      </p>
                    </div>
                    <div>{getStatusBadge(step.status)}</div>
                  </div>
                  {step.comments && (
                    <div className="mt-2 text-sm bg-muted/30 p-3 rounded-md italic">
                      "{step.comments}"
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(step.date)}
                  </p>
                </div>
              </div>
              {index < approvalSteps.length - 1 && (
                <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-muted" />
              )}
            </div>
          ))}
        </div>

        {currentStep < approvalSteps.length && !isWorkflowRejected() && (
          <>
            <Separator className="my-6" />
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Your Comments</h4>
              <Textarea
                placeholder="Add comments (optional)"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="mb-4"
              />
            </div>
          </>
        )}
      </CardContent>
      {currentStep < approvalSteps.length && !isWorkflowRejected() && (
        <CardFooter className="flex justify-end space-x-2 bg-muted/20 pt-4">
          <Button
            variant="destructive"
            onClick={() => {
              onReject(approvalSteps[currentStep].id, comments);
              setComments("");
            }}
          >
            Reject Budget
          </Button>
          <Button
            onClick={() => {
              onApprove(approvalSteps[currentStep].id, comments);
              setComments("");
            }}
          >
            Approve Budget
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
