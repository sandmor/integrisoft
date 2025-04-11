import { redirect } from "next/navigation";
import { betterAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions";

export default async function DashboardPage() {
  const session = await betterAuth.getSession();
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-xl">Welcome, {session.user.name || session.user.email}!</p>
        <p>You are now authenticated.</p>
        <form action={logout}>
          <Button type="submit">Logout</Button>
        </form>
      </div>
    </main>
  );
}