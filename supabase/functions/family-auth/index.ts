// Username/password auth that bypasses Supabase's disabled email provider.
// signup: admin.createUser → generateLink(magiclink) → return token_hash
// signin: verify password against auth.users.encrypted_password with bcrypt →
//         generateLink(magiclink) → return token_hash
// Client then calls supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
// which mints a real session without hitting the email-provider gate.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const USERNAME_DOMAIN = "users.freshtrack.app";
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;

const usernameToEmail = (u: string) =>
  `${u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${USERNAME_DOMAIN}`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { action, username, password } = (await req.json()) as {
      action?: "signup" | "signin";
      username?: string;
      password?: string;
    };

    const cleanUsername = username?.trim() ?? "";
    if (!USERNAME_REGEX.test(cleanUsername)) {
      return json({ error: "Username must be 3–30 letters, numbers, dot, dash or underscore" }, 400);
    }
    if (!password || password.length < 6 || password.length > 72) {
      return json({ error: "Password must be 6–72 characters" }, 400);
    }
    if (action !== "signup" && action !== "signin") {
      return json({ error: "Invalid action" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Auth is not configured" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "auth" as never },
    });
    // Separate client pinned to the public schema for admin.* APIs.
    const adminPublic = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = usernameToEmail(cleanUsername);

    if (action === "signup") {
      const { error } = await adminPublic.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: cleanUsername },
      });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
          return json({ error: "That username is already taken — try another." }, 409);
        }
        console.error("createUser error:", error);
        return json({ error: error.message }, 400);
      }
    } else {
      // signin → verify password against bcrypt hash in auth.users
      const { data: row, error: qErr } = await admin
        .from("users")
        .select("encrypted_password")
        .eq("email", email)
        .maybeSingle();

      if (qErr) {
        console.error("auth.users query error:", qErr);
        return json({ error: "Could not look up account" }, 500);
      }
      if (!row?.encrypted_password) {
        return json({ error: "Username or password is incorrect" }, 401);
      }
      const ok = await bcrypt.compare(password, row.encrypted_password);
      if (!ok) {
        return json({ error: "Username or password is incorrect" }, 401);
      }
    }

    // Mint a magiclink → extract token_hash for client-side verifyOtp.
    const { data: linkData, error: linkErr } = await adminPublic.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkErr || !linkData) {
      console.error("generateLink error:", linkErr);
      return json({ error: linkErr?.message || "Could not start session" }, 500);
    }

    const tokenHash =
      (linkData as { properties?: { hashed_token?: string } }).properties?.hashed_token;
    if (!tokenHash) {
      return json({ error: "Session token missing" }, 500);
    }

    return json({ email, token_hash: tokenHash });
  } catch (err) {
    console.error("family-auth error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
