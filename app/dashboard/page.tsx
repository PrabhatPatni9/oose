"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";
import { fallbackServices, getCategoryIcon, uniqueCategories } from "@/lib/serviceCatalog";

interface Booking {
  id: number;
  status: string;
  scheduled_time: string;
  services: { name: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Alex");
  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [categories, setCategories] = useState<{ icon: string; label: string }[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      if (user.user_metadata?.name) setUserName(user.user_metadata.name);

      const { data } = await supabase
        .from("bookings")
        .select("id, status, scheduled_time, services(name)")
        .eq("user_id", user.id)
        .in("status", ["pending", "confirmed"])
        .order("scheduled_time", { ascending: true })
        .limit(1)
        .single();
      if (data) setUpcomingBooking(data as unknown as Booking);

      const { data: serviceData } = await supabase
        .from("services")
        .select("id, name, category, base_price")
        .order("category", { ascending: true });
      const resolved = (serviceData as typeof fallbackServices | null) ?? fallbackServices;
      const computedCategories = uniqueCategories(resolved).map((category) => ({
        label: category,
        icon: getCategoryIcon(category),
      }));
      setCategories(
        computedCategories.length > 0
          ? computedCategories
          : uniqueCategories(fallbackServices).map((category) => ({
              label: category,
              icon: getCategoryIcon(category),
            })),
      );
    }
    loadData();
  }, [router]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <header className="flex items-center bg-white dark:bg-slate-900 p-4 pb-2 justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex size-12 shrink-0 items-center">
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20 bg-primary/20 flex items-center justify-center text-primary font-bold">
              {userName[0]?.toUpperCase()}
            </div>
          </div>
          <div className="flex flex-col flex-1 px-3">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{greeting}</span>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em]">
              Hello, {userName}!
            </h2>
          </div>
          <div className="flex w-12 items-center justify-end gap-2">
            <button className="flex items-center justify-center rounded-full h-10 w-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </header>

        <main className="flex-1 pb-24">
          {/* Upcoming Booking */}
          <section className="px-4 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em]">
                Upcoming Booking
              </h3>
              <Link href="/history" className="text-primary text-sm font-semibold">See All</Link>
            </div>
            {upcomingBooking ? (
              <div className="flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex flex-[1.5_1.5_0px] flex-col justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary capitalize">
                      {upcomingBooking.status}
                    </span>
                    <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight mt-1">
                      {upcomingBooking.services?.name ?? "Service"}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                      {new Date(upcomingBooking.scheduled_time).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })} • {new Date(upcomingBooking.scheduled_time).toLocaleTimeString("en-US", {
                        hour: "numeric", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Link
                    href="/booking"
                    className="mt-4 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white text-sm font-semibold leading-normal w-fit"
                  >
                    Manage
                  </Link>
                </div>
                <div
                  className="flex-1 h-28 bg-center bg-no-repeat bg-cover rounded-lg bg-primary/10"
                  style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAaHsIKcVAesX8rBWoGjvCpfsopWJ8sudWGB4XuCe66qocvo3uaMFM1s5LueWiEExaEKq8dE_u96OZZz7RAK6WeF5EaoA16Sn6jvWQHYd2LwpzdB-DHrAtgEaP4TYfV2wNV8pKfFhoqz-H7XFqTMTuW6DLMTTDe045w0LcMFzERfj_ch_znbB5nz5qnmZx72alEZVGr4du8xWihe6RAA2u8jM6qG_BHwCCCV16PSHtC60lk-zrMwOMMhTUgevMGXlF9eV78dZtZdhG8")` }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                No upcoming bookings.{" "}
                <Link href="/booking" className="ml-1 text-primary font-semibold">Book now</Link>
              </div>
            )}
          </section>

          {/* Predicted Service Banner */}
          <section className="px-4 pt-6">
            <div className="flex flex-1 flex-col items-start justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex gap-4 items-center">
                <div className="bg-primary/20 text-primary p-2 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">heat_pump</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight">
                    Next Predicted Service
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-normal leading-normal">
                    AC Servicing due in 10 days
                  </p>
                </div>
              </div>
              <Link
                href="/reminders"
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white text-sm font-semibold leading-normal"
              >
                Schedule Now
              </Link>
            </div>
          </section>

          {/* Service Categories */}
          <section className="px-4 pt-8">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] mb-4">
              Service Categories
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {(categories.length > 0
                ? categories
                : [
                    { icon: "cleaning_services", label: "Cleaning" },
                    { icon: "ac_unit", label: "AC Repair" },
                    { icon: "plumbing", label: "Plumbing" },
                    { icon: "pest_control", label: "Pest Control" },
                    { icon: "spa", label: "Beauty Services" },
                  ]
              ).map(({ icon, label }) => (
                <Link key={label} href="/booking" className="flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full aspect-square bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 group-active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs font-medium text-center leading-tight">{label}</p>
                </Link>
              ))}
            </div>
          </section>
        </main>

        <BottomNav variant="user" active="home" />
      </MobileFrame>
    </div>
  );
}
