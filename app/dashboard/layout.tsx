import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardBreadcrumb } from "@/components/dashboard/breadcrumb";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();

  // Get user session data
  const session = await auth.api.getSession({
    headers: headersList,
  });
  const userName = session?.user?.name || "User";

  // Get pathname from headers on the server
  const pathname =
    headersList.get("x-pathname") ||
    headersList.get("x-invoke-path") ||
    "/dashboard";

  return (
    <div className="flex min-h-screen">
      {/* Client-side interactive sidebar */}
      <DashboardSidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Header - server rendered */}
        <header className="bg-background border-b h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="lg:hidden">
            {/* Mobile menu trigger placeholder */}
          </div>
          <div className="flex-1 lg:hidden"></div>
          <div>
            <span className="text-sm font-medium">Welcome, {userName}</span>
          </div>
        </header>

        {/* Breadcrumb - directly include server component */}
        <div className="px-6 pt-4">
          <DashboardBreadcrumb pathname={pathname} />
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
