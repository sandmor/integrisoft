"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Briefcase,
  Building2,
  CreditCard,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="bg-primary/10 text-primary p-2 rounded-full">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

interface TaskCardProps {
  title: string;
  tasks: {
    name: string;
    status: "completed" | "in-progress" | "pending";
  }[];
}

function TaskCard({ title, tasks }: TaskCardProps) {
  return (
    <Card className="col-span-full md:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Recent tasks and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={index} className="flex items-center gap-3">
              {task.status === "completed" ? (
                <CheckCircle className="text-green-500 size-5" />
              ) : task.status === "in-progress" ? (
                <Clock className="text-blue-500 size-5" />
              ) : (
                <AlertTriangle className="text-amber-500 size-5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{task.name}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                {task.status === "completed"
                  ? "Completed"
                  : task.status === "in-progress"
                  ? "In Progress"
                  : "Pending"}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeed() {
  // Placeholder activity data
  const activities = [
    {
      action: "Updated project status",
      project: "Website Redesign",
      time: "2 hours ago",
    },
    {
      action: "Added new client",
      project: "Acme Corporation",
      time: "5 hours ago",
    },
    {
      action: "Submitted financial report",
      project: "Q2 Financials",
      time: "Yesterday",
    },
    {
      action: "Released new version",
      project: "Integrisoft CRM v2.1",
      time: "2 days ago",
    },
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-5" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="mt-0.5 size-2 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.project}
                </p>
              </div>
              <div className="flex-1" />
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value="124"
          description="12% increase from last month"
          icon={<Users className="size-4" />}
        />
        <StatCard
          title="Active Projects"
          value="42"
          description="8 projects added this month"
          icon={<Briefcase className="size-4" />}
        />
        <StatCard
          title="Clients"
          value="38"
          description="3 new clients this month"
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          title="Revenue"
          value="$342,500"
          description="15% increase from last month"
          icon={<CreditCard className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <TaskCard
          title="Project Tasks"
          tasks={[
            {
              name: "Complete website redesign",
              status: "in-progress",
            },
            {
              name: "API integration with payment gateway",
              status: "pending",
            },
            {
              name: "Update user documentation",
              status: "completed",
            },
            {
              name: "QA testing for mobile app",
              status: "in-progress",
            },
          ]}
        />

        <TaskCard
          title="Product Development"
          tasks={[
            {
              name: "Fix bug in checkout process",
              status: "completed",
            },
            {
              name: "Implement new dashboard features",
              status: "in-progress",
            },
            {
              name: "Update authentication module",
              status: "pending",
            },
            {
              name: "Optimize database queries",
              status: "completed",
            },
          ]}
        />

        <TaskCard
          title="Client Requests"
          tasks={[
            {
              name: "Set up meeting with Acme Corp",
              status: "completed",
            },
            {
              name: "Prepare proposal for TechGiant",
              status: "in-progress",
            },
            {
              name: "Follow up with CloudServices",
              status: "pending",
            },
            {
              name: "Address client feedback on design",
              status: "in-progress",
            },
          ]}
        />
      </div>

      <ActivityFeed />
    </div>
  );
}
