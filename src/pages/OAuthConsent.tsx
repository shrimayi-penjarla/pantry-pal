import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Leaf, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// Beta auth.oauth namespace isn't in the generated types yet; wrap it.
type OAuthClient = { name?: string; client_uri?: string };
type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id in the request URL.");
        setChecking(false);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
        } else {
          const immediate = data?.redirect_url ?? data?.redirect_to;
          if (immediate && !data?.client) {
            window.location.href = immediate;
            return;
          }
          setDetails(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load authorization request.");
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, navigate]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) throw new Error(error.message);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error("No redirect returned by the authorization server.");
      window.location.href = target;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="max-w-md mx-auto py-10">
        <Card className="paper-card p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground italic mt-3">Loading authorization…</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-10">
        <Card className="paper-card p-8 text-center">
          <h1 className="font-display text-2xl">Couldn't load this request</h1>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </Card>
      </div>
    );
  }

  const clientName = details?.client?.name ?? "an app";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <div className="max-w-md mx-auto py-10">
      <Card className="paper-card p-7 sm:p-8 relative">
        <span className="tape" />
        <div className="text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-fresh text-primary-foreground shadow-soft mx-auto">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <p className="font-hand text-2xl text-accent mt-3">authorize a connection</p>
          <h1 className="font-display text-2xl tracking-tight mt-1">
            Connect {clientName} to FreshTrack
          </h1>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          <strong className="text-foreground">{clientName}</strong> will be able to call FreshTrack's
          enabled tools while you are signed in — reading and updating your pantry, cookbook, and shopping list on your behalf.
        </p>

        {scopes.length > 0 && (
          <ul className="text-sm mt-4 space-y-1 list-disc pl-5">
            {scopes.map((s) => (
              <li key={s} className="text-muted-foreground">
                {s === "openid" && "Sign you in"}
                {s === "email" && "See your email address"}
                {s === "profile" && "See your basic profile"}
                {!["openid", "email", "profile"].includes(s) && `Permission: ${s}`}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground italic mt-4">
          This does not bypass FreshTrack's permissions — the connection acts as you.
        </p>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel
          </Button>
          <Button variant="hero" className="flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="animate-spin" /> : <Leaf />} Approve
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default OAuthConsent;
