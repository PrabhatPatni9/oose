"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";
import { invokePredictReminders } from "@/lib/predictRemindersClient";

interface ReminderRow {
  id: number;
  reminder_date: string;
  source: string;
  prediction_meta: Record<string, unknown> | null;
  services: { name: string } | null;
}

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return startOfMonth(x);
}

export default function RemindersPage() {
  const router = useRouter();
  const [autoReminder, setAutoReminder] = useState(true);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data: profile } = await supabase.from("users").select("preferences").eq("id", user.id).maybeSingle();
    const prefs = profile?.preferences as { auto_reminders?: boolean } | undefined;
    if (prefs && typeof prefs.auto_reminders === "boolean") {
      setAutoReminder(prefs.auto_reminders);
    }

    const { data } = await supabase
      .from("reminders")
      .select("id, reminder_date, source, prediction_meta, services(name)")
      .eq("user_id", user.id)
      .order("reminder_date", { ascending: true });
    setReminders((data as ReminderRow[] | null) ?? []);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function persistAuto(v: boolean) {
    setAutoReminder(v);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: row } = await supabase.from("users").select("preferences").eq("id", user.id).maybeSingle();
    const prev = (row?.preferences as Record<string, unknown> | null) ?? {};
    await supabase.from("users").update({ preferences: { ...prev, auto_reminders: v } }).eq("id", user.id);
  }

  async function runPredictionSync() {
    setSyncing(true);
    setSyncMessage(null);
    const supabase = getSupabase();
    const res = await invokePredictReminders(supabase);
    if (!res.ok) {
      setSyncMessage(
        res.error?.includes("404") || res.error?.includes("Failed to fetch")
          ? "Edge Function not deployed yet. Run: supabase functions deploy predict-reminders"
          : res.error || "Sync failed",
      );
    } else {
      const n = (res.data as { predictions_created?: number })?.predictions_created;
      setSyncMessage(
        typeof n === "number" ? `Updated predictions (${n} scheduled).` : "Predictions refreshed.",
      );
      await loadData();
    }
    setSyncing(false);
  }

  const { year, monthIndex, daysInMonth, startWeekday } = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    return {
      year: y,
      monthIndex: m,
      daysInMonth: new Date(y, m + 1, 0).getDate(),
      startWeekday: new Date(y, m, 1).getDay(),
    };
  }, [calendarMonth]);

  const monthLabel = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const reminderDays = useMemo(() => {
    const set = new Set<string>();
    reminders.forEach((r) => {
      const d = new Date(r.reminder_date);
      d.setHours(0, 0, 0, 0);
      set.add(d.toDateString());
    });
    return set;
  }, [reminders]);

  const predictions = useMemo(() => {
    return reminders
      .filter((r) => new Date(r.reminder_date) >= new Date(new Date().toDateString()))
      .slice(0, 8);
  }, [reminders]);

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
          <header className="sticky top-0 z-50 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => router.back()} aria-label="Back">
                <span className="material-symbols-outlined cursor-pointer text-slate-600 dark:text-slate-400">arrow_back_ios</span>
              </button>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Smart reminders</h1>
                <p className="text-[11px] text-slate-500">Predictive maintenance from your history</p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <section className="bg-white dark:bg-background-dark p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                  onClick={() => setCalendarMonth((m) => addMonths(m, -1))}
                  aria-label="Previous month"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <p className="text-base font-bold">{monthLabel}</p>
                <button
                  type="button"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                  onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  aria-label="Next month"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 text-center mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i} className="text-xs font-semibold text-slate-400">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: startWeekday }).map((_, i) => (
                  <div key={`pad-${i}`} className="h-11" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const date = new Date(year, monthIndex, day);
                  const key = date.toDateString();
                  const isSel = selectedDay?.toDateString() === key;
                  const hasDot = reminderDays.has(key);
                  const isToday = new Date().toDateString() === key;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(date)}
                      className={`h-11 w-full text-sm font-medium rounded-lg flex flex-col items-center justify-center gap-0.5 ${
                        isSel ? "bg-primary text-white" : isToday ? "ring-2 ring-primary/30" : ""
                      }`}
                    >
                      <span>{day}</span>
                      {hasDot && (
                        <span className={`h-1.5 w-1.5 rounded-full ${isSel ? "bg-white" : "bg-primary"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="p-4 space-y-4">
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-primary shrink-0">psychology</span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm">Auto predictions</p>
                    <p className="text-xs text-slate-500">Server-side model uses last service dates + category intervals.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoReminder}
                    onChange={(e) => persistAuto(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              <button
                type="button"
                onClick={runPredictionSync}
                disabled={syncing || !autoReminder}
                className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm disabled:opacity-50"
              >
                {syncing ? "Running edge function…" : "Refresh predictions (Edge Function)"}
              </button>
              {syncMessage && <p className="text-xs text-slate-500 text-center">{syncMessage}</p>}

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">How prediction works</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>We read your completed bookings and service history completion dates.</li>
                  <li>Each category has a typical re-service interval (e.g. AC ~120 days, cleaning ~90 days).</li>
                  <li>Next due date = last service + interval. Confidence is higher when history is recent.</li>
                </ul>
              </div>

              <h3 className="text-base font-bold">Upcoming</h3>
              {predictions.length === 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-500">
                  No upcoming reminders. Complete a booking or tap &quot;Refresh predictions&quot; after deploy.
                </div>
              )}
              {predictions.map((r) => {
                const meta = r.prediction_meta || {};
                const explanation = typeof meta.explanation === "string" ? meta.explanation : "";
                const confidence = typeof meta.confidence === "string" ? meta.confidence : "";
                const tag = r.source === "predicted" ? "Predictive" : "Scheduled";
                return (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {tag}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(r.reminder_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold mb-1">{r.services?.name ?? "Service"}</h4>
                      {confidence && <p className="text-[11px] text-primary font-semibold mb-1 capitalize">Confidence: {confidence}</p>}
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                        {explanation || "We will remind you when this service is typically due again."}
                      </p>
                      <Link
                        href="/booking"
                        className="block w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold shadow-md shadow-primary/20 text-center"
                      >
                        Schedule now
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          <BottomNav variant="user" active="reminders" />
        </div>
      </MobileFrame>
    </div>
  );
}
