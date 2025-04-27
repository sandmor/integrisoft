"use client";

import Link from "next/link";
import { client, signIn } from "@/lib/auth-client";
import { AuthForm, LoginFormData } from "@/components/ui/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    client.getSession().then((session) => {
      if (session.data) {
        router.push("/");
      }
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            type="login"
            onSubmit={async (data: LoginFormData) => {
              const { error } = await signIn.email({
                email: data.email,
                password: data.password,
              });
              if (error) {
                return { error: error.message ?? "An error occurred" };
              }
              await router.push("/dashboard");
              return {};
            }}
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
