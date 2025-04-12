import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmployeesLayoutProps {
  children: React.ReactNode;
}

export default function EmployeesLayout({ children }: EmployeesLayoutProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Employee Management
        </h1>
        <p className="text-muted-foreground">
          Manage your company's employee information, assignments, and skills.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">{children}</CardContent>
      </Card>
    </div>
  );
}
