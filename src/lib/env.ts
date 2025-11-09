export const env = {
	supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
	supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
	supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
	r2Endpoint: process.env.R2_ENDPOINT ?? "",
	r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
	r2SecretKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
	r2Bucket: process.env.R2_BUCKET ?? "",
	sessionSecret: process.env.APP_SESSION_SECRET ?? "",
};

if (!env.supabaseUrl || !env.supabaseAnonKey) {
	console.warn(
		"Supabase env vars are missing. Auth and data features will fail."
	);
}

if (!env.sessionSecret) {
	console.warn(
		"APP_SESSION_SECRET is not set. Sessions cannot be signed securely."
	);
}

if (
	!env.r2Endpoint ||
	!env.r2AccessKeyId ||
	!env.r2SecretKey ||
	!env.r2Bucket
) {
	console.warn(
		"Cloudflare R2 credentials are missing. File uploads will fail."
	);
}
