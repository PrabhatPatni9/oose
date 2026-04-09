"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";
import { ensureProviderProfile } from "@/lib/provider";
import { guardProviderShell } from "@/lib/roleRoutes";

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

const statusFlow: Array<"pending" | "confirmed" | "in_progress"> = ["pending", "confirmed", "in_progress"];
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const ok = await guardProviderShell(router, supabase, user);
      if (!ok) return;

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
      } else {
        setActiveBooking(null);
        setUpcoming([]);
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

  async function setJobStatus(next: "pending" | "confirmed" | "in_progress") {
    if (!activeBooking) return;
    const cur = statusFlow.indexOf(activeBooking.status as "pending" | "confirmed" | "in_progress");
    const want = statusFlow.indexOf(next);
    if (want !== cur + 1) return;
    const supabase = getSupabase();
    await supabase.from("bookings").update({ status: next }).eq("id", activeBooking.id);
    setActiveBooking({ ...activeBooking, status: next });
  }

  async function markCompleted() {
    if (!activeBooking) return;
    const supabase = getSupabase();
    await supabase.from("bookings").update({ status: "completed" }).eq("id", activeBooking.id);
    setActiveBooking(null);
  }

  function openMaps() {
    const q = activeBooking
      ? `${activeBooking.services?.name ?? "Home service"} job`
      : "Home service";
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
  }

  const unreadIssues = feedback.length;

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark overflow-hidden relative">
          <header className="flex items-center bg-white dark:bg-slate-900 p-3 pb-2 justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="text-slate-900 dark:text-slate-100 flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight tracking-tight flex-1 text-center">
              Provider Dashboard
            </h2>
            <button
              type="button"
              onClick={() => router.push("/provider/feedback")}
              className="flex size-11 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 relative text-slate-900 dark:text-slate-100"
              aria-label="Notifications and issues"
            >
              <span className="material-symbols-outlined text-2xl">notifications</span>
              {unreadIssues > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadIssues > 9 ? "9+" : unreadIssues}
                </span>
              )}
            </button>
          </header>

          {menuOpen && (
            <div className="absolute inset-0 z-50 flex">
              <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
              <div className="relative w-[78%] max-w-[300px] bg-white dark:bg-slate-900 h-full shadow-xl border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
                {[
                  { href: "/provider", label: "Schedule", icon: "calendar_today" },
                  { href: "/provider/earnings", label: "Earnings", icon: "payments" },
                  { href: "/provider/feedback", label: "Issues & feedback", icon: "reviews" },
                  { href: "/provider/profile", label: "Profile", icon: "person" },
                ].map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(item.href);
                    }}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="material-symbols-outlined text-primary">{item.icon}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
            <div className="p-4">
              <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-start mb-4 gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Current task</span>
                    <h3 className="text-slate-900 dark:text-slate-100 text-xl font-bold break-words">
                      {activeBooking?.services?.name ?? "No active job"}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                      {activeBooking ? (
                        <>
                          Customer: {activeBooking.users?.name ?? "Customer"} •{" "}
                          <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                            {activeBooking.status.replace("_", " ")}
                          </span>
                        </>
                      ) : (
                        "New assignments appear here when customers book you."
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openMaps}
                    disabled={!activeBooking}
                    className="shrink-0 bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                    aria-label="Open directions"
                  >
                    <span className="material-symbols-outlined text-primary">navigation</span>
                  </button>
                </div>

                {activeBooking && (
                  <>
                    <p className="text-xs text-slate-500 mb-3">
                      Tap the next step in order. Each button moves the job forward in Supabase.
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {statusFlow.map((s) => {
                        const isCurrent = activeBooking.status === s;
                        const curIdx = statusFlow.indexOf(activeBooking.status as (typeof statusFlow)[number]);
                        const thisIdx = statusFlow.indexOf(s);
                        const canClick = thisIdx === curIdx + 1;
                        return (
                          <button
                            key={s}
                            type="button"
                            disabled={!canClick}
                            onClick={() => setJobStatus(s)}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-3 transition-all ${
                              isCurrent
                                ? "bg-primary text-white shadow-md shadow-primary/25"
                                : canClick
                                  ? "bg-white dark:bg-slate-800 border-2 border-primary text-primary"
                                  : "bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-400"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[22px]">{statusIcons[s]}</span>
                            <span className="text-[10px] font-bold leading-tight text-center px-0.5">{statusLabels[s]}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={markCompleted}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                      Mark as completed
                    </button>
                  </>
                )}
              </div>

              <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight px-1 pb-3">Upcoming bookings</h2>
              {upcoming.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No upcoming bookings.</p>
              )}
              {upcoming.map((b) => (
                <div key={b.id} className="mb-4">
                  <div className="flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-[2_2_0px] flex-col justify-between min-w-0">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-sm">person</span>
                          <p className="text-xs font-medium truncate">{b.users?.name ?? "Customer"}</p>
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
                    </div>
                    <div className="w-24 h-24 bg-primary/10 rounded-lg shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-3xl">home_repair_service</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Recent feedback</h2>
                  <button
                    type="button"
                    onClick={() => router.push("/provider/feedback")}
                    className="text-primary text-xs font-bold uppercase"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {feedback.length === 0 && <p className="text-sm text-slate-500">No feedback reports available yet.</p>}
                  {feedback.map((item, i) => (
                    <div
                      key={item.id}
                      className={i < feedback.length - 1 ? "border-b border-slate-100 dark:border-slate-800 pb-4" : ""}
                    >
                      <p className="text-slate-800 dark:text-slate-200 text-sm">{item.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                      </p>
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
