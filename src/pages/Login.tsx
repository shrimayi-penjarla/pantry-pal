import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Leaf, BookOpen, User, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Usernames are stored as synthetic emails against the auth provider so families
// can share one short login without needing a real inbox.
const USERNAME_DOMAIN = "users.freshtrack.app";
const usernameToEmail = (u: string) =>
  `${u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${USERNAME_DOMAIN}`;
const isValidUsername = (u: string) => /^[a-zA-Z0-9._-]{3,30}$/.test(u.trim());

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Preserve `?next=` through every auth path so an OAuth consent visitor
  // returns to the consent URL instead of the app home.
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const postAuthPath = nextPath ?? "/pantry";

  useEffect(() => {
    if (!loading && user) navigate(postAuthPath, { replace: true });
  }, [loading, user, navigate, postAuthPath]);

  const signInGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + postAuthPath,
    });
    if (result.error) {
      toast.error(result.error.message || "Sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate(postAuthPath);
  };

  // Email provider is disabled on the managed instance, so signInWithPassword /
  // signUp both 422. We call our family-auth edge function, which validates the
  // credentials with the service role and returns a magic-link token_hash;
  // verifyOtp redeems it into a real session without hitting the provider gate.
  const redeemToken = async (tokenHash: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("No session returned");
  };

  const familyAuth = async (action: "signup" | "signin") => {
    const { data, error } = await supabase.functions.invoke("family-auth", {
      body: { action, username: username.trim(), password },
    });
    if (error) {
      // Surface the raw edge-function error body when available.
      const ctx = (error as { context?: Response }).context;
      let raw = error.message;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          if (body?.error) raw = body.error;
        } catch { /* ignore */ }
      }
      throw new Error(raw);
    }
    if (!data?.token_hash) throw new Error(data?.error || "No session token returned");
    await redeemToken(data.token_hash);
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername(username) || !password) {
      toast.error("Enter your username and password");
      return;
    }
    setBusy(true);
    try {
      await familyAuth("signin");
      toast.success("Welcome back!");
      navigate(postAuthPath, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername(username)) {
      toast.error("Username must be 3–30 letters, numbers, dot, dash or underscore");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await familyAuth("signup");
      toast.success("Account created — you're in!");
      navigate(postAuthPath, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="paper-card p-7 sm:p-8 text-center relative">
        <span className="tape" />
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-fresh text-primary-foreground shadow-soft mx-auto">
          <Leaf className="h-6 w-6" />
        </span>
        <p className="font-hand text-2xl text-accent mt-3">welcome, friend</p>
        <h1 className="font-display text-3xl tracking-tight mt-1">Sign in to your kitchen</h1>
        <p className="text-sm text-muted-foreground italic mt-2 mb-5">
          Pick a username and password — share them with your family so everyone uses the same pantry.
        </p>

        <Tabs defaultValue="signin" className="text-left">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4 space-y-3">
            <form onSubmit={signIn} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="user-in" className="font-serif">Username</Label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="user-in"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    placeholder="smith_family"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pw-in" className="font-serif">Password</Label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pw-in"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <BookOpen />} Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4 space-y-3">
            <form onSubmit={signUp} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="user-up" className="font-serif">Pick a username</Label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="user-up"
                    type="text"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={30}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    placeholder="smith_family"
                  />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  3–30 characters: letters, numbers, dot, dash or underscore.
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pw-up" className="font-serif">Password</Label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pw-up"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    placeholder="at least 6 characters"
                  />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Share these with your family so everyone shares the same pantry.
                </p>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Leaf />} Create our cookbook
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 my-5">
          <hr className="flex-1 border-border" />
          <span className="text-xs text-muted-foreground font-hand text-lg">or</span>
          <hr className="flex-1 border-border" />
        </div>

        <Button onClick={signInGoogle} variant="outline" size="lg" className="w-full">
          Continue with Google
        </Button>
      </Card>
    </div>
  );
};

export default Login;
