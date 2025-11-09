"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DocumentBuilder, DashboardDocument } from "@/components/dashboard/DocumentBuilder";
import { DocumentsList } from "@/components/dashboard/DocumentsList";
import { EventsPanel } from "@/components/dashboard/EventsPanel";
import { ReadersPanel } from "@/components/dashboard/ReadersPanel";
import { ReaderSnapshot } from "@/lib/types/reader";

const tabs = ["Builder", "Documents", "Events", "Readers"] as const;

type LiveEvent = {
  type: string;
  createdAt?: string;
  payload?: Record<string, unknown>;
};

export function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Builder");
  const [documents, setDocuments] = useState<DashboardDocument[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [readers, setReaders] = useState<ReaderSnapshot[]>([]);
  const [isRefreshingReaders, setIsRefreshingReaders] = useState(false);

  const refreshDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      const data = await response.json();
      setDocuments(data.documents ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load documents";
      toast.error(message);
    }
  }, []);

  const refreshReaders = useCallback(async () => {
    setIsRefreshingReaders(true);
    try {
      const response = await fetch("/api/readers", { cache: "no-store" });
      const data = await response.json();
      setReaders(data.readers ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load readers";
      toast.error(message);
    } finally {
      setIsRefreshingReaders(false);
    }
  }, []);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refreshReaders();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshReaders]);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      try {
        const data: LiveEvent = JSON.parse(event.data);
        if (data.type === "READY") return;
        setEvents((prev) => [data, ...prev].slice(0, 25));
        if (data.type === "VIEWER_IDENTITY_CAPTURED") {
          refreshReaders();
        }
        // Refresh readers on any security-related events
        if (
          data.type === "VIOLATION_LOGGED" ||
          data.type === "LOCATION_CAPTURED" ||
          data.type === "SESSION_REVOKED"
        ) {
          refreshReaders();
        }
      } catch {
        // ignore
      }
    };
    return () => source.close();
  }, [refreshReaders]);

  // Auto-refresh readers data when on Readers tab
  useEffect(() => {
    if (activeTab !== "Readers") return;

    // Refresh immediately when tab is opened
    refreshReaders();

    // Poll every 3 seconds for updates
    const interval = setInterval(() => {
      refreshReaders();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab, refreshReaders]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <header className="space-y-3 text-white">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Owner Console</p>
        <h1 className="text-4xl font-semibold">Create, monitor, and revoke documents in real time.</h1>
        <p className="text-slate-300">
          Upload files, craft rich text, generate mandatory OTPs, and watch your receivers on the live feed.
        </p>
      </header>

      <div className="flex gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-5 py-2 text-sm font-semibold ${
              activeTab === tab ? "bg-cyan-500 text-slate-900" : "bg-white/5 text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Builder" && (
        <DocumentBuilder
          onCreated={(doc) => {
            setDocuments((prev) => [doc, ...prev]);
            setActiveTab("Documents");
          }}
        />
      )}

      {activeTab === "Documents" && <DocumentsList documents={documents} onRefresh={refreshDocuments} />}

      {activeTab === "Events" && <EventsPanel events={events} />}

      {activeTab === "Readers" && <ReadersPanel readers={readers} onRefresh={refreshReaders} isRefreshing={isRefreshingReaders} />}
    </div>
  );
}
