import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/pantry", { replace: true });
  }, [loading, user, navigate]);

  const signIn = async () => {
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

  return (
    <div className="max-w-md mx-auto">
      <Card className="paper-card p-8 text-center relative">
        <span className="tape" />
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-fresh text-primary-foreground shadow-soft mx-auto">
          <Leaf className="h-6 w-6" />
        </span>
        <p className="font-hand text-2xl text-accent mt-3">welcome, friend</p>
        <h1 className="font-display text-3xl tracking-tight mt-1">Sign in to your kitchen</h1>
        <p className="text-sm text-muted-foreground italic mt-2 mb-6">
          Your pantry, cookbook, and shopping list — kept safe and private to you.
        </p>
        <Button onClick={signIn} variant="hero" size="lg" className="w-full">
          <BookOpen /> Continue with Google
        </Button>
        <p className="text-xs text-muted-foreground/80 mt-4">
          We use your Google account just to keep your data yours.
        </p>
      </Card>
    </div>
  );
};

export default Login;
