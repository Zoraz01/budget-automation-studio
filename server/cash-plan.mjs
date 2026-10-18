// Provider-neutral, read-only cash planning. All money is integer cents.
const DAY = 86400000;
export function planCash(input, now = Date.now()) {
  const money = (v, name, negative = false) => {
    if (!Number.isSafeInteger(v) || Math.abs(v) > 1e12 || (!negative && v < 0))
      throw new Error(`Invalid ${name}`);
    return v;
  };
  const date = (v) => {
    if (
      typeof v !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
      !Number.isFinite(Date.parse(v)) ||
      new Date(v).toISOString().slice(0, 10) !== v
    )
      throw new Error("Invalid date");
    return v;
  };
  const today = date(input.today);
  const days = input.days ?? 30;
  if (!Number.isInteger(days) || days < 1 || days > 90)
    throw new Error("Horizon must be 1–90 days");
  const cash =
    input.cashCents == null ? null : money(input.cashCents, "cash", true);
  const buffer = money(input.bufferCents ?? 0, "buffer");
  const reserve = money(input.reserveCents ?? 0, "reserves");
  const daily = money(input.dailySpendCents ?? 0, "daily spending");
  const asOf = Date.parse(input.observedAt);
  const freshness =
    cash === null
      ? "missing"
      : !Number.isFinite(asOf) ||
          asOf > now + 300000 ||
          now - asOf > 36 * 3600000
        ? "stale"
        : "current";
  const end = new Date(Date.parse(today) + days * DAY)
    .toISOString()
    .slice(0, 10);
  if (!Array.isArray(input.events ?? []) || (input.events ?? []).length > 500)
    throw new Error("Too many events");
  const excludedIncome = [];
  const events = (input.events ?? [])
    .map((e) => {
      if (!e || !["in", "out"].includes(e.direction))
        throw new Error("Invalid direction");
      if (
        typeof e.label !== "string" ||
        !e.label.trim() ||
        e.label.length > 120
      )
        throw new Error("Invalid event label");
      return {
        date: date(e.date),
        amountCents: money(e.amountCents, "event amount"),
        direction: e.direction,
        label: e.label,
        confirmed: e.confirmed === true,
        estimated: e.estimated === true,
      };
    })
    .filter((e) => {
      if (e.direction === "in" && !e.confirmed) {
        excludedIncome.push(e);
        return false;
      }
      return e.date >= today && e.date <= end;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.direction === b.direction ? 0 : a.direction === "out" ? -1 : 1),
    );
  let balance = cash,
    low = { date: today, balanceCents: cash },
    firstShortfall = null;
  const series = [];
  const observe = (d) => {
    if (balance === null) return;
    if (balance < low.balanceCents) low = { date: d, balanceCents: balance };
    if (!firstShortfall && balance < buffer + reserve) firstShortfall = d;
  };
  observe(today);
  for (let i = 0; i <= days; i++) {
    const d = new Date(Date.parse(today) + i * DAY).toISOString().slice(0, 10);
    if (balance !== null && i > 0) balance -= daily;
    observe(d);
    for (const e of events.filter((e) => e.date === d)) {
      if (balance !== null)
        balance += e.direction === "in" ? e.amountCents : -e.amountCents;
      observe(d); // bills before income on the same date: show timing risk
    }
    series.push({ date: d, balanceCents: balance });
  }
  const headroom = cash === null ? null : low.balanceCents - reserve - buffer;
  return {
    today,
    days,
    cashCents: cash,
    observedAt: input.observedAt ?? null,
    freshness,
    bufferCents: buffer,
    reserveCents: reserve,
    dailySpendCents: daily,
    events,
    excludedIncome,
    series,
    low,
    firstShortfall,
    projectedHeadroomCents: headroom,
    shortfallCents: headroom === null ? null : Math.max(0, -headroom),
    // Incomplete bill coverage or old cash cannot justify a savings recommendation.
    availableToAllocateCents:
      freshness === "current" && input.coverageComplete === true
        ? Math.max(0, headroom)
        : null,
    coverageComplete: input.coverageComplete === true,
    bills: [7, 14, 30]
      .filter((n) => n <= days)
      .map((n) => ({
        days: n,
        amountCents: events
          .filter(
            (e) =>
              e.direction === "out" &&
              Date.parse(e.date) <= Date.parse(today) + n * DAY,
          )
          .reduce((s, e) => s + e.amountCents, 0),
      })),
  };
}
