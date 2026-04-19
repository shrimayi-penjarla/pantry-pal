export function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateISO + "T00:00:00");
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function addDays(days: number, fromISO?: string): string {
  const base = fromISO ? new Date(fromISO + "T00:00:00") : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export type ExpiryStatus = "expired" | "urgent" | "soon" | "fresh";

export function expiryStatus(dateISO: string): ExpiryStatus {
  const d = daysUntil(dateISO);
  if (d < 0) return "expired";
  if (d <= 2) return "urgent";
  if (d <= 5) return "soon";
  return "fresh";
}

export function expiryLabel(dateISO: string): string {
  const d = daysUntil(dateISO);
  if (d < 0) return `Expired ${Math.abs(d)}d ago`;
  if (d === 0) return "Expires today";
  if (d === 1) return "1 day left";
  return `${d} days left`;
}

export function statusClasses(s: ExpiryStatus): string {
  switch (s) {
    case "expired":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "urgent":
      return "bg-accent-soft text-accent border-accent/30";
    case "soon":
      return "bg-warning/15 text-warning-foreground border-warning/30";
    default:
      return "bg-primary-soft text-primary border-primary/20";
  }
}
