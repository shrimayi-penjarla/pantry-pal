import { NavLink, Outlet } from "react-router-dom";
import { ScanLine, Refrigerator, ChefHat, BookOpen, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import ExpiryBanner from "@/components/ExpiryBanner";

const navItems = [
  { to: "/", label: "Pantry", icon: Refrigerator, end: true },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/cookbook", label: "Cookbook", icon: BookOpen },
];

const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-fresh text-primary-foreground shadow-soft">
              <Leaf className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-xl tracking-tight">FreshTrack</p>
              <p className="font-hand text-sm text-accent -mt-1">a kitchen journal</p>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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
        </div>
      </header>

      <ExpiryBanner />

      <main className="flex-1 container py-6 pb-24 sm:pb-10 animate-fade-in">
        <Outlet />
      </main>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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
    </div>
  );
};

export default AppLayout;
