"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    client.getSession().then((session) => {
      if (session.data) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-4xl font-bold">Welcome, Andres</h1>
        <p className="text-xl">Implement this</p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
