/* eslint-disable @next/next/no-img-element */
"use client";

type Event = {
	type: string;
	createdAt?: string;
	payload?: Record<string, unknown>;
};

type Props = {
	events: Event[];
};

export function EventsPanel({ events }: Props) {
	return (
		<div className="glass-panel flex flex-col gap-3 px-5 py-4 text-sm text-slate-200">
			<div className="flex items-center justify-between">
				<p className="text-base font-semibold text-white">Live Events</p>
				<span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
					{events.length} recent
				</span>
			</div>
			<div className="space-y-3">
				{events.slice(0, 8).map((event, index) => (
					<div
						key={`${event.createdAt ?? index}-${event.type}`}
						className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-xs text-slate-200"
					>
						<p className="font-semibold text-white">{event.type}</p>
						<p className="text-slate-400">
							{event.createdAt
								? new Date(event.createdAt).toLocaleTimeString()
								: "—"}
						</p>
						{(event.type === "VIEWER_IDENTITY_CAPTURED" ||
							event.type === "PRESENCE_CAPTURED") && (
							<div className="mt-2 rounded-2xl border border-white/5 bg-black/30 px-3 py-2 text-xs text-slate-200">
								{event.type === "VIEWER_IDENTITY_CAPTURED" && (
									<>
										<p>
											Name:{" "}
											{typeof event.payload?.name === "string"
												? event.payload.name
												: "—"}
										</p>
										<p>
											Phone:{" "}
											{typeof event.payload?.phone === "string"
												? event.payload.phone
												: "—"}
										</p>
									</>
								)}
								{event.type === "PRESENCE_CAPTURED" && (
									<p>
										Location:{" "}
										{event.payload?.location &&
										typeof event.payload.location === "object"
											? JSON.stringify(event.payload.location)
											: "Not provided"}
									</p>
								)}
							</div>
						)}
						{event.payload?.photo && typeof event.payload.photo === "string" ? (
							<img
								src={event.payload.photo}
								alt="Presence evidence"
								className="mt-3 rounded-2xl border border-white/5"
							/>
						) : null}
						<pre className="mt-2 text-[0.65rem] text-slate-300">
							{JSON.stringify(event.payload ?? {}, null, 2)}
						</pre>
					</div>
				))}
				{!events.length && (
					<div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-xs text-slate-200">
						Waiting for activity…
					</div>
				)}
			</div>
		</div>
	);
}
