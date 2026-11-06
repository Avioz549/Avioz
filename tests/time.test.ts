import { test } from "node:test";
import assert from "node:assert/strict";
import { elapsedLabel } from "../lib/time";
test("shift timer does not wrap after 24 hours", () => {
  assert.equal(
    elapsedLabel("2026-01-01T00:00:00Z", new Date("2026-01-02T02:03:04Z")),
    "26:03:04",
  );
});
test("timer clamps future start times at zero", () => {
  assert.equal(
    elapsedLabel("2027-01-01T00:00:00Z", new Date("2026-01-01T00:00:00Z")),
    "00:00:00",
  );
});

test("payroll month uses the displayed local date near a UTC boundary", async () => {
  const { localMonth } = await import("../lib/time");
  const date = new Date("2026-10-31T23:30:00Z");
  assert.equal(
    localMonth(date.toISOString()),
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
  );
});

test("idle clock targets the next local midnight without second-by-second rendering", async () => {
  const { nextClockDelay } = await import("../lib/time");
  assert.equal(
    nextClockDelay(new Date(2026, 10, 30, 23, 59, 59, 500), false),
    501,
  );
  assert.equal(nextClockDelay(new Date(2026, 10, 1, 12), false), 60000);
  assert.equal(nextClockDelay(new Date(2026, 10, 1, 12), true), 1000);
});
test("clock snapshots retain the old civil day and timezone when device timezone changes", async () => {
  const { clockSnapshot } = await import("../lib/time");
  const original = process.env.TZ;
  try {
    process.env.TZ = "UTC";
    const date = new Date("2026-11-30T23:30:00Z"),
      before = clockSnapshot(date);
    process.env.TZ = "Asia/Jerusalem";
    const after = clockSnapshot(date);
    assert.equal(before.day, "2026-11-30");
    assert.equal(after.day, "2026-12-01");
    assert.notEqual(before.zone, after.zone);
    assert.notEqual(before.offset, after.offset);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
