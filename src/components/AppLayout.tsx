import { NavLink, Outlet } from "react-router-dom";
import { ScanLine, Refrigerator, ChefHat, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import ExpiryBanner from "@/components/ExpiryBanner";

const navItems = [
  { to: "/", label: "Pantry", icon: Refrigerator, end: true },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
];

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-30">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-fresh text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">FreshTrack</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
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
        </div>
      </header>

      <ExpiryBanner />

      <main className="flex-1 container py-6 pb-24 sm:pb-10 animate-fade-in">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
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
    </div>
  );
};

export default AppLayout;
