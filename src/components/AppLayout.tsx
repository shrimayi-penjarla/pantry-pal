import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ScanLine, Refrigerator, ChefHat, BookOpen, Leaf, ListChecks, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import ExpiryBanner from "@/components/ExpiryBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/pantry", label: "Pantry", icon: Refrigerator },
  { to: "/shopping", label: "Shopping", icon: ListChecks },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
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
          <Link to="/" className="flex items-center gap-2 group">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-fresh text-primary-foreground shadow-soft group-hover:scale-105 transition-transform">
              <Leaf className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-xl tracking-tight">FreshTrack</p>
              <p className="font-hand text-sm text-accent -mt-1">a kitchen journal</p>
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
            {user ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="ml-2">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            ) : (
              <Button variant="hero" size="sm" asChild className="ml-2">
                <Link to="/login"><LogIn className="h-4 w-4" /> Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {user && <ExpiryBanner />}

      <main className="flex-1 container py-6 pb-24 sm:pb-10 animate-fade-in">
        <Outlet />
      </main>

      {user && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="grid grid-cols-5">
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
