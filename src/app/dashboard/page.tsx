import { Metadata } from "next";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";
import { getSessionFromCookies } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "AegisDocs Dashboard",
};

export default async function DashboardPage() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    redirect("/login");
  }
  return <OwnerDashboard />;
}
