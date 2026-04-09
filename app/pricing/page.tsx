"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";

interface PricingBooking {
  id: number;
  scheduled_time: string;
  services: { name: string; base_price: number } | null;
}

export default function PricingPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<PricingBooking | null>(null);

  useEffect(() => {
    async function loadPricing() {
      const supabase = getSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("bookings")
        .select("id, scheduled_time, services(name, base_price)")
        .eq("user_id", auth.user.id)
        .in("status", ["pending", "confirmed", "in_progress"])
        .order("scheduled_time", { ascending: true })
        .limit(1)
        .single();
      setBooking((data as PricingBooking | null) ?? null);
    }
    loadPricing();
  }, [router]);

  const base = booking?.services?.base_price ?? 0;
  const durationCharge = Math.max(0, base * 0.2);
  const addons = Math.max(0, base * 0.1);
  const taxes = (base + durationCharge + addons) * 0.085;
  const total = useMemo(() => base + durationCharge + addons + taxes, [base, durationCharge, addons, taxes]);
  const scheduledLabel = new Date(booking?.scheduled_time ?? new Date().toISOString()).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const lineItems = [
    { label: "Base Service Cost", sub: booking?.services?.name ?? "Service", amount: `$${base.toFixed(2)}` },
    { label: "Duration-based Charge", sub: "Estimated workload adjustment", amount: `$${durationCharge.toFixed(2)}` },
    { label: "Add-ons Subtotal", sub: "Standard supplies and handling", amount: `$${addons.toFixed(2)}` },
    { label: "Taxes", sub: "VAT 8.5%", amount: `$${taxes.toFixed(2)}` },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex h-full min-h-screen flex-col bg-white dark:bg-background-dark overflow-x-hidden border-x border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-4 justify-between border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => router.back()}
              className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
              Pricing Breakdown
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 px-5 py-6">
            {/* Service Info */}
            <div className="mb-8 flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="size-12 rounded-lg bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined">cleaning_services</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{booking?.services?.name ?? "Service"}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Scheduled for {scheduledLabel}</p>
              </div>
            </div>

            <h2 className="text-slate-900 dark:text-white text-[20px] font-bold leading-tight tracking-tight mb-4">
              Service Summary
            </h2>

            {/* Itemized List */}
            <div className="space-y-1">
              {lineItems.map(({ label, sub, amount }) => (
                <div key={label} className="flex justify-between items-center py-4 border-b border-slate-100 dark:border-slate-800/50">
                  <div className="flex flex-col">
                    <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">{label}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{sub}</span>
                  </div>
                  <p className="text-slate-900 dark:text-white text-base font-semibold text-right">{amount}</p>
                </div>
              ))}
            </div>

            {/* Transparency Notice */}
            <div className="mt-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex gap-3">
              <span className="material-symbols-outlined text-primary text-xl">info</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This breakdown includes all applicable fees. No hidden charges will be added after service completion.
                You will be notified of any additional work before it begins.
              </p>
            </div>
          </div>

          {/* Bottom Total */}
          <div className="mt-auto border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-background-dark p-6 pb-2">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Total Amount</p>
                <h1 className="text-4xl font-extrabold text-primary leading-none">${total.toFixed(2)}</h1>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Price Guaranteed
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
            >
              Confirm &amp; Pay
            </button>
          </div>

          <BottomNav variant="user" active="pricing" />
        </div>
      </MobileFrame>
    </div>
  );
}
