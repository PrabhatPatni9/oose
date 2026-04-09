"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import { getSupabase } from "@/lib/supabase";

interface Ticket {
  id: number;
  description: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  async function updateTicketStatus(id: number, status: "open" | "in_progress" | "resolved") {
    const supabase = getSupabase();
    await supabase.from("issued_reports").update({ status }).eq("id", id);
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  useEffect(() => {
    async function loadAdminData() {
      const supabase = getSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }
      const role = auth.user.user_metadata?.role;
      if (role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const { data } = await supabase
        .from("issued_reports")
        .select("id, description, status, created_at")
        .order("created_at", { ascending: false });
      setTickets((data as Ticket[] | null) ?? []);
    }
    loadAdminData();
  }, [router]);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="min-h-screen p-4 pb-10">
          <header className="mb-4">
            <h1 className="text-xl font-bold">Admin Operations</h1>
            <p className="text-sm text-slate-500">Live ticket visibility and status tracking</p>
          </header>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-center">
              <p className="text-xs text-slate-500">Open</p>
              <p className="text-xl font-bold text-red-500">{openCount}</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-center">
              <p className="text-xs text-slate-500">In Progress</p>
              <p className="text-xl font-bold text-amber-500">{inProgressCount}</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-center">
              <p className="text-xs text-slate-500">Resolved</p>
              <p className="text-xl font-bold text-green-500">{resolvedCount}</p>
            </div>
          </div>

          <section className="space-y-3">
            {tickets.length === 0 && (
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500">
                No tickets raised yet.
              </div>
            )}
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex justify-between mb-2">
                  <p className="font-semibold">Ticket #{ticket.id}</p>
                  <span className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary uppercase font-bold">
                    {ticket.status}
                  </span>
                </div>
                <p className="text-sm">{ticket.description}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                    className="text-xs px-3 py-1 rounded bg-amber-100 text-amber-700 font-semibold"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => updateTicketStatus(ticket.id, "resolved")}
                    className="text-xs px-3 py-1 rounded bg-green-100 text-green-700 font-semibold"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      </MobileFrame>
    </div>
  );
}
