"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";
import { ensureProviderProfile } from "@/lib/provider";

interface Booking {
  id: number;
  status: string;
  scheduled_time: string;
  users: { name: string } | null;
  services: { name: string } | null;
}

interface ReportFeedback {
  id: number;
  description: string;
  created_at: string;
}

const statusFlow = ["pending", "confirmed", "in_progress", "completed"];
const statusLabels: Record<string, string> = {
  pending: "EN ROUTE",
  confirmed: "ARRIVED",
  in_progress: "STARTED",
};
const statusIcons: Record<string, string> = {
  pending: "directions_car",
  confirmed: "location_on",
  in_progress: "play_arrow",
};

export default function ProviderPage() {
  const router = useRouter();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [feedback, setFeedback] = useState<ReportFeedback[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const providerId = await ensureProviderProfile(supabase, user.id);
      if (!providerId) return;

      const { data } = await supabase
        .from("bookings")
        .select("id, status, scheduled_time, users(name), services(name)")
        .eq("provider_id", providerId)
        .in("status", ["pending", "confirmed", "in_progress"])
        .order("scheduled_time", { ascending: true });

      if (data && data.length > 0) {
        setActiveBooking(data[0] as unknown as Booking);
        setUpcoming((data.slice(1) as unknown as Booking[]));
      }

      const { data: providerBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(20);
      const bookingIds = (providerBookings ?? []).map((b) => b.id);
      if (bookingIds.length > 0) {
        const { data: reportData } = await supabase
          .from("issued_reports")
          .select("id, description, created_at")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false })
          .limit(5);
        setFeedback((reportData as ReportFeedback[] | null) ?? []);
      } else {
        setFeedback([]);
      }
    }
    loadData();
  }, [router]);

  async function advanceStatus() {
    if (!activeBooking) return;
    const supabase = getSupabase();
    const currentIdx = statusFlow.indexOf(activeBooking.status);
    const nextStatus = statusFlow[currentIdx + 1] ?? "completed";
    await supabase.from("bookings").update({ status: nextStatus }).eq("id", activeBooking.id);
    setActiveBooking({ ...activeBooking, status: nextStatus });
  }

  async function markCompleted() {
    if (!activeBooking) return;
    const supabase = getSupabase();
    await supabase.from("bookings").update({ status: "completed" }).eq("id", activeBooking.id);
    setActiveBooking(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark overflow-hidden">
          {/* Header */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-4 pb-2 justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </div>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center">
              Provider Dashboard
            </h2>
            <div className="flex w-12 items-center justify-end">
              <button className="flex items-center justify-center rounded-lg h-12 bg-transparent text-slate-900 dark:text-slate-100 p-0 relative">
                <span className="material-symbols-outlined text-2xl">notifications</span>
                <span className="absolute top-2 right-1 flex h-2 w-2 rounded-full bg-red-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-32">
            <div className="p-4">
              {/* Active Job */}
              <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Current Task</span>
                    <h3 className="text-slate-900 dark:text-slate-100 text-xl font-bold">
                      {activeBooking?.services?.name ?? "Kitchen Plumbing Repair"}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Customer: {activeBooking?.users?.name ?? "John Doe"} •{" "}
                      <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                        {activeBooking?.status.replace("_", " ") ?? "En Route"}
                      </span>
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-primary">navigation</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {Object.entries(statusLabels).map(([s, label]) => {
                    const isCurrent = activeBooking?.status === s;
                    return (
                      <button
                        key={s}
                        onClick={advanceStatus}
                        className={`flex flex-col items-center justify-center gap-1 rounded-lg py-3 ${
                          isCurrent
                            ? "bg-primary text-white"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span className="material-symbols-outlined">{statusIcons[s]}</span>
                        <span className="text-[10px] font-bold">{label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={markCompleted}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  Mark as Completed
                </button>
              </div>

              {/* Upcoming Bookings */}
              <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight px-1 pb-3">
                Upcoming Bookings
              </h2>
              {upcoming.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No upcoming bookings.</p>
              )}
              {upcoming.map((b) => (
                <div key={b.id} className="mb-4">
                  <div className="flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-[2_2_0px] flex-col justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm">person</span>
                          <p className="text-xs font-medium">{b.users?.name ?? "Customer"}</p>
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight">
                          {b.services?.name ?? "Service"}
                        </p>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <p className="text-xs">
                            {new Date(b.scheduled_time).toLocaleDateString()} •{" "}
                            {new Date(b.scheduled_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <button className="mt-4 flex items-center justify-center rounded-lg h-9 px-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 gap-2 text-sm font-semibold w-full">
                        <span className="truncate">View Details</span>
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>
                    <div className="w-24 h-24 bg-primary/10 rounded-lg shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-3xl">home_repair_service</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Recent Feedback */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Recent Feedback</h2>
                  <button
                    onClick={() => router.push("/provider/feedback")}
                    className="text-primary text-xs font-bold uppercase cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {feedback.length === 0 && (
                    <p className="text-sm text-slate-500">No feedback reports available yet.</p>
                  )}
                  {feedback.map((item, i) => (
                    <div key={item.id} className={i < feedback.length - 1 ? "border-b border-slate-100 dark:border-slate-800 pb-4" : ""}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 text-yellow-500">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <span key={j} className={`material-symbols-outlined text-sm ${j >= 4 ? "text-slate-300" : ""}`}>star</span>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 text-sm italic">&ldquo;{item.description}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <BottomNav variant="provider" active="schedule" />
        </div>
      </MobileFrame>
    </div>
  );
}
