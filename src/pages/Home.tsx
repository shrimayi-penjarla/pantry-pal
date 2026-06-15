import { Link } from "react-router-dom";
import {
  Refrigerator,
  BookOpen,
  ChefHat,
  ListChecks,
  Leaf,
  Sparkles,
  MessageCircle,
  ScanLine,
  Heart,
  Apple,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import cozyKitchen from "@/assets/cozy-kitchen.jpg";

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Hero */}
      <Card className="paper-card relative overflow-hidden">
        <span className="tape" />
        <span className="absolute -top-3 right-10 font-hand text-3xl text-accent rotate-[6deg] hidden sm:block">
          ~ est. today ~
        </span>
        <div className="grid md:grid-cols-2 gap-6 items-center p-6 sm:p-10">
          <div className="space-y-4 text-center md:text-left">
            <p className="font-hand text-3xl text-accent leading-none">welcome to</p>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-tight">
              FreshTrack
              <span className="block font-hand text-2xl sm:text-3xl text-primary mt-1">
                your smart fridge &amp; virtual cookbook
              </span>
            </h1>
            <p className="text-muted-foreground italic">
              A cozy little kitchen journal — scan your groceries, watch what's fresh, save
              the recipes you love, and chat about what to cook tonight.
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
              {user ? (
                <>
                  <Button asChild variant="hero" size="lg">
                    <Link to="/pantry"><Refrigerator /> Open my pantry</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/chat"><MessageCircle /> Ask for a recipe</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="hero" size="lg">
                    <Link to="/login"><Leaf /> Sign in to start cooking</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/login">Create an account</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 justify-center md:justify-start text-xs text-muted-foreground pt-2">
              <Heart className="h-3.5 w-3.5 text-accent" /> made for cozy home cooks &amp; busy families
            </div>
          </div>
          <div className="relative">
            <img
              src={cozyKitchen}
              alt="A cozy illustrated country kitchen with a stocked fridge, fresh vegetables, and an open cookbook"
              className="rounded-md shadow-soft border border-border w-full h-56 sm:h-80 object-cover rotate-[-1.5deg]"
            />
            <span className="absolute -bottom-2 left-6 font-hand text-2xl text-primary bg-card px-3 py-0.5 rounded-sm border border-border rotate-[-2deg] shadow-soft">
              fresh today
            </span>
            <span className="absolute -top-3 -right-2 font-hand text-xl text-accent bg-card px-3 py-0.5 rounded-sm border border-border rotate-[5deg] shadow-soft hidden sm:block">
              with love ♡
            </span>
          </div>
        </div>
      </Card>

      {/* Feature tiles */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-2xl">A little tour</h2>
          <p className="font-hand text-xl text-accent">what's inside</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              to: "/pantry",
              icon: Refrigerator,
              label: "Smart Pantry",
              note: "Track what's fresh and what's about to turn.",
              tint: "bg-primary-soft",
            },
            {
              to: "/scan",
              icon: ScanLine,
              label: "Snap & Scan",
              note: "Photograph receipts or your fridge — we'll fill it in.",
              tint: "bg-accent/15",
            },
            {
              to: "/chat",
              icon: MessageCircle,
              label: "Recipe Chat",
              note: '"Vegan dinner in 30 min?" — just ask.',
              tint: "bg-primary-soft",
            },
            {
              to: "/recipes",
              icon: ChefHat,
              label: "Recipe Ideas",
              note: "Cook what's expiring with AI-picked recipes.",
              tint: "bg-accent/15",
            },
            {
              to: "/cookbook",
              icon: BookOpen,
              label: "Your Cookbook",
              note: "Star recipes you love — keep them forever.",
              tint: "bg-primary-soft",
            },
            {
              to: "/shopping",
              icon: ListChecks,
              label: "Shopping List",
              note: "Auto-suggested when you run out.",
              tint: "bg-accent/15",
            },
          ].map((c) => (
            <Link key={c.to} to={c.to}>
              <Card className="paper-card p-5 h-full hover:-translate-y-1 transition-transform group">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${c.tint} text-primary mb-3 border border-border/60`}>
                  <c.icon className="h-5 w-5" />
                </span>
                <p className="font-display text-xl">{c.label}</p>
                <p className="text-sm text-muted-foreground italic mt-1">{c.note}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-2xl">How it works</h2>
          <p className="font-hand text-xl text-accent">three little steps</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { n: "1", title: "Stock the pantry", note: "Scan a receipt, snap your fridge, or type items in.", icon: Apple },
            { n: "2", title: "Watch what's fresh", note: "We'll nudge you before anything turns.", icon: Leaf },
            { n: "3", title: "Cook something cozy", note: "Ask our chatbot or browse recipe ideas.", icon: ChefHat },
          ].map((s) => (
            <Card key={s.n} className="paper-card p-5 relative">
              <span className="absolute -top-3 -left-2 font-hand text-3xl text-accent bg-card px-2 rounded-sm border border-border rotate-[-6deg]">
                {s.n}
              </span>
              <s.icon className="h-6 w-6 text-primary mb-2 mt-2" />
              <p className="font-display text-lg">{s.title}</p>
              <p className="text-sm text-muted-foreground italic mt-1">{s.note}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <Card className="paper-card p-6 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-accent shrink-0 mt-1" />
        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-display text-base">A note from the kitchen.</span>{" "}
            <span className="text-muted-foreground italic">
              Make an account with an email and password your whole family can share — everyone
              sees the same pantry, cookbook, and shopping list.
            </span>
          </p>
          {!user && (
            <Button asChild variant="link" className="px-0 h-auto">
              <Link to="/login">Create your household account →</Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Home;
