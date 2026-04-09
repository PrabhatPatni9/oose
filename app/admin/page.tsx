"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import { getSupabase } from "@/lib/supabase";
import { fetchAdminSnapshot } from "@/lib/adminSnapshotClient";
import { resolveSessionRole } from "@/lib/roleRoutes";

type Tab = "overview" | "tickets" | "users" | "providers" | "bookings" | "referrals";

interface Ticket {
  id: number;
  description: string;
  status: string;
  created_at: string;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface ProviderRow {
  id: number;
  user_id: string;
  skills: string;
  rating: number;
  users: { name: string; email: string } | null;
}

interface AdminBooking {
  id: number;
  status: string;
  scheduled_time: string;
  services: { name: string } | null;
  users: { name: string; email: string } | null;
}

interface AdminReferral {
  id: number;
  referrer_id: string;
  referee_id: string | null;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [referrals, setReferrals] = useState<AdminReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadNote, setLoadNote] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const supabase = getSupabase();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }

    const role = await resolveSessionRole(supabase, auth.user);
    if (role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    setLoadNote(null);

    const snap = await fetchAdminSnapshot(supabase);
    if (snap.ok && Array.isArray(snap.data.tickets) && snap.data.error == null) {
      setTickets((snap.data.tickets as Ticket[]) ?? []);
      setUsers((snap.data.users as AppUser[]) ?? []);
      setProviders((snap.data.providers as ProviderRow[]) ?? []);
      setBookings((snap.data.bookings as AdminBooking[]) ?? []);
      setReferrals((snap.data.referrals as AdminReferral[]) ?? []);
      const errs = snap.data.errors;
      if (errs && Object.values(errs).some(Boolean)) {
        setLoadNote(`Edge snapshot partial: ${JSON.stringify(errs)}`);
      }
      setLoading(false);
      return;
    }

    setLoadNote(
      snap.ok ? "Snapshot malformed; using direct queries." : `admin-snapshot unavailable (${snap.error}). Using direct queries.`,
    );

    const [tRes, uRes, pRes, bRes, rRes] = await Promise.all([
      supabase.from("issued_reports").select("id, description, status, created_at").order("created_at", { ascending: false }),
      supabase.from("users").select("id, name, email, role, created_at").order("created_at", { ascending: false }),
      supabase.from("service_providers").select("id, user_id, skills, rating, users(name, email)").order("id", { ascending: true }),
      supabase
        .from("bookings")
        .select("id, status, scheduled_time, services(name), users(name, email)")
        .order("scheduled_time", { ascending: false })
        .limit(40),
      supabase.from("referrals").select("id, referrer_id, referee_id, created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    setTickets((tRes.data as Ticket[] | null) ?? []);
    setUsers((uRes.data as AppUser[] | null) ?? []);
    setProviders((pRes.data as ProviderRow[] | null) ?? []);
    setBookings((bRes.data as AdminBooking[] | null) ?? []);
    setReferrals((rRes.data as AdminReferral[] | null) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAll();
    });
  }, [loadAll]);

  async function updateTicketStatus(id: number, status: "open" | "in_progress" | "resolved") {
    const supabase = getSupabase();
    await supabase.from("issued_reports").update({ status }).eq("id", id);
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  async function updateUserRole(id: string, role: string) {
    const supabase = getSupabase();
    await supabase.from("users").update({ role }).eq("id", id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  async function updateProvider(id: number, patch: { skills?: string; rating?: number }) {
    const supabase = getSupabase();
    await supabase.from("service_providers").update(patch).eq("id", id);
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function signOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tickets", label: "Tickets" },
    { id: "users", label: "Users" },
    { id: "providers", label: "Providers" },
    { id: "bookings", label: "Bookings" },
    { id: "referrals", label: "Referrals" },
  ];

  function userLabel(id: string | null) {
    if (!id) return "—";
    const u = users.find((x) => x.id === id);
    return u ? `${u.name || u.email}`.trim() || id.slice(0, 8) : id.slice(0, 8);
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="min-h-screen flex flex-col pb-6">
          <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Admin console</h1>
                <p className="text-xs text-slate-500">Users, providers, tickets, bookings, referrals</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadAll()}
                  className="text-xs font-semibold text-primary px-3 py-2 rounded-lg bg-primary/10"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Sign out
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${
                    tab === t.id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </header>

          <main className="flex-1 px-4 pt-4 space-y-4">
            {loadNote && (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">{loadNote}</p>
            )}
            {loading && <p className="text-sm text-slate-500">Loading…</p>}

            {tab === "overview" && !loading && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs text-slate-500">Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs text-slate-500">Providers</p>
                    <p className="text-2xl font-bold">{providers.length}</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs text-slate-500">Open tickets</p>
                    <p className="text-2xl font-bold text-red-500">{openCount}</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs text-slate-500">Bookings (loaded)</p>
                    <p className="text-2xl font-bold">{bookings.length}</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs text-slate-500">Referrals</p>
                    <p className="text-2xl font-bold">{referrals.length}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 text-sm text-slate-600 dark:text-slate-400">
                  Data loads via the <code className="text-xs">admin-snapshot</code> Edge Function when deployed; otherwise the app falls back to direct queries with admin RLS.
                </div>
              </>
            )}

            {tab === "tickets" && !loading && (
              <section className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 py-2 font-bold">Open {openCount}</div>
                  <div className="rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 py-2 font-bold">
                    Active {inProgressCount}
                  </div>
                  <div className="rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 py-2 font-bold">
                    Done {resolvedCount}
                  </div>
                </div>
                {tickets.length === 0 && (
                  <p className="text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    No tickets yet.
                  </p>
                )}
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"
                  >
                    <div className="flex justify-between gap-2 mb-2">
                      <p className="font-semibold">#{ticket.id}</p>
                      <span className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary uppercase font-bold">{ticket.status}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{ticket.description}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(ticket.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateTicketStatus(ticket.id, "in_progress")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-semibold"
                      >
                        In progress
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTicketStatus(ticket.id, "resolved")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-800 font-semibold"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTicketStatus(ticket.id, "open")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold"
                      >
                        Reopen
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {tab === "users" && !loading && (
              <section className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{u.name || "—"}</p>
                    <p className="text-xs text-slate-500 break-all">{u.email}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono truncate" title={u.id}>
                      {u.id}
                    </p>
                    <label className="flex items-center gap-2 mt-3 text-sm">
                      <span className="text-slate-500">Role</span>
                      <select
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                      >
                        <option value="user">user</option>
                        <option value="provider">provider</option>
                        <option value="admin">admin</option>
                      </select>
                    </label>
                  </div>
                ))}
              </section>
            )}

            {tab === "providers" && !loading && (
              <section className="space-y-4">
                {providers.map((p) => (
                  <div key={p.id} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                    <p className="font-bold">{p.users?.name ?? "Provider"}</p>
                    <p className="text-xs text-slate-500 break-all">{p.users?.email}</p>
                    <label className="block text-xs text-slate-500">
                      Skills
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                        value={p.skills}
                        onChange={(e) => setProviders((prev) => prev.map((x) => (x.id === p.id ? { ...x, skills: e.target.value } : x)))}
                        onBlur={() => updateProvider(p.id, { skills: p.skills })}
                      />
                    </label>
                    <label className="block text-xs text-slate-500">
                      Rating (0–5)
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                        value={p.rating}
                        onChange={(e) =>
                          setProviders((prev) =>
                            prev.map((x) => (x.id === p.id ? { ...x, rating: parseFloat(e.target.value) || 0 } : x)),
                          )
                        }
                        onBlur={() => updateProvider(p.id, { rating: p.rating })}
                      />
                    </label>
                  </div>
                ))}
              </section>
            )}

            {tab === "bookings" && !loading && (
              <section className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{b.services?.name ?? "Service"}</p>
                        <p className="text-xs text-slate-500">
                          {b.users?.name} • {b.users?.email}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(b.scheduled_time).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 shrink-0">
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {tab === "referrals" && !loading && (
              <section className="space-y-3">
                {referrals.length === 0 && (
                  <p className="text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    No referral rows yet.
                  </p>
                )}
                {referrals.map((r) => (
                  <div key={r.id} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">Referral #{r.id}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Referrer: <span className="font-mono">{userLabel(r.referrer_id)}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Referee: <span className="font-mono">{userLabel(r.referee_id)}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </section>
            )}
          </main>
        </div>
      </MobileFrame>
    </div>
  );
}
