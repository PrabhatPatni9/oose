"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";
import type { BookingExtras } from "@/lib/bookingExtras";
import { computeBookingPricing } from "@/lib/bookingExtras";
import { getCategoryIcon } from "@/lib/serviceCatalog";

interface PricingBooking {
  id: number;
  scheduled_time: string;
  extras: BookingExtras | null;
  services: { name: string; base_price: number; category: string } | null;
}

function isBookingExtras(x: unknown): x is BookingExtras {
  return (
    typeof x === "object" &&
    x !== null &&
    "total" in x &&
    typeof (x as BookingExtras).total === "number"
  );
}

const bookingSelectWithExtras =
  "id, scheduled_time, extras, services(name, base_price, category)";
const bookingSelectNoExtras = "id, scheduled_time, services(name, base_price, category)";

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<PricingBooking | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const loadBooking = useCallback(async () => {
    const supabase = getSupabase();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }

    setLoadError(null);

    const paramId = searchParams.get("bookingId");
    const preferredId = paramId ? parseInt(paramId, 10) : NaN;
    const hasPreferred = Number.isFinite(preferredId) && preferredId > 0;

    async function fetchOne(selectStr: string) {
      let q = supabase
        .from("bookings")
        .select(selectStr)
        .eq("user_id", auth.user!.id)
        .in("status", ["pending", "confirmed", "in_progress"]);

      if (hasPreferred) {
        q = q.eq("id", preferredId);
      } else {
        q = q.order("scheduled_time", { ascending: false }).limit(1);
      }

      return q.maybeSingle();
    }

    let { data, error } = await fetchOne(bookingSelectWithExtras);

    // If `extras` is missing or PostgREST errors on that column, retry without it.
    if (error) {
      const retry = await fetchOne(bookingSelectNoExtras);
      if (!retry.error) {
        data = retry.data;
        error = null;
      } else {
        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      console.error("pricing loadBooking:", error);
      setLoadError(error.message || "Could not load booking.");
      setBooking(null);
      return;
    }

    const row = data as {
      id: number;
      scheduled_time: string;
      extras: unknown;
      services: { name: string; base_price: number; category: string } | null;
    } | null;

    if (!row) {
      setBooking(null);
      return;
    }

    const extrasParsed = isBookingExtras(row.extras) ? row.extras : null;
    setBooking({
      id: row.id,
      scheduled_time: row.scheduled_time,
      extras: extrasParsed,
      services: row.services,
    });
  }, [router, searchParams]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const pricing = useMemo(() => {
    if (!booking?.services) return null;
    if (booking.extras) return booking.extras;
    return computeBookingPricing(booking.services.base_price, 4, {
      duct: false,
      windows: false,
      soap: false,
    });
  }, [booking]);

  const scheduledLabel = new Date(booking?.scheduled_time ?? Date.now()).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  const categoryIcon = booking?.services?.category
    ? getCategoryIcon(booking.services.category)
    : "cleaning_services";

  async function confirmPay() {
    if (!booking) return;
    setPaying(true);
    const supabase = getSupabase();
    await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);
    setPaying(false);
    router.push("/dashboard");
  }

  const lineRows = useMemo(() => {
    if (!pricing) return [];
    const rows: { label: string; sub: string; amount: string }[] = [
      {
        label: "Base service",
        sub: booking?.services?.name ?? "Service",
        amount: `$${pricing.base_price.toFixed(2)}`,
      },
      {
        label: "Duration adjustment",
        sub: `${pricing.duration_hours?.toFixed(1) ?? "—"} hours booked`,
        amount: `$${pricing.duration_charge.toFixed(2)}`,
      },
    ];
    if (pricing.addon_lines?.length) {
      pricing.addon_lines.forEach((a) => {
        rows.push({ label: a.label, sub: "Add-on", amount: `$${a.amount.toFixed(2)}` });
      });
    } else if (pricing.addons_total > 0) {
      rows.push({
        label: "Add-ons",
        sub: "Selected at booking",
        amount: `$${pricing.addons_total.toFixed(2)}`,
      });
    }
    rows.push({
      label: pricing.promo_label,
      sub: "Applied at checkout",
      amount: `-$${pricing.promo_discount.toFixed(2)}`,
    });
    rows.push({
      label: "Taxes",
      sub: `VAT ${(pricing.tax_rate * 100).toFixed(1)}%`,
      amount: `$${pricing.tax_amount.toFixed(2)}`,
    });
    return rows;
  }, [pricing, booking?.services?.name]);

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex min-h-screen flex-col bg-white dark:bg-background-dark overflow-x-hidden border-x border-slate-200 dark:border-slate-800 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="sticky top-0 z-10 flex items-center bg-white/90 dark:bg-background-dark/90 backdrop-blur-md p-4 justify-between border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
              Pricing Breakdown
            </h2>
          </div>

          <div className="flex-1 px-5 py-5">
            {loadError && (
              <p className="text-red-500 text-sm mb-3" role="alert">
                {loadError}
              </p>
            )}
            {!booking && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 text-sm text-slate-600 dark:text-slate-400">
                No active booking found.{" "}
                <button type="button" className="text-primary font-semibold" onClick={() => router.push("/booking")}>
                  Book a service
                </button>
              </div>
            )}

            {booking && (
              <>
                <div className="mb-6 flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="size-12 rounded-lg bg-primary flex items-center justify-center text-white">
                    <span className="material-symbols-outlined">{categoryIcon}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{booking.services?.name ?? "Service"}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Scheduled for {scheduledLabel}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Booking #{booking.id}</p>
                  </div>
                </div>

                <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight mb-3">
                  Service summary
                </h2>

                <div className="space-y-0 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {lineRows.map(({ label, sub, amount }) => (
                    <div
                      key={`${label}-${sub}`}
                      className="flex justify-between items-center py-3.5 px-3 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 bg-white dark:bg-slate-900/40"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{label}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{sub}</span>
                      </div>
                      <p className="text-slate-900 dark:text-white text-sm font-semibold text-right shrink-0">{amount}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex gap-3">
                  <span className="material-symbols-outlined text-primary text-xl shrink-0">info</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Totals match what you selected on the booking screen (base, duration, add-ons, promo, tax). After you
                    confirm payment, your booking moves to confirmed so providers can see it.
                  </p>
                </div>
              </>
            )}
          </div>

          {booking && pricing && (
            <div className="mt-auto border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-background-dark px-5 pt-4 pb-2">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                    Total amount
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-400 line-through text-lg">${pricing.subtotal.toFixed(2)}</span>
                    <h1 className="text-3xl font-extrabold text-primary leading-none">${pricing.total.toFixed(2)}</h1>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">After promo &amp; tax</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Price locked
                </span>
              </div>
              <button
                type="button"
                onClick={confirmPay}
                disabled={paying}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {paying ? "Processing..." : "Confirm & Pay"}
              </button>
            </div>
          )}

          <BottomNav variant="user" active="pricing" />
        </div>
      </MobileFrame>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-500 text-sm">
          Loading…
        </div>
      }
    >
      <PricingPageContent />
    </Suspense>
  );
}
