import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE_NAME = "resit_admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET || "resit_admin_internal_secret_key_change_in_production_min_32_chars";
  return new TextEncoder().encode(secret);
}

export function getAuthorizedAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "adesholatajudeen1@gmail.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

export function isAuthorizedAdminEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  const authorized = getAuthorizedAdminEmails();
  return authorized.includes(normalized);
}

export interface AdminSessionPayload {
  email: string;
  role: "superadmin" | "operator";
  iat?: number;
  exp?: number;
}

export async function createAdminSessionToken(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const secretKey = getSecretKey();

  return new SignJWT({ email: normalized, role: "superadmin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_DURATION_SECONDS}s`)
    .sign(secretKey);
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email || !isAuthorizedAdminEmail(email)) {
      return null;
    }
    return {
      email,
      role: payload.role === "operator" ? "operator" : "superadmin",
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

interface PendingOtp {
  code: string;
  expiresAt: number;
}

const otpStore = new Map<string, PendingOtp>();

export function saveAdminOtp(email: string, code: string): void {
  const normalized = email.trim().toLowerCase();
  otpStore.set(normalized, {
    code: code.trim(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

export function verifyAdminOtp(email: string, code: string): boolean {
  const normalized = email.trim().toLowerCase();
  const entry = otpStore.get(normalized);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalized);
    return false;
  }
  if (entry.code !== code.trim()) {
    return false;
  }
  otpStore.delete(normalized);
  return true;
}

