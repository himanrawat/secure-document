import { NextResponse } from "next/server";
import { subscribeSystemEvents } from "@/lib/server/eventBus";

export const dynamic = "force-dynamic";

export async function GET() {
	const encoder = new TextEncoder();
	let cleanup: (() => void) | null = null;

	const stream = new ReadableStream({
		start(controller) {
			let closed = false;
			let heartbeat: ReturnType<typeof setInterval> | null = null;
			let unsubscribe: () => void = () => {};

			cleanup = () => {
				if (closed) return;
				closed = true;
				if (heartbeat) {
					clearInterval(heartbeat);
					heartbeat = null;
				}
				unsubscribe();
				try {
					controller.close();
				} catch {
					// already closed
				}
			};

			const send = (data: unknown) => {
				if (closed) return;
				try {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
					);
				} catch {
					if (cleanup) cleanup();
				}
			};

			send({ type: "READY" });
			unsubscribe = subscribeSystemEvents((event) => send(event));
			heartbeat = setInterval(
				() => send({ type: "HEARTBEAT", at: Date.now() }),
				15000
			);
		},
		cancel() {
			cleanup?.();
		},
	});

	return new NextResponse(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		},
	});
}
