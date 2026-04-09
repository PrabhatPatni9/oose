"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import { getSupabase } from "@/lib/supabase";
import { fallbackServices, ServiceItem, uniqueCategories } from "@/lib/serviceCatalog";

type TimeWindow = "morning" | "afternoon" | "evening";

export default function BookingPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>(fallbackServices);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedServiceId, setSelectedServiceId] = useState<number>(fallbackServices[0].id);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("morning");
  const [duration, setDuration] = useState(4.5);
  const [addons, setAddons] = useState({ duct: true, windows: false, soap: false });
  const [loading, setLoading] = useState(false);

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
  const addonCost = (addons.duct ? 45 : 0) + (addons.windows ? 20 : 0) + (addons.soap ? 10 : 0);
  const total = basePrice + addonCost;
  const discounted = total - 19.5;
  const categories = useMemo(() => ["All", ...uniqueCategories(services)], [services]);
  const visibleServices = useMemo(
    () => (selectedCategory === "All" ? services : services.filter((s) => s.category === selectedCategory)),
    [selectedCategory, services],
  );
  const dateOptions = useMemo(() => {
    return Array.from({ length: 14 }).map((_, idx) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + idx);
      return d;
    });
  }, []);

  async function handleConfirm() {
    setLoading(true);
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const scheduledTime = new Date(selectedDate);
    scheduledTime.setHours(timeWindow === "morning" ? 10 : timeWindow === "afternoon" ? 13 : 17, 0, 0, 0);

    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      service_id: selectedServiceId,
      scheduled_time: scheduledTime.toISOString(),
      status: "pending",
    });

    setLoading(false);
    if (!error) {
      router.push("/pricing");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex flex-col h-auto min-h-screen bg-background-light dark:bg-background-dark overflow-x-hidden pb-32">
          {/* Top App Bar */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-4 pb-2 justify-between sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
            <button
              className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center cursor-pointer"
              onClick={() => router.back()}
            >
              <span className="material-symbols-outlined">arrow_back_ios</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
              Booking Details
            </h2>
          </div>

          {/* Service Summary */}
          <div className="p-4">
            <div className="flex flex-col items-stretch justify-start rounded-xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-800">
              <div
                className="w-full bg-center bg-no-repeat aspect-video bg-cover"
                style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAacX2P-KKwUE4_kGJ0SroeXhru5STiYNRrFQUi0dg0YWFbL9BB2Wlo7w1gZRfU6yrqd7lBQ6RgXmhtz5XZwQq-glyo8toaboCGDJvEetm8NzjyOJDs613LSPxvBaJAQ4jJFofpIWTuPrunlLbf-nh8G_4orMdRlw1PM8lS1xok8qQ4hCiVNgfrG_WryAj3iO0L94rfwm8sB0VzFK8-WsvBxdTXQU6ijFzla2euPNVO246vdMXsikaT-u3EuMMKBhVRvjIktC8dUW11")` }}
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

          {/* Service Type */}
          <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-2">
            Service Type
          </h3>
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap ${
                  selectedCategory === category ? "bg-primary text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="px-4 grid grid-cols-1 gap-2">
            {visibleServices.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedServiceId(service.id)}
                className={`w-full rounded-xl p-3 border text-left ${
                  selectedServiceId === service.id
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <p className="font-bold text-sm">{service.name}</p>
                <p className="text-xs text-slate-500">{service.category} • ${service.base_price.toFixed(2)}</p>
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
            Select Date
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6 p-4">
            <div className="flex min-w-full flex-col gap-0.5 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center p-1 justify-between mb-2">
                <button className="text-slate-900 dark:text-slate-100">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight flex-1 text-center">
                  {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
                <button className="text-slate-900 dark:text-slate-100">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 text-center">
                {["S","M","T","W","T","F","S"].map((d, i) => (
                  <p key={i} className="text-slate-400 text-[13px] font-bold h-10 flex items-center justify-center">{d}</p>
                ))}
                {dateOptions.map((date) => (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className="h-10 w-full text-sm font-medium"
                  >
                    <div className={`flex size-full items-center justify-center rounded-full ${
                      selectedDate.toDateString() === date.toDateString()
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "text-slate-900 dark:text-slate-100"
                    }`}>
                      {date.getDate()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time Window */}
          <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
            Time Window
          </h3>
          <div className="px-4 py-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button
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

          {/* Duration */}
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
            <div className="flex justify-between mt-3 px-1">
              {["2h","4h","6h","8h"].map(l => (
                <span key={l} className="text-[10px] text-slate-400">{l}</span>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-6">
            Popular Add-ons
          </h3>
          <div className="px-4 flex flex-col gap-2">
            {[
              { key: "duct" as const, icon: "wind_power", label: "AC Duct Cleaning", price: "+$45.00" },
              { key: "windows" as const, icon: "window", label: "Exterior Windows", price: "+$20.00" },
              { key: "soap" as const, icon: "sanitizer", label: "Eco-Friendly Soap", price: "+$10.00" },
            ].map(({ key, icon, label, price }) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">{icon}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-xs text-slate-500">{price}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={addons[key]}
                  onChange={(e) => setAddons({ ...addons, [key]: e.target.checked })}
                  className="size-6 rounded-md border-slate-300 accent-primary"
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 pb-8 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Pricing Breakdown</span>
                <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 line-through text-xs mr-2">${total.toFixed(2)}</span>
                <span className="text-slate-900 dark:text-slate-100 text-xl font-bold">${discounted.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? "Confirming..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      </MobileFrame>
    </div>
  );
}
