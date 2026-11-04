import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  notifyExpiringItems,
  notificationsSupported,
  notificationPermission,
} from "./notifications";

class MockNotification {
  static permission: NotificationPermission = "granted";
  static calls: Array<{ title: string; body?: string; tag?: string }> = [];
  constructor(title: string, opts?: { body?: string; tag?: string }) {
    MockNotification.calls.push({ title, body: opts?.body, tag: opts?.tag });
  }
}

describe("expiry notifications", () => {
  beforeEach(() => {
    localStorage.clear();
    MockNotification.calls = [];
    MockNotification.permission = "granted";
    vi.stubGlobal("Notification", MockNotification);
  });

  it("reports support and permission in jsdom", () => {
    expect(notificationsSupported()).toBe(true);
    expect(notificationPermission()).toBe("granted");
  });

  it("notifies for expired, today, and ≤2-day items with correct wording", () => {
    notifyExpiringItems([
      { id: "1", name: "Milk", expiry_date: "2026-01-01", daysLeft: -1 },
      { id: "2", name: "Eggs", expiry_date: "2026-01-02", daysLeft: 0 },
      { id: "3", name: "Spinach", expiry_date: "2026-01-03", daysLeft: 2 },
    ]);
    expect(MockNotification.calls).toHaveLength(3);
    expect(MockNotification.calls[0].body).toContain("Milk has expired");
    expect(MockNotification.calls[1].body).toContain("Eggs expires today");
    expect(MockNotification.calls[2].body).toContain("Spinach expires in 2 days");
    expect(MockNotification.calls[0].title).toBe("PantryPal");
  });

  it("does not re-notify the same item+expiry twice (dedupe via localStorage)", () => {
    const item = { id: "1", name: "Milk", expiry_date: "2026-01-01", daysLeft: 1 };
    notifyExpiringItems([item]);
    notifyExpiringItems([item]);
    expect(MockNotification.calls).toHaveLength(1);
  });

  it("does nothing when permission is not granted", () => {
    MockNotification.permission = "denied";
    notifyExpiringItems([{ id: "1", name: "Milk", expiry_date: "2026-01-01", daysLeft: 1 }]);
    expect(MockNotification.calls).toHaveLength(0);
  });

  it("re-notifies if the expiry date changes for the same item", () => {
    notifyExpiringItems([{ id: "1", name: "Milk", expiry_date: "2026-01-01", daysLeft: 1 }]);
    notifyExpiringItems([{ id: "1", name: "Milk", expiry_date: "2026-01-05", daysLeft: 1 }]);
    expect(MockNotification.calls).toHaveLength(2);
  });
});
