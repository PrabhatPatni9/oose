"use client";
import Link from "next/link";

type UserNavItem = "home" | "bookings" | "support" | "profile" | "history" | "reminders" | "referrals" | "pricing";
type ProviderNavItem = "schedule" | "earnings" | "feedback" | "profile";

interface UserBottomNavProps {
  variant: "user";
  active: UserNavItem;
}

interface ProviderBottomNavProps {
  variant: "provider";
  active: ProviderNavItem;
}

type BottomNavProps = UserBottomNavProps | ProviderBottomNavProps;

export default function BottomNav(props: BottomNavProps) {
  const base = "flex flex-1 flex-col items-center justify-center gap-1";
  const active = "text-primary";
  const inactive = "text-slate-500 dark:text-slate-400";

  if (props.variant === "provider") {
    const a = props.active;
    return (
      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto flex gap-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pb-6 pt-2 z-50">
        <Link href="/provider" className={`${base} ${a === "schedule" ? active : inactive}`}>
          <div className="flex h-8 items-center justify-center">
            <span className="material-symbols-outlined">calendar_today</span>
          </div>
          <p className="text-xs font-medium leading-normal">Schedule</p>
        </Link>
        <Link href="/provider/earnings" className={`${base} ${a === "earnings" ? active : inactive}`}>
          <div className="flex h-8 items-center justify-center">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <p className="text-xs font-medium leading-normal">Earnings</p>
        </Link>
        <Link href="/provider/feedback" className={`${base} ${a === "feedback" ? active : inactive}`}>
          <div className="flex h-8 items-center justify-center">
            <span className="material-symbols-outlined">reviews</span>
          </div>
          <p className="text-xs font-medium leading-normal">Feedback</p>
        </Link>
        <Link href="/provider/profile" className={`${base} ${a === "profile" ? active : inactive}`}>
          <div className="flex h-8 items-center justify-center">
            <span className="material-symbols-outlined">person</span>
          </div>
          <p className="text-xs font-medium leading-normal">Profile</p>
        </Link>
      </nav>
    );
  }

  const a = props.active;
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto flex gap-2 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 pb-6 pt-2 z-20">
      <Link href="/dashboard" className={`${base} ${a === "home" ? active : inactive}`}>
        <div className="flex h-8 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]" style={a === "home" ? { fontVariationSettings: "'FILL' 1" } : {}}>home</span>
        </div>
        <p className={`text-xs leading-normal tracking-[0.015em] ${a === "home" ? "font-semibold" : "font-medium"}`}>Home</p>
      </Link>
      <Link href="/history" className={`${base} ${a === "bookings" || a === "history" ? active : inactive}`}>
        <div className="flex h-8 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">calendar_month</span>
        </div>
        <p className={`text-xs leading-normal tracking-[0.015em] ${a === "bookings" || a === "history" ? "font-semibold" : "font-medium"}`}>Bookings</p>
      </Link>
      <Link href="/support" className={`${base} ${a === "support" ? active : inactive}`}>
        <div className="flex h-8 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">forum</span>
        </div>
        <p className={`text-xs leading-normal tracking-[0.015em] ${a === "support" ? "font-semibold" : "font-medium"}`}>Support</p>
      </Link>
      <Link href="/profile" className={`${base} ${a === "profile" ? active : inactive}`}>
        <div className="flex h-8 items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">person</span>
        </div>
        <p className={`text-xs leading-normal tracking-[0.015em] ${a === "profile" ? "font-semibold" : "font-medium"}`}>Profile</p>
      </Link>
    </nav>
  );
}
