"use server";

import { auth } from "@/lib/auth";
import { APIError } from "better-auth/api";
import { RegisterFormData } from "@/components/ui/auth-form";

export async function signUpAction(
  data: RegisterFormData
): Promise<{ error?: string }> {
  try {
    await auth.api.signUpEmail({
      body: {
        name: data.name,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      },
    });
    return {};
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message ?? "An error occurred" };
    }
    return { error: "An unexpected error occurred" };
  }
}
