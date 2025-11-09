import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const supabaseServiceClient = () =>
  createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
