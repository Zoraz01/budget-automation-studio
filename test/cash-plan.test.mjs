import test from "node:test";
import assert from "node:assert/strict";
import { planCash } from "../server/cash-plan.mjs";
const now = Date.parse("2027-01-10T12:00:00Z");
const fixture = () => ({
  today: "2027-01-10",
  days: 30,
  cashCents: 200000,
  observedAt: "2027-01-10T11:00:00Z",
  bufferCents: 20000,
  reserveCents: 10000,
  dailySpendCents: 1000,
  events: [],
});
test("unconfirmed income is excluded; confirmed one-off does not repeat", () => {
  const event = {
    date: "2027-01-11",
    amountCents: 100000,
    direction: "in",
    label: "Example pay",
  };
  const base = planCash({ ...fixture(), events: [event] }, now);
  assert.equal(base.events.length, 0);
  assert.equal(base.excludedIncome.length, 1);
  assert.equal(base.series.at(-1).balanceCents, 170000);
  const confirmed = planCash(
    { ...fixture(), events: [{ ...event, confirmed: true }] },
    now,
  );
  assert.equal(confirmed.series.at(-1).balanceCents, 270000);
  assert.equal(confirmed.events.length, 1);
});
test("bills due today and before same-day pay expose the early shortfall", () => {
  const p = planCash(
    {
      ...fixture(),
      events: [
        {
          date: "2027-01-10",
          amountCents: 180001,
          direction: "out",
          label: "Bill",
        },
        {
          date: "2027-01-10",
          amountCents: 200000,
          direction: "in",
          label: "Pay",
          confirmed: true,
        },
      ],
    },
    now,
  );
  assert.equal(p.firstShortfall, "2027-01-10");
  assert.equal(p.shortfallCents, 10001);
  assert.equal(p.bills[0].amountCents, 180001);
  assert.equal(p.series[0].balanceCents, 219999);
});
test("unknown cash never falls back to zero or historical cash flow", () => {
  const p = planCash({ ...fixture(), cashCents: null }, now);
  assert.equal(p.freshness, "missing");
  assert.equal(p.projectedHeadroomCents, null);
  assert.equal(p.shortfallCents, null);
  assert.equal(p.series[0].balanceCents, null);
});
test("stale, future-dated or incomplete observations cannot recommend allocation", () => {
  for (const observedAt of [
    "2027-01-01T00:00:00Z",
    "2027-02-01T00:00:00Z",
    null,
  ]) {
    const p = planCash(
      { ...fixture(), observedAt, coverageComplete: true },
      now,
    );
    assert.equal(p.freshness, "stale");
    assert.equal(p.availableToAllocateCents, null);
  }
  assert.equal(planCash(fixture(), now).availableToAllocateCents, null);
  assert.equal(
    planCash({ ...fixture(), coverageComplete: true }, now)
      .availableToAllocateCents,
    140000,
  );
});
test("invalid monetary values, dates and unbounded horizons fail closed", () => {
  for (const patch of [
    { cashCents: NaN },
    { cashCents: 1.5 },
    { dailySpendCents: -1 },
    { days: 100 },
    { days: 0 },
    { today: "2027-02-30" },
    {
      events: [
        {
          date: "2027-01-11",
          amountCents: 100,
          direction: "sideways",
          label: "Bad",
        },
      ],
    },
  ])
    assert.throws(() => planCash({ ...fixture(), ...patch }, now));
});
test("reserves reduce headroom without changing observed cash or events", () => {
  const p = planCash({ ...fixture(), reserveCents: 20000 }, now);
  assert.equal(p.cashCents, 200000);
  assert.equal(p.projectedHeadroomCents, 130000);
  assert.equal(p.events.length, 0);
});
