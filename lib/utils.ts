import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date): string {
  if (!date) return "—";

  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - new Date(date).getTime()) / 1000
  );

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
}

// Module display mapping for activity feed
export interface ModuleDisplayInfo {
  label: string;
  icon: string;
  color?: string;
}

export const getModuleDisplayInfo = (module: string): ModuleDisplayInfo => {
  const moduleMap: Record<string, ModuleDisplayInfo> = {
    projects: { label: "Projects", icon: "Briefcase" },
    tasks: { label: "Tasks", icon: "CheckSquare" },
    products: { label: "Products", icon: "Package" },
    clients: { label: "Clients", icon: "Building2" },
    employees: { label: "Employees", icon: "Users" },
    transactions: { label: "Finances", icon: "DollarSign" },
    departments: { label: "Departments", icon: "Network" },
    users: { label: "Users", icon: "User" },
    contracts: { label: "Contracts", icon: "FileText" },
    reports: { label: "Reports", icon: "BarChart" },
    settings: { label: "Settings", icon: "Settings" },
  };

  return moduleMap[module.toLowerCase()] || { label: module, icon: "Circle" };
};

// Get color based on activity action
export const getActivityActionColor = (action: string): string => {
  const actionMap: Record<string, string> = {
    create: "text-green-500",
    update: "text-blue-500",
    delete: "text-red-500",
    assign: "text-amber-500",
    complete: "text-emerald-500",
    login: "text-violet-500",
    logout: "text-slate-500",
  };

  // Check if any key in the map is part of the action string
  for (const key in actionMap) {
    if (action.toLowerCase().includes(key)) {
      return actionMap[key];
    }
  }

  return "text-gray-500"; // Default color
};

// Format activity description
export const formatActivityDescription = (
  action: string,
  module: string,
  description?: string,
  userName?: string
): string => {
  const userPart = userName ? `${userName} ` : "";
  const moduleInfo = getModuleDisplayInfo(module);

  if (description) {
    return description;
  }

  return `${userPart}${action.toLowerCase()} a ${moduleInfo.label.toLowerCase()} item`;
};
