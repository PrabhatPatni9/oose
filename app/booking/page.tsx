"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import { getSupabase } from "@/lib/supabase";
import { fallbackServices, ServiceItem, uniqueCategories } from "@/lib/serviceCatalog";
import { ADDON_CATALOG, AddonSelection, computeBookingPricing } from "@/lib/bookingExtras";

type TimeWindow = "morning" | "afternoon" | "evening";

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

export default function BookingPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>(fallbackServices);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedServiceId, setSelectedServiceId] = useState<number>(fallbackServices[0].id);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("morning");
  const [duration, setDuration] = useState(4.5);
  const [addons, setAddons] = useState<AddonSelection>({ duct: false, windows: false, soap: false });
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    async function loadServices() {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("services")
        .select("id, name, category, base_price")
        .order("category", { ascending: true });
      if (data && data.length > 0) {
        setServices(data as ServiceItem[]);
        setSelectedServiceId((data[0] as ServiceItem).id);
      }
    }
    loadServices();
  }, []);

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? services[0];
  const basePrice = selectedService?.base_price ?? 120;

  const pricing = useMemo(() => {
    const p = computeBookingPricing(basePrice, duration, addons);
    p.time_window = timeWindow;
    return p;
  }, [basePrice, duration, addons, timeWindow]);

  const categories = useMemo(() => ["All", ...uniqueCategories(services)], [services]);
  const groupedServices = useMemo(() => {
    const cats = selectedCategory === "All" ? uniqueCategories(services) : [selectedCategory];
    return cats.map((cat) => ({
      category: cat,
      items: services.filter((s) => s.category === cat),
    }));
  }, [services, selectedCategory]);

  useEffect(() => {
    const flat = groupedServices.flatMap((g) => g.items);
    if (flat.length === 0) return;
    if (!flat.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(flat[0].id);
    }
  }, [groupedServices, selectedServiceId]);

  const { year, monthIndex, daysInMonth, startWeekday } = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const sw = new Date(y, m, 1).getDay();
    return { year: y, monthIndex: m, daysInMonth: dim, startWeekday: sw };
  }, [calendarMonth]);

  const monthLabel = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  async function handleConfirm() {
    setLoading(true);
    setBookingError(null);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const scheduledTime = new Date(selectedDate);
    scheduledTime.setHours(timeWindow === "morning" ? 10 : timeWindow === "afternoon" ? 13 : 17, 0, 0, 0);

    const extras = { ...pricing, time_window: timeWindow };

    const insertRow: Record<string, unknown> = {
      user_id: user.id,
      service_id: selectedServiceId,
      scheduled_time: scheduledTime.toISOString(),
      status: "pending",
      extras,
    };

    let { error } = await supabase.from("bookings").insert(insertRow as never);
    const msg = error?.message?.toLowerCase() ?? "";
    if (error && (msg.includes("extras") || msg.includes("column") || msg.includes("schema"))) {
      const { extras: _drop, ...withoutExtras } = insertRow;
      ({ error } = await supabase.from("bookings").insert(withoutExtras as never));
    }

    setLoading(false);
    if (error) {
      setBookingError(error.message || "Could not create booking. Run latest Supabase migrations (bookings.extras).");
      return;
    }
    router.push("/pricing");
  }

  const scrollBottomPad = "pb-[calc(13rem+env(safe-area-inset-bottom,0px))]";

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div
          className={`flex flex-col min-h-screen bg-background-light dark:bg-background-dark overflow-x-hidden ${scrollBottomPad}`}
        >
          <div className="flex items-center bg-white dark:bg-slate-900 p-4 pb-2 justify-between sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => router.back()}
            >
              <span className="material-symbols-outlined">arrow_back_ios</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
              Booking Details
            </h2>
          </div>

          <div className="p-4">
            <div className="flex flex-col items-stretch justify-start rounded-xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-800">
              <div
                className="w-full bg-center bg-no-repeat aspect-video bg-cover"
                style={{
                  backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAacX2P-KKwUE4_kGJ0SroeXhru5STiYNRrFQUi0dg0YWFbL9BB2Wlo7w1gZRfU6yrqd7lBQ6RgXmhtz5XZwQq-glyo8toaboCGDJvEetm8NzjyOJDs613LSPxvBaJAQ4jJFofpIWTuPrunlLbf-nh8G_4orMdRlw1PM8lS1xok8qQ4hCiVNgfrG_WryAj3iO0L94rfwm8sB0VzFK8-WsvBxdTXQU6ijFzla2euPNVO246vdMXsikaT-u3EuMMKBhVRvjIktC8dUW11")`,
                }}
              />
              <div className="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-1 py-4 px-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em]">
                      {selectedService?.name ?? "Service"}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                      {selectedService?.category ?? "General"}
                    </p>
                  </div>
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                    HSBMS
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-2">
            Service
          </h3>
          <p className="px-4 text-xs text-slate-500 mb-2">Filter category, then pick one service from the list.</p>
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-primary text-white"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="px-4 pb-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              Choose service
            </label>
            <div className="relative">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-3.5 pl-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {groupedServices.map(({ category, items }) => (
                  <optgroup key={category} label={category}>
                    {items.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — ${s.base_price.toFixed(2)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                expand_more
              </span>
            </div>
          </div>

          <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
            Select Date
          </h3>
          <div className="px-4 pb-2">
            <div className="flex min-w-full flex-col gap-0.5 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center p-1 justify-between mb-2">
                <button
                  type="button"
                  className="text-slate-900 dark:text-slate-100 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setCalendarMonth((m) => addMonths(m, -1))}
                  aria-label="Previous month"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight flex-1 text-center">
                  {monthLabel}
                </p>
                <button
                  type="button"
                  className="text-slate-900 dark:text-slate-100 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  aria-label="Next month"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 text-center">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <p key={i} className="text-slate-400 text-[13px] font-bold h-10 flex items-center justify-center">
                    {d}
                  </p>
                ))}
                {Array.from({ length: startWeekday }).map((_, i) => (
                  <div key={`pad-${i}`} className="h-10" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const date = new Date(year, monthIndex, day);
                  const isSelected = selectedDate.toDateString() === date.toDateString();
                  const isToday = new Date().toDateString() === date.toDateString();
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className="h-10 w-full text-sm font-medium"
                    >
                      <div
                        className={`flex size-full items-center justify-center rounded-full ${
                          isSelected
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : isToday
                              ? "ring-2 ring-primary/40 text-slate-900 dark:text-slate-100"
                              : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {day}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
            Time Window
          </h3>
          <div className="px-4 py-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTimeWindow("morning")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 ${
                  timeWindow === "morning"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined mb-1">wb_sunny</span>
                <span className="font-bold text-sm">Morning</span>
                <span className="text-xs opacity-80">8:00 AM - 12:00 PM</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeWindow("afternoon")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 ${
                  timeWindow === "afternoon"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined mb-1">light_mode</span>
                <span className="font-bold text-sm">Afternoon</span>
                <span className="text-xs opacity-80">12:00 PM - 4:00 PM</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTimeWindow("evening")}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 ${
                timeWindow === "evening"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span className="material-symbols-outlined text-sm">event_repeat</span>
              <span className="font-bold text-sm">Evening / Custom Window</span>
            </button>
          </div>

          <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
            Service Duration
          </h3>
          <div className="px-4 py-4 mx-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Estimated time</span>
              <span className="text-primary text-lg font-bold">{duration} Hours</span>
            </div>
            <input
              type="range"
              min={2}
              max={8}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Extra time beyond 2h adds $10/hr (shown in your breakdown).
            </p>
            <div className="flex justify-between mt-3 px-1">
              {["2h", "4h", "6h", "8h"].map((l) => (
                <span key={l} className="text-[10px] text-slate-400">
                  {l}
                </span>
              ))}
            </div>
          </div>

          <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-6">
            Popular Add-ons
          </h3>
          <div className="px-4 flex flex-col gap-2 mb-2">
            {ADDON_CATALOG.map(({ key, icon, label, amount }) => (
              <label
                key={key}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">{icon}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-xs text-slate-500">+${amount.toFixed(2)}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={addons[key]}
                  onChange={(e) => setAddons({ ...addons, [key]: e.target.checked })}
                  className="size-6 rounded-md border-slate-300 accent-primary"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          {bookingError && (
            <p className="text-red-500 text-xs font-medium mb-2 px-0.5" role="alert">
              {bookingError}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className="flex w-full items-center justify-between mb-2 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 text-sm font-semibold">Pricing breakdown</span>
              <span className="material-symbols-outlined text-slate-500 text-sm">
                {showBreakdown ? "expand_less" : "expand_more"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 line-through text-xs mr-2">${pricing.subtotal.toFixed(2)}</span>
              <span className="text-slate-900 dark:text-slate-100 text-xl font-bold">${pricing.total.toFixed(2)}</span>
            </div>
          </button>
          {showBreakdown && (
            <div className="mb-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Base service</span>
                <span className="font-medium">${pricing.base_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration ({duration}h)</span>
                <span className="font-medium">${pricing.duration_charge.toFixed(2)}</span>
              </div>
              {pricing.addon_lines.map((a) => (
                <div key={a.key} className="flex justify-between">
                  <span className="text-slate-500">{a.label}</span>
                  <span className="font-medium">${a.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-primary">
                <span>{pricing.promo_label}</span>
                <span>-${pricing.promo_discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax ({(pricing.tax_rate * 100).toFixed(1)}%)</span>
                <span className="font-medium">${pricing.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 font-bold">
                <span>Total due</span>
                <span>${pricing.total.toFixed(2)}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loading ? "Confirming..." : "Confirm Booking"}
          </button>
        </div>
      </MobileFrame>
    </div>
  );
}
