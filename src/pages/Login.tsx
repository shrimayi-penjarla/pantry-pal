import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const { user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/pantry", { replace: true });
  }, [loading, user, navigate]);

  const signInGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/pantry",
    });
    if (result.error) {
      toast.error(result.error.message || "Sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate("/pantry");
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUsername(username) || !password) {
      toast.error("Enter your username and password");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "Username or password is incorrect"
          : error.message,
      );
      return;
    }
    toast.success("Welcome back!");
    navigate("/pantry");
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
    const { error } = await supabase.auth.signUp({
      email: usernameToEmail(username),
      password,
      options: {
        emailRedirectTo: window.location.origin + "/pantry",
        data: { username: username.trim() },
      },
    });
    setBusy(false);
    if (error) {
      const msg = error.message.toLowerCase().includes("registered")
        ? "That username is already taken — try another."
        : error.message;
      toast.error(msg);
      return;
    }
    toast.success("Account created — you're in!");
    navigate("/pantry");
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
