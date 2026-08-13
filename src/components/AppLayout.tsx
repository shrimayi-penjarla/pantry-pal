import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ScanLine, Refrigerator, ChefHat, BookOpen, Leaf, ListChecks, LogIn, LogOut, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ExpiryBanner from "@/components/ExpiryBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/pantry", label: "Pantry", icon: Refrigerator },
  { to: "/shopping", label: "Shopping", icon: ListChecks },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/cookbook", label: "Cookbook", icon: BookOpen },
];

const AppLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16 gap-3">
          <Link to="/" className="flex items-center gap-2 group min-w-0">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-fresh text-primary-foreground shadow-soft group-hover:scale-105 transition-transform shrink-0">
              <Leaf className="h-4 w-4" />
            </span>
            <div className="leading-tight min-w-0">
              <p className="font-display text-xl tracking-tight">PantryPal</p>
              <p className="font-hand text-sm text-accent -mt-1 hidden sm:block">a kitchen journal</p>
            </div>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {user &&
              navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors font-serif",
                      isActive
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>
          <div className="flex items-center gap-2 min-w-0">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary-soft border border-primary/30 max-w-[180px] sm:max-w-[240px]">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url as string}
                      alt=""
                      className="h-6 w-6 rounded-full border border-border"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
                      {String(user.user_metadata?.full_name || user.email || "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                  )}
                  <span className="font-serif text-xs text-primary truncate hidden sm:block">
                    {(user.user_metadata?.full_name as string) || user.email}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} title="Sign out" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Sign out</span>
                </Button>
              </>
            ) : (
              <Button variant="hero" size="sm" asChild>
                <Link to="/login"><LogIn className="h-4 w-4" /> Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {user && <ExpiryBanner />}

      <main className="flex-1 container py-6 pb-24 sm:pb-10 animate-fade-in">
        <Outlet />
      </main>

      {user && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="grid grid-cols-6">
            <NavLink
              to="/scan"
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <ScanLine className="h-5 w-5" />
              Scan
            </NavLink>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default AppLayout;
