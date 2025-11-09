import { NextResponse } from "next/server";
import { supabaseBrowserClient } from "@/lib/supabase/browserClient";
import { setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	try {
		const { email, password } = await request.json();
		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password are required" },
				{ status: 400 }
			);
		}
		const supabase = supabaseBrowserClient();
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error || !data.user || !data.session) {
			return NextResponse.json(
				{ error: error?.message ?? "Invalid credentials" },
				{ status: 401 }
			);
		}

		const role = (data.user.user_metadata?.role as string) ?? "owner";

		// Create response with explicit headers
		const response = NextResponse.json(
			{ ok: true, role },
			{
				status: 200,
				headers: {
					"Cache-Control": "no-store, no-cache, must-revalidate",
				},
			}
		);

		setSessionCookie(response, {
			id: data.user.id,
			email: data.user.email ?? "",
			role: role as "owner" | "admin" | "reader",
		});

		return response;
	} catch (error) {
		console.error("login failed", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
