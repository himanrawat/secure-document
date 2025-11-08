type Payload = {
  type: "VIOLATION" | "HEARTBEAT" | "LOG";
  data: Record<string, unknown>;
};

async function post(endpoint: string, payload: Payload) {
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Notifier error", error);
  }
}

export const MonitoringNotifier = {
  violation(data: Payload["data"]) {
    return post("/api/violations", { type: "VIOLATION", data });
  },
  heartbeat(data: Payload["data"]) {
    return post("/api/heartbeat", { type: "HEARTBEAT", data });
  },
  log(data: Payload["data"]) {
    return post("/api/logs", { type: "LOG", data });
  },
};
