import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_INTERVAL_DAYS: Record<string, number> = {
  Cleaning: 90,
  "AC Repair": 120,
  Plumbing: 150,
  "Pest Control": 90,
  Beauty: 45,
  "Beauty Services": 45,
};

function intervalDays(category: string) {
  return CATEGORY_INTERVAL_DAYS[category] ?? 90;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin.from("users").select("preferences").eq("id", user.id).maybeSingle();
    const prefs = profile?.preferences as { auto_reminders?: boolean } | undefined;
    if (prefs && prefs.auto_reminders === false) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "auto_reminders_disabled" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: bookingIds } = await admin.from("bookings").select("id").eq("user_id", user.id);
    const ids = (bookingIds ?? []).map((b) => b.id);

    const { data: completedBookings } = await admin
      .from("bookings")
      .select("scheduled_time, service_id, services(category, name)")
      .eq("user_id", user.id)
      .eq("status", "completed");

    let historyRows: {
      completion_date: string;
      bookings: { service_id: number | null; services: { category: string; name: string } | null } | null;
    }[] = [];

    if (ids.length > 0) {
      const { data: hist } = await admin
        .from("service_history")
        .select("completion_date, bookings(service_id, services(category, name))")
        .in("booking_id", ids);
      historyRows = (hist ?? []) as typeof historyRows;
    }

    type Agg = { category: string; serviceId: number; last: Date; name: string };
    const byCategory = new Map<string, Agg>();

    const bump = (serviceId: number | null | undefined, category: string, name: string, at: Date) => {
      if (!serviceId) return;
      const key = category || "General";
      const cur = byCategory.get(key);
      if (!cur || at > cur.last) {
        byCategory.set(key, { category: key, serviceId, last: at, name });
      }
    };

    for (const b of completedBookings ?? []) {
      const row = b as {
        scheduled_time: string;
        service_id: number | null;
        services: { category: string; name: string } | null;
      };
      const cat = row.services?.category ?? "General";
      const name = row.services?.name ?? "Service";
      if (row.scheduled_time) bump(row.service_id, cat, name, new Date(row.scheduled_time));
    }

    for (const row of historyRows) {
      const b = row.bookings;
      if (!row.completion_date || !b) continue;
      const cat = b.services?.category ?? "General";
      const name = b.services?.name ?? "Service";
      bump(b.service_id, cat, name, new Date(row.completion_date));
    }

    await admin.from("reminders").delete().eq("user_id", user.id).eq("source", "predicted");

    const inserts: Record<string, unknown>[] = [];
    for (const agg of byCategory.values()) {
      const days = intervalDays(agg.category);
      const next = new Date(agg.last);
      next.setDate(next.getDate() + days);
      const explanation =
        `Your last ${agg.name} (${agg.category}) was on ${agg.last.toDateString()}. ` +
        `For this category we suggest maintenance about every ${days} days, so the next ideal window is ${next.toDateString()}.`;

      inserts.push({
        user_id: user.id,
        booking_id: null,
        service_id: agg.serviceId,
        reminder_date: next.toISOString(),
        source: "predicted",
        prediction_meta: {
          reason: "usage_interval",
          category: agg.category,
          interval_days: days,
          last_service_at: agg.last.toISOString(),
          confidence: days <= 90 ? "high" : "medium",
          explanation,
        },
      });
    }

    if (inserts.length > 0) {
      const { error: insErr } = await admin.from("reminders").insert(inserts);
      if (insErr) throw insErr;
    }

    return new Response(
      JSON.stringify({ ok: true, predictions_created: inserts.length }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
