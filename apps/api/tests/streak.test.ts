import { describe, expect, it } from "vitest";
import {
  addDays,
  countsTowardStreak,
  currentStreak,
  dateKeyToUtcDate,
  localDateKey,
  longestStreak,
  utcDateToKey,
} from "../src/services/streak.service";

describe("localDateKey", () => {
  it("resolves the calendar date in the user's timezone, not the server's", () => {
    const instant = new Date("2026-09-12T20:00:00.000Z");

    expect(localDateKey(instant, "UTC")).toBe("2026-09-12");
    expect(localDateKey(instant, "Asia/Kolkata")).toBe("2026-09-13"); // UTC+5:30
    expect(localDateKey(instant, "Pacific/Kiritimati")).toBe("2026-09-13"); // UTC+14
    expect(localDateKey(instant, "America/Los_Angeles")).toBe("2026-09-12"); // UTC-7
  });

  it("rolls over at the user's local midnight", () => {
    // Asia/Kathmandu is UTC+5:45, so its midnight is 18:15Z.
    expect(localDateKey(new Date("2026-09-12T18:16:00.000Z"), "Asia/Kathmandu")).toBe("2026-09-13");
    expect(localDateKey(new Date("2026-09-12T18:14:00.000Z"), "Asia/Kathmandu")).toBe("2026-09-12");
  });

  it("falls back to UTC for an invalid timezone instead of failing the write", () => {
    const instant = new Date("2026-09-12T20:00:00.000Z");
    expect(localDateKey(instant, "Not/AZone")).toBe(localDateKey(instant, "UTC"));
  });
});

describe("addDays", () => {
  it("crosses month, year, and leap-day boundaries", () => {
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("date keys", () => {
  it("round-trips through the value stored in a @db.Date column", () => {
    for (const key of ["2026-01-01", "2026-09-13", "2026-12-31"]) {
      expect(utcDateToKey(dateKeyToUtcDate(key))).toBe(key);
    }
  });
});

describe("currentStreak", () => {
  it("counts consecutive active days ending today", () => {
    expect(currentStreak(["2026-09-11", "2026-09-12", "2026-09-13"], "2026-09-13")).toBe(3);
  });

  it("keeps the streak alive when today has no activity yet (grace)", () => {
    expect(currentStreak(["2026-09-11", "2026-09-12"], "2026-09-13")).toBe(2);
  });

  it("breaks the streak once both today and yesterday are inactive", () => {
    expect(currentStreak(["2026-09-09", "2026-09-10"], "2026-09-13")).toBe(0);
  });

  it("stops at the first gap", () => {
    expect(currentStreak(["2026-09-13", "2026-09-12", "2026-09-10"], "2026-09-13")).toBe(2);
  });

  it("is zero with no activity at all", () => {
    expect(currentStreak([], "2026-09-13")).toBe(0);
  });

  it("ignores earlier runs separated by a gap", () => {
    expect(currentStreak(["2026-09-13", "2026-08-01", "2026-08-02"], "2026-09-13")).toBe(1);
  });
});

describe("longestStreak", () => {
  it("finds the best run in history, not the current one", () => {
    expect(
      longestStreak(["2026-01-04", "2026-01-02", "2026-01-03", "2026-01-01", "2026-03-01"]),
    ).toBe(4);
  });

  it("tolerates duplicate days", () => {
    expect(longestStreak(["2026-01-02", "2026-01-01", "2026-01-02"])).toBe(2);
  });

  it("is zero when there is no history", () => {
    expect(longestStreak([])).toBe(0);
  });
});

describe("countsTowardStreak", () => {
  it("counts only meaningful activity (plan §4.3)", () => {
    expect(countsTowardStreak("PROBLEM_SOLVED")).toBe(true);
    expect(countsTowardStreak("REVISION_COMPLETED")).toBe(true);
    expect(countsTowardStreak("DAILY_CHALLENGE")).toBe(true);
    expect(countsTowardStreak("LEARNING_SESSION")).toBe(true);

    // An attempt alone must never keep a streak alive — that would make it fake.
    expect(countsTowardStreak("PROBLEM_ATTEMPTED")).toBe(false);
    expect(countsTowardStreak("NOTE_UPDATED")).toBe(false);
  });
});
