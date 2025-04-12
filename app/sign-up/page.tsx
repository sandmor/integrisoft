"use client";

import Link from "next/link";
import { AuthForm, RegisterFormData } from "@/components/ui/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUpAction } from "../../lib/actions";
import { useRouter } from "next/navigation";
import { client } from "@/lib/auth-client";
import { useEffect } from "react";

export default function SignUpPage() {
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
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Enter your details to create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            type="register"
            onSubmit={async (formData) => {
              const data = formData as RegisterFormData;
              return await signUpAction(data);
            }}
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
