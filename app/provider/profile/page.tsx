"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";
import { ensureProviderProfile } from "@/lib/provider";

export default function ProviderProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("Provider");
  const [email, setEmail] = useState("");
  const [skills, setSkills] = useState("");
  const [rating, setRating] = useState<number>(0);

  useEffect(() => {
    async function loadProfile() {
      const supabase = getSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }
      setEmail(auth.user.email ?? "");
      setName(auth.user.user_metadata?.name ?? "Provider");

      const providerId = await ensureProviderProfile(supabase, auth.user.id);
      if (!providerId) return;
      const { data: providerData } = await supabase
        .from("service_providers")
        .select("skills, rating")
        .eq("id", providerId)
        .single();
      if (providerData) {
        setSkills(providerData.skills ?? "");
        setRating(providerData.rating ?? 0);
      }
    }
    loadProfile();
  }, [router]);

  async function signOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="min-h-screen pb-28 p-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-full bg-primary text-white font-bold flex items-center justify-center">
                {name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{name}</p>
                <p className="text-xs text-slate-500">{email}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-slate-500">Skills:</span> {skills || "Not set"}</p>
              <p><span className="text-slate-500">Rating:</span> {rating.toFixed(1)} / 5</p>
            </div>
            <button
              onClick={signOut}
              className="mt-4 w-full rounded-lg bg-red-500 text-white py-2 font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
        <BottomNav variant="provider" active="profile" />
      </MobileFrame>
    </div>
  );
}
