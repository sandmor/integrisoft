import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  } catch (error) {
    console.error("Error in middleware:", error);
  }

  return NextResponse.next();
}
export const config = {
  runtime: "nodejs",
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
