import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex w-full">
      <DashboardSidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto p-4 md:p-7 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
