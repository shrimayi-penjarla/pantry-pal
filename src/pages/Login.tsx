import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, BookOpen, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
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
    if (!email || !password) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate("/pantry");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/pantry" },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
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
          Your pantry, cookbook, and shopping list — kept just for you and your household.
        </p>

        <Tabs defaultValue="signin" className="text-left">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4 space-y-3">
            <form onSubmit={signIn} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email-in" className="font-serif">Email</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email-in"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="you@home.com"
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
                <Label htmlFor="email-up" className="font-serif">Email (your household login)</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email-up"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="kitchen@smith.family"
                  />
                </div>
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
                  Share this email + password with your family so everyone shares the same pantry.
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
