import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextResponse as NextResponseType } from "next/server";
import { env } from "@/lib/env";

export type AppSession = {
  id: string;
  email: string;
  role: "owner" | "admin" | "reader";
};

const SESSION_COOKIE = "secure-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const IS_PROD = process.env.NODE_ENV === "production";

type CookieWritableResponse = Response & {
  cookies?: NextResponseType["cookies"];
};

export function signSession(session: AppSession) {
  return jwt.sign(session, env.sessionSecret, { expiresIn: SESSION_MAX_AGE });
}

export function verifySession(token: string): AppSession | null {
  try {
    return jwt.verify(token, env.sessionSecret) as AppSession;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifySession(token);
}

export function setSessionCookie(response: CookieWritableResponse, session: AppSession) {
  const token = signSession(session);
  if (response.cookies) {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PROD,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return;
  }
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; ${IS_PROD ? "Secure; " : ""}SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`,
  );
}

export function clearSessionCookie(response: CookieWritableResponse) {
  if (response.cookies) {
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PROD,
      path: "/",
      maxAge: 0,
    });
    return;
  }
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; ${IS_PROD ? "Secure; " : ""}SameSite=Lax; Max-Age=0`,
  );
}
