import React from "react";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileBox,
  LayoutDashboard,
  PackageOpen,
  Settings,
  Users,
  UserCog,
} from "lucide-react";
import { moduleTypeEnum } from "./db/schema";

// Define menu item types
export type ModulePermission = (typeof moduleTypeEnum.enumValues)[number];

export interface MenuItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  module: ModulePermission; // The module permission required to see this item
}

export interface UserMenuItem extends MenuItem {
  onClick?: () => void;
  variant?: "default" | "destructive";
}

// Main navigation items (sidebar)
export const navigationItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard className="size-5" />,
    href: "/dashboard",
    module: "admin", // Admin module for dashboard access
  },
  {
    title: "Employees",
    icon: <Users className="size-5" />,
    href: "/dashboard/employees",
    module: "user", // User module for employee management
  },
  {
    title: "Finances",
    icon: <CreditCard className="size-5" />,
    href: "/dashboard/finances",
    module: "finance",
  },
  {
    title: "Products",
    icon: <PackageOpen className="size-5" />,
    href: "/dashboard/products",
    module: "product",
  },
  {
    title: "Projects",
    icon: <FileBox className="size-5" />,
    href: "/dashboard/projects",
    module: "project",
  },
  {
    title: "Clients",
    icon: <Building2 className="size-5" />,
    href: "/dashboard/clients",
    module: "client",
  },
  /*  {
    title: "Reports",
    icon: <BarChart3 className="size-5" />,
    href: "/dashboard/reports",
    module: "reporting",
  },
  {
    title: "Settings",
    icon: <Settings className="size-5" />,
    href: "/dashboard/settings",
    module: "admin", // Admin module for settings
  },*/
];

// User menu items
export const userMenuItems: UserMenuItem[] = [
  /*  {
    title: "Profile",
    icon: <UserCog className="mr-2 h-4 w-4" />,
    href: "/dashboard/profile",
    module: "user", // User module for profile access
  },
  {
    title: "Settings",
    icon: <Settings className="mr-2 h-4 w-4" />,
    href: "/dashboard/settings",
    module: "admin", // Admin module for settings
  },*/
];

/**
 * Filter menu items based on the user's accessible modules
 * @param items Menu items to filter
 * @param accessibleModules List of modules the user has access to
 * @returns Filtered menu items
 */
export function filterMenuItemsByPermission<T extends MenuItem>(
  items: T[],
  accessibleModules: ModulePermission[]
): T[] {
  // If no accessible modules, only show admin dashboard if they have admin access
  if (!accessibleModules.length) {
    return items.filter(
      (item) => accessibleModules.includes("admin") && item.module === "admin"
    );
  }

  return items.filter((item) => accessibleModules.includes(item.module));
}
