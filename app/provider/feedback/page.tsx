"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";
import { ensureProviderProfile } from "@/lib/provider";

interface FeedbackItem {
  id: number;
  description: string;
  status: string;
  created_at: string;
}

export default function ProviderFeedbackPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }
      // Feedback source: reports linked to provider bookings.
      const providerId = await ensureProviderProfile(supabase, auth.user.id);
      if (!providerId) return;

      const { data: bookingIds } = await supabase
        .from("bookings")
        .select("id")
        .eq("provider_id", providerId);
      const ids = (bookingIds ?? []).map((b) => b.id);
      if (ids.length === 0) {
        setItems([]);
        return;
      }

      const { data } = await supabase
        .from("issued_reports")
        .select("id, description, status, created_at")
        .in("booking_id", ids)
        .order("created_at", { ascending: false });
      setItems((data as FeedbackItem[] | null) ?? []);
    }
    loadData();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="min-h-screen pb-28">
          <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <h1 className="text-lg font-bold">Customer Feedback & Issues</h1>
            <p className="text-xs text-slate-500">Dynamic tickets raised for your jobs</p>
          </header>
          <main className="p-4">
            {items.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500">
                No feedback or issue reports yet.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">Ticket #{item.id}</p>
                      <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary uppercase font-bold">{item.status}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.description}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
        <BottomNav variant="provider" active="feedback" />
      </MobileFrame>
    </div>
  );
}
