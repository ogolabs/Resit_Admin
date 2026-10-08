import { NextResponse } from "next/server";
import {
  isAuthorizedAdminEmail,
  verifyAdminOtp,
  createAdminSessionToken,
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_DURATION_SECONDS,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; code?: string };
    const email = body.email?.trim().toLowerCase();
    const code = body.code?.trim();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required" },
        { status: 400 }
      );
    }

    if (!isAuthorizedAdminEmail(email)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const isValid = verifyAdminOtp(email, code);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken(email);

    const response = NextResponse.json({
      success: true,
      email,
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_DURATION_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
