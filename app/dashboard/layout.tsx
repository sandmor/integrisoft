"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

interface SidebarItem {
  title: string;
  icon: React.ReactNode;
  href: string;
}

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
  const [userName, setUserName] = useState("");

  useEffect(() => {
    client.getSession().then((session) => {
      if (session?.data?.user?.name) {
        setUserName(session.data.user.name);
      }
    });
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-10 w-64 border-r border-sidebar-border hidden lg:block">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Home className="size-5" />
            <span>Integrisoft</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 p-4">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground",
                pathname === item.href &&
                  "bg-sidebar-accent/10 text-sidebar-foreground font-medium"
              )}
            >
              {item.icon}
              <span>{item.title}</span>
            </Link>
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

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
