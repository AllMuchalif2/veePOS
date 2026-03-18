import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SubmitPayload = {
  storeName?: string;
  email?: string;
  phone?: string;
  captchaToken?: string;
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    let body: SubmitPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Format payload tidak valid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const storeName = (body.storeName || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const phone = (body.phone || "").trim();
    const captchaToken = (body.captchaToken || "").trim();

    if (!storeName || !email || !phone || !captchaToken) {
      return new Response(
        JSON.stringify({ error: "storeName, email, phone, captchaToken wajib diisi" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (!email.includes("@") || storeName.length < 2 || storeName.length > 100) {
      return new Response(JSON.stringify({ error: "Data pendaftaran tidak valid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const phoneDigits = normalizePhone(phone);
    if (phoneDigits.length < 8 || phoneDigits.length > 20) {
      return new Response(JSON.stringify({ error: "Nomor WhatsApp tidak valid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
    if (!turnstileSecret) {
      return new Response(JSON.stringify({ error: "Captcha belum dikonfigurasi di server" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const remoteIp = forwardedFor.split(",")[0]?.trim();

    const verifyBody = new URLSearchParams();
    verifyBody.set("secret", turnstileSecret);
    verifyBody.set("response", captchaToken);
    if (remoteIp) verifyBody.set("remoteip", remoteIp);

    const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyBody,
    });

    const turnstileJson = await turnstileRes.json();
    if (!turnstileJson?.success) {
      return new Response(JSON.stringify({ error: "Captcha tidak valid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { count: emailRecentCount, error: emailCountErr } = await supabaseAdmin
      .from("tenant_registrations")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

    if (emailCountErr) throw emailCountErr;

    const { data: phoneRecentRows, error: phoneCountErr } = await supabaseAdmin
      .from("tenant_registrations")
      .select("phone,created_at")
      .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

    if (phoneCountErr) throw phoneCountErr;

    const phoneRecentCount = (phoneRecentRows || []).filter(
      (row: { phone: string | null }) => normalizePhone(row.phone || "") === phoneDigits,
    ).length;

    if ((emailRecentCount || 0) >= 3 || phoneRecentCount >= 3) {
      return new Response(JSON.stringify({ error: "Terlalu banyak percobaan. Coba lagi nanti." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const { count: pendingEmailCount, error: pendingEmailErr } = await supabaseAdmin
      .from("tenant_registrations")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("status", "pending");

    if (pendingEmailErr) throw pendingEmailErr;

    const { data: pendingPhoneRows, error: pendingPhoneErr } = await supabaseAdmin
      .from("tenant_registrations")
      .select("phone,status")
      .eq("status", "pending");

    if (pendingPhoneErr) throw pendingPhoneErr;

    const pendingPhoneCount = (pendingPhoneRows || []).filter(
      (row: { phone: string | null }) => normalizePhone(row.phone || "") === phoneDigits,
    ).length;

    if ((pendingEmailCount || 0) > 0 || pendingPhoneCount > 0) {
      return new Response(
        JSON.stringify({ error: "Nomor/email sudah memiliki pendaftaran yang masih pending" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        },
      );
    }

    const { count: globalCount, error: globalErr } = await supabaseAdmin
      .from("tenant_registrations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString());

    if (globalErr) throw globalErr;

    if ((globalCount || 0) >= 120) {
      return new Response(JSON.stringify({ error: "Lalu lintas sedang tinggi. Coba lagi nanti." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const { error: insertErr } = await supabaseAdmin.from("tenant_registrations").insert({
      store_name: storeName,
      email,
      phone,
      status: "pending",
    });

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error submit-tenant-registration:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
