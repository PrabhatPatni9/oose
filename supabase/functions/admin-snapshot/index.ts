import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const svc = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profErr } = await svc.from("users").select("role").eq("id", user.id).maybeSingle();
    if (profErr || profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const [tRes, uRes, pRes, bRes, rRes] = await Promise.all([
      svc.from("issued_reports").select("id, description, status, created_at").order("created_at", { ascending: false }),
      svc.from("users").select("id, name, email, role, created_at").order("created_at", { ascending: false }),
      svc.from("service_providers").select("id, user_id, skills, rating, users(name, email)").order("id", { ascending: true }),
      svc
        .from("bookings")
        .select("id, status, scheduled_time, services(name), users(name, email)")
        .order("scheduled_time", { ascending: false })
        .limit(80),
      svc.from("referrals").select("id, referrer_id, referee_id, created_at").order("created_at", { ascending: false }).limit(200),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        tickets: tRes.data ?? [],
        users: uRes.data ?? [],
        providers: pRes.data ?? [],
        bookings: bRes.data ?? [],
        referrals: rRes.data ?? [],
        errors: {
          tickets: tRes.error?.message ?? null,
          users: uRes.error?.message ?? null,
          providers: pRes.error?.message ?? null,
          bookings: bRes.error?.message ?? null,
          referrals: rRes.error?.message ?? null,
        },
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
