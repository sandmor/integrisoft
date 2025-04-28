import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmployeeById } from "@/lib/actions/employees";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  FileEdit,
  Mail,
  Phone,
  Building,
  BadgeCheck,
  Calendar,
  DollarSign,
} from "lucide-react";

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const employee = await getEmployeeById(id);

  if (!employee) {
    notFound();
  }

  console.log("Employee data:", employee);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/employees">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Link>
          </Button>
        </div>
        <Button asChild>
          <Link href={`/dashboard/employees/${employee.id}/edit`}>
            <FileEdit className="mr-2 h-4 w-4" />
            Edit Employee
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Employee Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Employee Profile</CardTitle>
            <CardDescription>
              Personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4 pb-6 border-b">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {employee.firstName[0]}
                {employee.lastName[0]}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold">
                  {employee.firstName} {employee.lastName}
                </h3>
                {employee.position && (
                  <p className="text-muted-foreground">{employee.position}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{employee.email}</span>
              </div>
              {employee.contactEmail && (
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{employee.contactEmail}</span>
                </div>
              )}
              {employee.contactPhone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{employee.contactPhone}</span>
                </div>
              )}
              {employee.department && (
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{employee.department}</span>
                </div>
              )}
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Hired on {formatDate(employee.hireDate)}</span>
              </div>
              {employee.salary && (
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>${employee.salary.toLocaleString()}/year</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
            <CardDescription>
              Work-related information and assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" /> Position Information
                </h4>
                <dl className="space-y-2">
                  <div className="grid grid-cols-2 gap-1">
                    <dt className="text-muted-foreground">Department</dt>
                    <dd>{employee.department || "Not assigned"}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <dt className="text-muted-foreground">Position</dt>
                    <dd>{employee.position || "Not assigned"}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <dt className="text-muted-foreground">Hire Date</dt>
                    <dd>{formatDate(employee.hireDate)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Skills and Competencies</h4>
              <p className="text-muted-foreground text-sm">
                No skills information available.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Project Assignments</h4>
              <p className="text-muted-foreground text-sm">
                No current project assignments.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
