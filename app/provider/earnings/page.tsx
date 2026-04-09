"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";
import { ensureProviderProfile } from "@/lib/provider";

interface EarningBooking {
  id: number;
  scheduled_time: string;
  services: { name: string; base_price: number } | null;
}

export default function ProviderEarningsPage() {
  const router = useRouter();
  const [completedJobs, setCompletedJobs] = useState<EarningBooking[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }
      const providerId = await ensureProviderProfile(supabase, auth.user.id);
      if (!providerId) return;

      const { data } = await supabase
        .from("bookings")
        .select("id, scheduled_time, services(name, base_price)")
        .eq("provider_id", providerId)
        .eq("status", "completed")
        .order("scheduled_time", { ascending: false });
      setCompletedJobs((data as EarningBooking[] | null) ?? []);
    }
    loadData();
  }, [router]);

  const totalEarnings = useMemo(
    () => completedJobs.reduce((sum, b) => sum + (b.services?.base_price ?? 0), 0),
    [completedJobs],
  );

  const monthEarnings = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return completedJobs
      .filter((b) => {
        const d = new Date(b.scheduled_time);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + (b.services?.base_price ?? 0), 0);
  }, [completedJobs]);

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="min-h-screen pb-28">
          <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <h1 className="text-lg font-bold">Provider Earnings</h1>
            <p className="text-xs text-slate-500">Live payout view from completed jobs</p>
          </header>

          <main className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs text-slate-500">This Month</p>
                <p className="text-2xl font-bold text-primary">${monthEarnings.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Total Earnings</p>
                <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <h2 className="font-bold mb-3">Completed Jobs</h2>
              {completedJobs.length === 0 ? (
                <p className="text-sm text-slate-500">No completed jobs yet.</p>
              ) : (
                <div className="space-y-3">
                  {completedJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div>
                        <p className="font-semibold text-sm">{job.services?.name ?? "Service"}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(job.scheduled_time).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                        </p>
                      </div>
                      <p className="font-bold text-primary">${(job.services?.base_price ?? 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
        <BottomNav variant="provider" active="earnings" />
      </MobileFrame>
    </div>
  );
}
