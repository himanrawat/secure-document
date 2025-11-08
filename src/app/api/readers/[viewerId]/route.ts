import { NextResponse } from "next/server";
import { deleteReaderRecord } from "@/lib/services/documentService";

export const dynamic = "force-dynamic";

export async function DELETE(
	_: Request,
	props: { params: Promise<{ viewerId: string }> }
) {
	const params = await props.params;
	const removed = await deleteReaderRecord(params.viewerId);
	if (!removed) {
		return NextResponse.json({ error: "Reader not found" }, { status: 404 });
	}
	return NextResponse.json({ ok: true });
}
