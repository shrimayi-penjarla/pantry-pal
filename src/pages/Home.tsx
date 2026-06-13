import { Link } from "react-router-dom";
import { Refrigerator, BookOpen, ChefHat, ListChecks, Leaf, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import heroImg from "@/assets/hero-groceries.jpg";

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="paper-card relative overflow-hidden">
        <span className="tape" />
        <div className="grid md:grid-cols-2 gap-6 items-center p-6 sm:p-10">
          <div className="space-y-4 text-center md:text-left">
            <p className="font-hand text-3xl text-accent leading-none">welcome to</p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              Your smart fridge <span className="text-primary">&amp;</span> virtual cookbook
            </h1>
            <p className="text-muted-foreground italic">
              A cozy little kitchen journal — scan groceries, watch what's fresh, save the
              recipes you love, and never forget the milk again.
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
              {user ? (
                <Button asChild variant="hero" size="lg">
                  <Link to="/pantry"><Refrigerator /> Open my pantry</Link>
                </Button>
              ) : (
                <Button asChild variant="hero" size="lg">
                  <Link to="/login"><Leaf /> Sign in to get started</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link to="/cookbook"><BookOpen /> Peek at the cookbook</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt="A basket of fresh groceries on a wooden table"
              className="rounded-md shadow-soft border border-border w-full h-56 sm:h-72 object-cover rotate-[-1.5deg]"
            />
            <span className="absolute -bottom-2 left-6 font-hand text-2xl text-primary bg-card px-3 py-0.5 rounded-sm border border-border rotate-[-2deg] shadow-soft">
              fresh today
            </span>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: "/pantry", icon: Refrigerator, label: "Pantry", note: "Track what's fresh" },
          { to: "/shopping", icon: ListChecks, label: "Shopping list", note: "Top up what ran out" },
          { to: "/recipes", icon: ChefHat, label: "Recipes", note: "Cook what's expiring" },
          { to: "/cookbook", icon: BookOpen, label: "Cookbook", note: "Your favorites, kept" },
        ].map((c) => (
          <Link key={c.to} to={c.to}>
            <Card className="paper-card p-4 h-full hover:-translate-y-0.5 transition-transform">
              <c.icon className="h-6 w-6 text-primary mb-2" />
              <p className="font-display text-xl">{c.label}</p>
              <p className="text-xs text-muted-foreground italic">{c.note}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="paper-card p-6 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-accent shrink-0 mt-1" />
        <p className="text-sm text-muted-foreground italic">
          Tip: snap a photo of your fridge or a grocery receipt from the Pantry tab —
          we'll fill everything in for you.
        </p>
      </Card>
    </div>
  );
};

export default Home;
