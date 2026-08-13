// Browser push (local notifications) for items expiring soon.
// We use the Notification API directly — no service worker — which works
// for foreground notifications and is enough for the MVP.

const SHOWN_KEY = "freshtrack_notified_ids";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  return Notification.requestPermission();
}

function getShown(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveShown(set: Set<string>) {
  localStorage.setItem(SHOWN_KEY, JSON.stringify(Array.from(set)));
}

export function notifyExpiringItems(
  items: Array<{ id: string; name: string; expiry_date: string; daysLeft: number }>,
) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const shown = getShown();
  let updated = false;
  for (const it of items) {
    const key = `${it.id}:${it.expiry_date}`;
    if (shown.has(key)) continue;
    const title =
      it.daysLeft < 0
        ? `${it.name} has expired`
        : it.daysLeft === 0
        ? `${it.name} expires today`
        : `${it.name} expires in ${it.daysLeft} day${it.daysLeft === 1 ? "" : "s"}`;
    try {
      new Notification("PantryPal", {
        body: title + " — tap Recipes for ideas to use it up.",
        tag: key,
      });
      shown.add(key);
      updated = true;
    } catch {
      // ignore
    }
  }
  if (updated) saveShown(shown);
}
