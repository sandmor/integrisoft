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
  User,
  CheckSquare,
  Package,
  DollarSign,
  Network,
  FileText,
  BarChart,
  Settings,
  Circle,
  ArrowRight,
} from "lucide-react";
import {
  getDashboardStats,
  getProjectTasks,
  getProductTasks,
  getClientRequests,
  getRecentActivities,
  type DashboardTask,
  type ActivityItem,
} from "@/lib/actions/dashboard";
import {
  formatRelativeTime,
  getModuleDisplayInfo,
  getActivityActionColor,
  formatActivityDescription,
} from "@/lib/utils";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { tryCatch } from "@/lib/error-handler";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Icon mapping component to render dynamic icons
const DynamicIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const iconMap: Record<string, React.ReactNode> = {
    Briefcase: <Briefcase className={className || "size-4"} />,
    CheckSquare: <CheckSquare className={className || "size-4"} />,
    Package: <Package className={className || "size-4"} />,
    Building2: <Building2 className={className || "size-4"} />,
    Users: <Users className={className || "size-4"} />,
    User: <User className={className || "size-4"} />,
    DollarSign: <DollarSign className={className || "size-4"} />,
    Network: <Network className={className || "size-4"} />,
    FileText: <FileText className={className || "size-4"} />,
    BarChart: <BarChart className={className || "size-4"} />,
    Settings: <Settings className={className || "size-4"} />,
  };

  return iconMap[name] || <Circle className={className || "size-4"} />;
};

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
  tasks: DashboardTask[];
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
          {tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No tasks available
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3">
                {task.status === "completed" ? (
                  <CheckCircle className="text-green-500 size-5" />
                ) : task.status === "in-progress" ? (
                  <Clock className="text-blue-500 size-5" />
                ) : (
                  <AlertTriangle className="text-amber-500 size-5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.name}</p>
                  {task.projectName && (
                    <p className="text-xs text-muted-foreground">
                      {task.projectName}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {task.status === "completed"
                    ? "Completed"
                    : task.status === "in-progress"
                    ? "In Progress"
                    : "Pending"}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-5" /> Recent Activity
        </CardTitle>
        <CardDescription>Latest activities across the platform</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const moduleInfo = getModuleDisplayInfo(activity.module);
              const actionColor = getActivityActionColor(activity.action);

              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div
                    className={`bg-primary/10 text-primary p-1.5 rounded-full mt-0.5`}
                  >
                    <DynamicIcon name={moduleInfo.icon} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {activity.userName && (
                        <Avatar className="size-6">
                          <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                            {activity.userName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <p className="text-sm font-medium">
                        <span className={`font-semibold ${actionColor}`}>
                          {activity.action}
                        </span>
                        {activity.description ? (
                          <span className="ml-1">{activity.description}</span>
                        ) : (
                          <span className="ml-1">
                            in{" "}
                            <span className="font-medium">
                              {moduleInfo.label}
                            </span>
                            {activity.details &&
                              typeof activity.details === "object" &&
                              activity.details.name && (
                                <span className="ml-1">
                                  - {activity.details.name}
                                </span>
                              )}
                          </span>
                        )}
                      </p>
                    </div>
                    {activity.entityType && activity.entityId && (
                      <div className="mt-1 flex items-center text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <ArrowRight className="size-3 mr-1" />
                          {activity.entityType}: {activity.entityId}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatRelativeTime(activity.time)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading placeholder components
function StatCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-secondary rounded"></div>
        <div className="bg-primary/10 p-2 rounded-full">
          <div className="h-4 w-4 bg-secondary/50 rounded"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-secondary rounded mb-2"></div>
        <div className="h-3 w-32 bg-secondary/70 rounded"></div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="flex justify-center py-12">
        <Spinner size="large" />
        <span className="ml-3 text-lg">Loading dashboard data...</span>
      </div>
    </div>
  );
}

async function DashboardContent() {
  // Fetch all dashboard data in parallel with error handling
  const [stats, projectTasks, productTasks, clientRequests, activities] =
    await Promise.all([
      tryCatch(() => getDashboardStats(), {
        customErrorMessage: "Failed to load dashboard statistics",
      }),
      tryCatch(() => getProjectTasks(), {
        customErrorMessage: "Failed to load project tasks",
      }),
      tryCatch(() => getProductTasks(), {
        customErrorMessage: "Failed to load product tasks",
      }),
      tryCatch(() => getClientRequests(), {
        customErrorMessage: "Failed to load client requests",
      }),
      tryCatch(() => getRecentActivities(), {
        customErrorMessage: "Failed to load recent activities",
      }),
    ]);

  // Use default values if any data fetch failed
  const dashboardStats = stats || {
    totalEmployees: 0,
    activeProjects: 0,
    totalClients: 0,
    totalRevenue: 0,
    revenueChange: 0,
    newEmployees: 0,
    newProjects: 0,
    newClients: 0,
  };

  // Format revenue for display
  const formattedRevenue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dashboardStats.totalRevenue);

  // Create descriptions based on actual data
  const employeeDesc = `${dashboardStats.newEmployees} new this month`;
  const projectsDesc = `${dashboardStats.newProjects} new this month`;
  const clientsDesc = `${dashboardStats.newClients} new this month`;
  const revenueDesc = `${dashboardStats.revenueChange >= 0 ? "+" : ""}${
    dashboardStats.revenueChange
  }% from last month`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={dashboardStats.totalEmployees.toString()}
          description={employeeDesc}
          icon={<Users className="size-4" />}
        />
        <StatCard
          title="Active Projects"
          value={dashboardStats.activeProjects.toString()}
          description={projectsDesc}
          icon={<Briefcase className="size-4" />}
        />
        <StatCard
          title="Clients"
          value={dashboardStats.totalClients.toString()}
          description={clientsDesc}
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          title="Revenue"
          value={formattedRevenue}
          description={revenueDesc}
          icon={<CreditCard className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <TaskCard title="Project Tasks" tasks={projectTasks || []} />
        <TaskCard title="Product Development" tasks={productTasks || []} />
        <TaskCard title="Client Requests" tasks={clientRequests || []} />
      </div>

      <ActivityFeed activities={activities || []} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
