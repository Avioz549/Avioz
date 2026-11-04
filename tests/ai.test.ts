import { test } from "node:test";
import assert from "node:assert/strict";
import { aiPayload, aiSchema } from "../lib/ai";
import { emptyData } from "../lib/finance";
test("AI requests include no financial context without explicit per-request permission", () => {
  const data = emptyData();
  data.profile.name = "PRIVATE NAME";
  data.transactions.push({
    id: crypto.randomUUID(),
    title: "PRIVATE DESCRIPTION",
    amount: 5000,
    date: "2026-01-01",
    kind: "income",
    category: "Salary",
    recurring: false,
  });
  const no = aiPayload("Help", data, "2026-01", false);
  assert.deepEqual(no, { message: "Help", consent: false });
  assert.ok(!JSON.stringify(no).includes("PRIVATE"));
  const yes = aiPayload("Help", data, "2026-01", true);
  assert.equal(yes.context?.income, 5000);
  assert.ok(!JSON.stringify(yes).includes("PRIVATE"));
  assert.equal(aiSchema.safeParse(yes).success, true);
  assert.equal(aiSchema.safeParse({ ...yes, consent: false }).success, false);
  assert.equal(
    aiSchema.safeParse({ message: "Help", consent: true }).success,
    false,
  );
});
