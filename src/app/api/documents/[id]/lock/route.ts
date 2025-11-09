import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
	lockDocument,
	recordSessionViolation,
} from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

type Params = {
	params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Params) {
	const { id } = await context.params;
	const payload = await request.json().catch(() => ({}));
	await lockDocument(id, payload?.reason);

	const cookieStore = await cookies();
	const viewerToken = cookieStore.get("viewer-session")?.value;
	if (viewerToken && payload?.violation?.id && payload?.violation?.code) {
		const evidencePhoto =
			payload.violation.evidenceUrl ??
			payload.evidence?.photo ??
			payload.context?.evidencePhoto ??
			null;

		await recordSessionViolation(viewerToken, {
			violation: {
				id: payload.violation.id,
				code: payload.violation.code,
				description:
					payload.violation.description ?? payload.reason ?? "Document locked",
				createdAt: payload.violation.createdAt ?? new Date().toISOString(),
			},
			photo: evidencePhoto,
		});
	}

	return NextResponse.json({ ok: true });
}
