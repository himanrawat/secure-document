import { Metadata } from "next";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";

export const metadata: Metadata = {
  title: "AegisDocs Dashboard",
};

export default function DashboardPage() {
  return <OwnerDashboard />;
}
