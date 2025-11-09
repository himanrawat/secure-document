import { NextResponse } from "next/server";
import { supabaseServiceClient } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password, role = "owner" } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    const supabase = supabaseServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
      },
    });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? "Unable to create user" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("signup failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
