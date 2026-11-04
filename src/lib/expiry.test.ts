import { describe, it, expect } from "vitest";
import { daysUntil, addDays, expiryStatus, expiryLabel } from "./expiry";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const offset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return iso(d);
};

describe("expiry logic", () => {
  it("daysUntil returns 0 for today, positive for future, negative for past", () => {
    expect(daysUntil(offset(0))).toBe(0);
    expect(daysUntil(offset(3))).toBe(3);
    expect(daysUntil(offset(-2))).toBe(-2);
  });

  it("addDays adds days from today by default", () => {
    expect(addDays(5)).toBe(offset(5));
  });

  it("addDays respects an explicit base date", () => {
    expect(addDays(10, "2026-01-01")).toBe("2026-01-11");
  });

  it("expiryStatus thresholds: expired < 0, urgent ≤ 2, soon ≤ 5, else fresh", () => {
    expect(expiryStatus(offset(-1))).toBe("expired");
    expect(expiryStatus(offset(0))).toBe("urgent");
    expect(expiryStatus(offset(2))).toBe("urgent");
    expect(expiryStatus(offset(3))).toBe("soon");
    expect(expiryStatus(offset(5))).toBe("soon");
    expect(expiryStatus(offset(6))).toBe("fresh");
  });

  it("expiryLabel describes each state in words", () => {
    expect(expiryLabel(offset(-3))).toBe("Expired 3d ago");
    expect(expiryLabel(offset(0))).toBe("Expires today");
    expect(expiryLabel(offset(1))).toBe("1 day left");
    expect(expiryLabel(offset(4))).toBe("4 days left");
  });

  it("notification threshold: items expiring in ≤2 days are 'urgent' and must alert", () => {
    // The ExpiryBanner/notifications key off expiryStatus; anything 'urgent'
    // or 'expired' should surface an alert.
    for (const d of [-5, -1, 0, 1, 2]) {
      const s = expiryStatus(offset(d));
      expect(["expired", "urgent"]).toContain(s);
    }
    expect(expiryStatus(offset(3))).not.toBe("urgent");
  });
});
