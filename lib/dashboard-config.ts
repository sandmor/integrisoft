import {
  BarChart3,
  Building2,
  CreditCard,
  FileBox,
  LayoutDashboard,
  PackageOpen,
  Settings,
  Users,
} from "lucide-react";

export type DashboardModule = {
  title: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
};

export const dashboardConfig = {
  modules: [
    {
      title: "Dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Overview of all system activities and key metrics",
    },
    {
      title: "Employees",
      label: "Employees",
      href: "/dashboard/employees",
      icon: Users,
      description: "Manage employee information, departments, and skills",
    },
    {
      title: "Finances",
      label: "Finances",
      href: "/dashboard/finances",
      icon: CreditCard,
      description: "Track transactions, budgets, and financial reports",
    },
    {
      title: "Products",
      label: "Products",
      href: "/dashboard/products",
      icon: PackageOpen,
      description: "Manage software products, versions, and documentation",
    },
    {
      title: "Projects",
      label: "Projects",
      href: "/dashboard/projects",
      icon: FileBox,
      description: "Track projects, tasks, and resource allocation",
    },
    {
      title: "Clients",
      label: "Clients",
      href: "/dashboard/clients",
      icon: Building2,
      description: "Manage client relationships and contracts",
    },
    {
      title: "Reports",
      label: "Reports",
      href: "/dashboard/reports",
      icon: BarChart3,
      description: "Generate and view business analytics reports",
    },
    {
      title: "Settings",
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      description: "Configure system settings and user permissions",
    },
  ],
};

// Lookup object for easier access by route segment
export const dashboardModules: Record<string, DashboardModule> = {
  dashboard: dashboardConfig.modules[0],
  employees: dashboardConfig.modules[1],
  finances: dashboardConfig.modules[2],
  products: dashboardConfig.modules[3],
  projects: dashboardConfig.modules[4],
  clients: dashboardConfig.modules[5],
  reports: dashboardConfig.modules[6],
  settings: dashboardConfig.modules[7],
};
