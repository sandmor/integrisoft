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

interface TransactionApprovalProps {
  transactionId: string;
  currentStep: number;
  approvalSteps: ApprovalStep[];
  onApprove: (stepId: string, comments: string) => void;
  onReject: (stepId: string, comments: string) => void;
}

export default function TransactionApproval({
  transactionId,
  currentStep,
  approvalSteps,
  onApprove,
  onReject,
}: TransactionApprovalProps) {
  const [comments, setComments] = useState("");

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return "Not processed";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Approval Workflow</CardTitle>
        <CardDescription>
          This transaction requires approval from multiple stakeholders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {approvalSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start space-x-4 p-4 rounded-md ${
                index === currentStep ? "bg-muted" : ""
              }`}
            >
              <Avatar>
                <AvatarImage src={step.avatar} />
                <AvatarFallback>
                  {step.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{step.name}</p>
                    <p className="text-sm text-muted-foreground">{step.role}</p>
                  </div>
                  <div>{getStatusBadge(step.status)}</div>
                </div>
                {step.comments && (
                  <p className="mt-2 text-sm italic">"{step.comments}"</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(step.date)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {currentStep < approvalSteps.length && (
          <div className="mt-6">
            <Textarea
              placeholder="Add comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="mb-4"
            />
          </div>
        )}
      </CardContent>
      {currentStep < approvalSteps.length && (
        <CardFooter className="flex justify-end space-x-2">
          <Button
            variant="destructive"
            onClick={() => {
              onReject(approvalSteps[currentStep].id, comments);
              setComments("");
            }}
          >
            Reject
          </Button>
          <Button
            onClick={() => {
              onApprove(approvalSteps[currentStep].id, comments);
              setComments("");
            }}
          >
            Approve
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
