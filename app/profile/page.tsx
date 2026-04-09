"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("User");

  useEffect(() => {
    async function loadUser() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setEmail(user.email ?? "");
      setName(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "User");
    }
    loadUser();
  }, [router]);

  async function handleSignOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const menuItems = [
    { icon: "history", label: "Service History", href: "/history" },
    { icon: "notifications", label: "Reminders", href: "/reminders" },
    { icon: "group", label: "Referrals & Trust", href: "/referrals" },
    { icon: "receipt_long", label: "Pricing & Payments", href: "/pricing" },
    { icon: "support_agent", label: "Support", href: "/support" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex min-h-screen flex-col bg-background-light dark:bg-background-dark">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 p-6 pb-8">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                {name[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold">{name}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{email}</p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="flex flex-col flex-1 px-4 py-6 gap-3 pb-24">
            {menuItems.map(({ icon, label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{icon}</span>
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-medium">{label}</span>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </Link>
            ))}

            <button
              onClick={handleSignOut}
              className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/20 shadow-sm mt-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                  <span className="material-symbols-outlined">logout</span>
                </div>
                <span className="text-red-500 font-medium">Sign Out</span>
              </div>
            </button>
          </div>

          <BottomNav variant="user" active="profile" />
        </div>
      </MobileFrame>
    </div>
  );
}
