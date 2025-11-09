import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { env } from "@/lib/env";

const SESSION_COOKIE = "secure-session";
const ownerPaths = ["/dashboard", "/api/documents", "/api/events"];
const readerPaths = ["/reader"];

function decodeSession(token?: string) {
	if (!token) return null;
	try {
		return jwt.verify(token, env.sessionSecret) as { role: string };
	} catch (error) {
		console.error("Session decode error:", error);
		return null;
	}
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
	const session = decodeSession(sessionToken);

	// Debug logging for production issues
	if (process.env.NODE_ENV === "production") {
		console.log("Middleware:", {
			pathname,
			hasToken: !!sessionToken,
			hasSession: !!session,
			role: session?.role,
		});
	}

	const requiresOwner = ownerPaths.some((prefix) =>
		pathname.startsWith(prefix)
	);
	const requiresReader = readerPaths.some((prefix) =>
		pathname.startsWith(prefix)
	);

	if (requiresOwner) {
		if (!session || (session.role !== "owner" && session.role !== "admin")) {
			const loginUrl = new URL("/login", request.url);
			loginUrl.searchParams.set("next", pathname);
			return NextResponse.redirect(loginUrl);
		}
	}

	if (requiresReader) {
		if (!session || session.role !== "reader") {
			const loginUrl = new URL("/login", request.url);
			loginUrl.searchParams.set("next", pathname);
			return NextResponse.redirect(loginUrl);
		}
	}

	if (session && (pathname === "/login" || pathname === "/signup")) {
		const dashboardUrl = new URL(
			session.role === "reader" ? "/reader" : "/dashboard",
			request.url
		);
		return NextResponse.redirect(dashboardUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/reader/:path*", "/login", "/signup"],
};
