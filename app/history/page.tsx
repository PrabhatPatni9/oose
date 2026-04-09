"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";

interface HistoryEntry {
  id: number;
  completion_date: string;
  notes: string | null;
  bookings: {
    status: string;
    services: { name: string; category: string } | null;
  } | null;
}

const filters = [
  { label: "All", icon: "grid_view" },
  { label: "AC Repair", icon: "ac_unit" },
  { label: "Plumbing", icon: "plumbing" },
  { label: "Cleaning", icon: "cleaning_services" },
];

const mockHistory = [
  { icon: "ac_unit", iconBg: "bg-primary/10 text-primary", name: "Full AC Service", date: "July 15, 2023 • 2:00 PM", status: "Completed", statusColor: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400", rating: "4.8" },
  { icon: "plumbing", iconBg: "bg-orange-100 dark:bg-orange-900/30 text-orange-600", name: "Leaky Faucet Repair", date: "June 02, 2023 • 10:30 AM", status: "Completed", statusColor: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400", rating: null },
  { icon: "cleaning_services", iconBg: "bg-purple-100 dark:bg-purple-900/30 text-purple-600", name: "Deep Home Cleaning", date: "May 12, 2023 • 09:00 AM", status: "Canceled", statusColor: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400", rating: null },
];

export default function HistoryPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("service_history")
        .select("id, completion_date, notes, bookings(status, services(name, category))")
        .order("completion_date", { ascending: false });
      if (data) setHistory(data as unknown as HistoryEntry[]);
    }
    loadData();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="relative flex h-full min-h-screen flex-col bg-background-light dark:bg-background-dark shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-20 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => router.back()}
              className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span className="material-symbols-outlined text-slate-900 dark:text-slate-100">arrow_back_ios_new</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center">
              Service History
            </h2>
            <div className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <span className="material-symbols-outlined text-slate-900 dark:text-slate-100">search</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-24">
            {/* Pattern Insight */}
            <div className="p-4">
              <div className="relative overflow-hidden flex flex-col items-stretch justify-start rounded-xl shadow-sm bg-white dark:bg-slate-900 border border-primary/20">
                <div className="absolute top-0 right-0 p-3">
                  <span className="material-symbols-outlined text-primary/40 text-4xl">lightbulb</span>
                </div>
                <div className="flex w-full flex-col items-stretch justify-center gap-3 p-5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-1">
                      <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
                    </span>
                    <p className="text-primary text-sm font-bold uppercase tracking-wider">Pattern Insight</p>
                  </div>
                  <p className="text-slate-900 dark:text-slate-100 text-lg font-semibold leading-tight">
                    You usually service your AC every 6 months.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Next suggested maintenance window is early January to avoid the summer rush.
                  </p>
                  <div className="mt-2">
                    <Link
                      href="/reminders"
                      className="inline-flex items-center justify-center rounded-lg h-10 px-6 bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
                    >
                      Set Reminder
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 pb-2">
              <h3 className="text-slate-900 dark:text-slate-100 text-sm font-bold uppercase tracking-widest mb-3">
                Filter by Type
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {filters.map(({ label, icon }) => (
                  <button
                    key={label}
                    onClick={() => setActiveFilter(label)}
                    className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl px-4 ${
                      activeFilter === label
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    <p className={`text-sm ${activeFilter === label ? "font-semibold" : "font-medium"}`}>{label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* History List */}
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold tracking-tight">Past Services</h2>
                <span className="text-xs font-medium text-slate-500">{mockHistory.length} Total</span>
              </div>
              {mockHistory.map((item, i) => (
                <div key={i} className="group bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                  <div className="flex gap-4">
                    <div className={`size-16 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100">{item.name}</h3>
                          <p className="text-sm text-slate-500">{item.date}</p>
                        </div>
                        <span className={`${item.statusColor} text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-3">
                        {item.rating ? (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-yellow-500">star</span>
                            <span className="text-sm font-bold">{item.rating}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400">
                            <span className="material-symbols-outlined text-sm">chat_bubble_outline</span>
                            <span className="text-sm">{item.status === "Canceled" ? "User canceled service" : "Feedback sent"}</span>
                          </div>
                        )}
                        <Link href="/booking" className="flex items-center gap-2 text-primary font-bold text-sm">
                          <span className="material-symbols-outlined text-sm">refresh</span>
                          Rebook
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <BottomNav variant="user" active="history" />
        </div>
      </MobileFrame>
    </div>
  );
}
