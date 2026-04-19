import { useEffect, useState } from "react";
import { AlertTriangle, BellRing, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { daysUntil } from "@/lib/expiry";
import {
  notificationPermission,
  notificationsSupported,
  notifyExpiringItems,
  requestNotificationPermission,
} from "@/lib/notifications";

interface ExpiringItem {
  id: string;
  name: string;
  expiry_date: string;
  daysLeft: number;
}

const STORAGE_KEY = "freshtrack_banner_dismissed_until";

const ExpiryBanner = () => {
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    notificationsSupported() ? Notification.permission : "unsupported",
  );

  useEffect(() => {
    const until = localStorage.getItem(STORAGE_KEY);
    if (until && Date.now() < Number(until)) setDismissed(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("id, name, expiry_date")
        .order("expiry_date", { ascending: true });
      if (error || cancelled || !data) return;
      const mapped = data
        .map((d) => ({ ...d, daysLeft: daysUntil(d.expiry_date) }))
        .filter((d) => d.daysLeft <= 3);
      setItems(mapped);
      notifyExpiringItems(mapped);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnable = async () => {
    const p = await requestNotificationPermission();
    setPerm(p);
    if (p === "granted") notifyExpiringItems(items);
  };

  const handleDismiss = () => {
    setDismissed(true);
    // hide for 6 hours
    localStorage.setItem(STORAGE_KEY, String(Date.now() + 1000 * 60 * 60 * 6));
  };

  if (dismissed || items.length === 0) return null;

  const expired = items.filter((i) => i.daysLeft < 0).length;
  const urgent = items.length - expired;

  return (
    <div className="bg-accent-soft border-b border-accent/30">
      <div className="container py-2.5 flex items-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 text-accent shrink-0" />
        <p className="flex-1 text-foreground">
          <span className="font-medium">
            {expired > 0 && `${expired} expired`}
            {expired > 0 && urgent > 0 && " · "}
            {urgent > 0 && `${urgent} expiring soon`}
          </span>{" "}
          <Link to="/recipes" className="underline underline-offset-2 text-primary hover:text-primary/80">
            see recipe ideas →
          </Link>
        </p>
        {perm === "default" && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleEnable}>
            <BellRing className="h-3.5 w-3.5" /> Enable alerts
          </Button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ExpiryBanner;
