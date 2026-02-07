"use client";

import dynamic from "next/dynamic";

const DashboardContent = dynamic(() => import("./dashboard-content"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardContent />;
}
