import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const USERNAME_DOMAIN = "users.freshtrack.app";
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;

const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${USERNAME_DOMAIN}`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { username, password } = (await req.json()) as {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Account creation is not configured yet" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = usernameToEmail(cleanUsername);
    const { error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: cleanUsername },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
        return json({ error: "That username is already taken — try another." }, 409);
      }
      console.error("create-family-account admin error:", error);
      return json({ error: error.message || "Could not create account" }, 400);
    }

    return json({ email });
  } catch (error) {
    console.error("create-family-account error:", error);
    return json({ error: "Could not create account" }, 500);
  }
});