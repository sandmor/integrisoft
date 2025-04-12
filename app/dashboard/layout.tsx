"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileBox,
  Home,
  LayoutDashboard,
  PackageOpen,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { client } from "@/lib/auth-client";
import { useState, useEffect } from "react";
import { DashboardBreadcrumb } from "@/components/dashboard/breadcrumb";
import { useNavigation } from "@/components/ui/navigation-context";

interface SidebarItem {
  title: string;
  icon: React.ReactNode;
  href: string;
}

// Use the dashboard modules to generate sidebar items
const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    icon: <LayoutDashboard className="size-5" />,
    href: "/dashboard",
  },
  {
    title: "Employees",
    icon: <Users className="size-5" />,
    href: "/dashboard/employees",
  },
  {
    title: "Finances",
    icon: <CreditCard className="size-5" />,
    href: "/dashboard/finances",
  },
  {
    title: "Products",
    icon: <PackageOpen className="size-5" />,
    href: "/dashboard/products",
  },
  {
    title: "Projects",
    icon: <FileBox className="size-5" />,
    href: "/dashboard/projects",
  },
  {
    title: "Clients",
    icon: <Building2 className="size-5" />,
    href: "/dashboard/clients",
  },
  {
    title: "Reports",
    icon: <BarChart3 className="size-5" />,
    href: "/dashboard/reports",
  },
  {
    title: "Settings",
    icon: <Settings className="size-5" />,
    href: "/dashboard/settings",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const { startNavigation } = useNavigation();

  useEffect(() => {
    client.getSession().then((session) => {
      if (session?.data?.user?.name) {
        setUserName(session.data.user.name);
      }
    });
  }, []);

  // Handle sidebar navigation with progress indicator
  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      startNavigation(href);
      router.push(href);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-10 w-64 border-r border-sidebar-border hidden lg:block">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <button
            onClick={() => handleNavigation("/dashboard")}
            className="flex items-center gap-2 font-semibold"
          >
            <Home className="size-5" />
            <span>Integrisoft</span>
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-4">
          {sidebarItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground text-left",
                pathname === item.href &&
                  "bg-sidebar-accent/10 text-sidebar-foreground font-medium"
              )}
            >
              {item.icon}
              <span>{item.title}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Header */}
        <header className="bg-background border-b h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="lg:hidden">
            {/* Mobile menu trigger placeholder */}
          </div>
          <div className="flex-1 lg:hidden"></div>
          <div>
            <span className="text-sm font-medium">
              Welcome, {userName || "User"}
            </span>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="px-6 pt-4">
          <DashboardBreadcrumb />
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
