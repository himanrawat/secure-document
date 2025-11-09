import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const session = await getSessionFromCookies();
		if (!session) {
			return NextResponse.json({ authenticated: false }, { status: 401 });
		}
		return NextResponse.json({
			authenticated: true,
			session: {
				id: session.id,
				email: session.email,
				role: session.role,
			},
		});
	} catch (error) {
		console.error("Session check failed", error);
		return NextResponse.json(
			{ authenticated: false, error: "Invalid session" },
			{ status: 401 }
		);
	}
}
