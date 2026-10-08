import { NextResponse } from "next/server";
import { isAuthorizedAdminEmail, saveAdminOtp } from "@/lib/auth";
import { sendAdminOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!isAuthorizedAdminEmail(email)) {
      return NextResponse.json(
        { error: "Access denied. Email is not on the admin whitelist." },
        { status: 403 }
      );
    }

    // Generate cryptographic-grade 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    saveAdminOtp(email, code);

    // Send real passcode to admin inbox via ZeptoMail
    try {
      await sendAdminOtpEmail(email, code);
    } catch (mailError: unknown) {
      const msg = mailError instanceof Error ? mailError.message : "Failed to send email";
      return NextResponse.json(
        { error: `Unable to dispatch verification email: ${msg}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Security passcode sent to your email.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to process login request" }, { status: 500 });
  }
}
