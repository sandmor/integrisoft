import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/breadcrumb";
import { MobileMenu } from "@/components/dashboard/mobile-menu";
import { getEntityNameById } from "@/lib/actions/dashboard";
import StoreProvider from "../../components/providers/store-provider";
import UserMenu from "@/components/dashboard/user-menu";
import { getUserAccessibleModules } from "@/lib/permission-handler";
import { ModulePermission } from "@/lib/menu-config";

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
  const userId = session?.user?.id;

  // Get user accessible modules
  const accessibleModules = await getUserAccessibleModules(userId);

  // Get pathname from headers on the server
  const pathname =
    headersList.get("x-pathname") ||
    headersList.get("x-invoke-path") ||
    "/dashboard";

  // Server-side map of entity IDs to names for breadcrumb
  const initialEntityNameMap: Record<string, string> = {};
  if (pathname) {
    const segments = pathname.split("/").filter(Boolean);
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.match(/^[A-Za-z0-9]{20,}$/)) {
        const entityType = segments[i - 1];
        if (entityType) {
          const entityInfo = await getEntityNameById(entityType, segment);
          if (entityInfo?.name) {
            initialEntityNameMap[segment] = entityInfo.name;
          }
        }
      }
    }
  }

  return (
    <StoreProvider>
      <div className="flex min-h-screen">
        {/* Sidebar with accessible modules */}
        <DashboardSidebar accessibleModules={accessibleModules} />

        {/* Main content */}
        <div className="flex flex-col flex-1 lg:ml-64">
          {/* Header */}
          <header className="bg-background border-b h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex flex-1 items-center space-x-2">
              <MobileMenu accessibleModules={accessibleModules} />
              <span className="text-sm font-medium">Welcome, {userName}</span>
              <div className="flex-1" />
              <UserMenu accessibleModules={accessibleModules} />
            </div>
          </header>

          {/* Breadcrumb - client component with server-provided data */}
          <div className="px-6 pt-4">
            <DashboardBreadcrumb initialEntityNameMap={initialEntityNameMap} />
          </div>

          {/* Page content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </StoreProvider>
  );
}
