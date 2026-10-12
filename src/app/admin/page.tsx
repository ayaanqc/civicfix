import type { Metadata } from "next";
import AdminPortal from "@/components/admin-portal";

export const metadata: Metadata = {
  title: "CivicFix — Staff Console",
  description: "Protected operations console for city staff.",
};

export default function AdminPage() {
  return <AdminPortal />;
}
