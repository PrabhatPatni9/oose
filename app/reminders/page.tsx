"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import { getSupabase } from "@/lib/supabase";

interface Reminder {
  id: number;
  reminder_date: string;
  services: { name: string } | null;
}

const calendarDays = [
  { day: 27, prev: true }, { day: 28, prev: true }, { day: 29, prev: true }, { day: 30, prev: true },
  { day: 1 }, { day: 2 }, { day: 3, dot: true },
  { day: 4 }, { day: 5, selected: true }, { day: 6 }, { day: 7 }, { day: 8 }, { day: 9, dot: true }, { day: 10 },
  { day: 11 }, { day: 12 }, { day: 13 }, { day: 14 }, { day: 15 }, { day: 16, dot: true, highlight: true }, { day: 17 },
];

export default function RemindersPage() {
  const router = useRouter();
  const [autoReminder, setAutoReminder] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const now = new Date();

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase
        .from("reminders")
        .select("id, reminder_date, services(name)")
        .order("reminder_date", { ascending: true });
      if (data) setReminders(data as unknown as Reminder[]);
    }
    loadData();
  }, [router]);

  const predictions = reminders.slice(0, 3).map((r, idx) => ({
    tag: idx === 0 ? "Predictive" : "Seasonal",
    tagColor: idx === 0 ? "text-primary bg-primary/10" : "text-slate-500 bg-slate-100 dark:bg-slate-800",
    date: new Date(r.reminder_date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    title: `Suggested: ${r.services?.name ?? "Service"}`,
    desc: "Based on your booking timeline and usage pattern.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDS4lleknTW5LUrFsZO6n5l3PhyNwN-MLfe2VGlqyaMhQoyA_6qS5absy5XEAPrmKFJeKp6IsjDem9jmZH4b85Go08aqcCH-CsQO_GODDgluJ3D2nXRdBtDRTIzFtRwC1tdpSy5ska3JorTLbGRnxz8XHm0CTDjcXRfxAB7ticrw-2uEgEBDG2WnYOAm7ZyYtwCoDITl97iJxncfTEPYvnvmrhQOA-NnRxUORYLVIEkXQPMx8MJsBtNYjBVNShB_DrUeDH6qC9_wBxw",
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col">
          <header className="sticky top-0 z-50 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()}>
                <span className="material-symbols-outlined cursor-pointer text-slate-600 dark:text-slate-400">arrow_back_ios</span>
              </button>
              <h1 className="text-lg font-bold tracking-tight">Service Reminders</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">notifications</span>
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">settings</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-24">
            {/* Calendar */}
            <section className="bg-white dark:bg-background-dark p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <p className="text-base font-bold">{now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 text-center mb-2">
                {["S","M","T","W","T","F","S"].map((d, i) => (
                  <span key={i} className="text-xs font-semibold text-slate-400">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {calendarDays.map((d, i) => (
                  <div
                    key={i}
                    className={`h-12 flex flex-col items-center justify-center ${d.prev ? "opacity-30" : ""} ${d.selected ? "bg-primary text-white rounded-lg font-bold" : ""}`}
                  >
                    <span className={`z-10 ${d.highlight ? "text-primary font-bold" : ""}`}>{d.day}</span>
                    {d.dot && <div className="calendar-dot bg-primary" />}
                  </div>
                ))}
              </div>
            </section>

            <div className="p-4">
              {/* Auto-Reminder Toggle */}
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">psychology</span>
                  <div>
                    <p className="font-bold text-sm">Auto-Reminder</p>
                    <p className="text-xs text-slate-500">Let AI predict your next service</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReminder}
                    onChange={(e) => setAutoReminder(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>

              <h3 className="text-base font-bold mb-4">Upcoming Predictions</h3>
              {predictions.length === 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-500">
                  No reminders yet. Book a service to get AI predictions.
                </div>
              )}
              {predictions.map((p, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mb-4">
                  <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url('${p.img}')` }} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${p.tagColor}`}>{p.tag}</span>
                      <span className="text-xs text-slate-500">{p.date}</span>
                    </div>
                    <h4 className="text-lg font-bold mb-1">{p.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{p.desc}</p>
                    <div className="flex gap-2">
                      <Link href="/booking" className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-bold shadow-md shadow-primary/20 text-center">
                        Schedule Now
                      </Link>
                      <button className="px-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">more_horiz</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 pb-6 pt-3 flex justify-between items-center z-50">
            <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-400">
              <span className="material-symbols-outlined">home</span>
              <span className="text-[10px] font-medium">Home</span>
            </Link>
            <Link href="/history" className="flex flex-col items-center gap-1 text-slate-400">
              <span className="material-symbols-outlined">calendar_month</span>
              <span className="text-[10px] font-medium">Schedule</span>
            </Link>
            <div className="flex flex-col items-center gap-1 text-primary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
              <span className="text-[10px] font-medium">Reminders</span>
            </div>
            <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-400">
              <span className="material-symbols-outlined">person</span>
              <span className="text-[10px] font-medium">Profile</span>
            </Link>
          </nav>
        </div>
      </MobileFrame>
    </div>
  );
}
