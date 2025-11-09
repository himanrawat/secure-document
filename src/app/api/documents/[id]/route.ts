import { NextResponse } from "next/server";
import {
	deleteDocument,
	getDocumentById,
} from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function GET(
	_: Request,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	const document = await getDocumentById(params.id);
	if (!document) {
		return NextResponse.json({ error: "Document not found" }, { status: 404 });
	}
	const { otp: _otp, ...sanitized } = document;
	return NextResponse.json({
		document: {
			...sanitized,
			fileUrl: document.filePath
				? `/api/documents/${document.documentId}/file`
				: null,
		},
	});
}

export async function DELETE(
	request: Request,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	const url = new URL(request.url);
	const purgeReaders = url.searchParams.get("purgeReaders") === "true";
	const removed = await deleteDocument(params.id, { purgeReaders });
	if (!removed) {
		return NextResponse.json({ error: "Document not found" }, { status: 404 });
	}
	return NextResponse.json({ ok: true });
}
