export function cashPlanCard() {
  return `<section class="card"><h2>Plan without a steady paycheck</h2><p>Start with verified cash and dated bills. Leave income blank when uncertain. This preview does not change your records.</p><details><summary>Build a 30-day cash plan</summary><form id="cash-plan-form" class="cash-plan-form">
  <label>Spendable cash balance<input name="cash" inputmode="decimal" required placeholder="0.00"></label>
  <label>Balance observed at<input name="observed" type="datetime-local" required></label>
  <label>Keep a cash buffer<input name="buffer" inputmode="decimal" value="0" required></label>
  <label>Card balances and goal reserves<input name="reserve" inputmode="decimal" value="0" required></label>
  <label>Everyday spending per day<input name="daily" inputmode="decimal" value="0" required></label>
  <label>Dated bills: one date and amount per line<textarea name="bills" rows="3" placeholder="2027-01-15 120.00"></textarea></label>
  <label>Confirmed future income: one date and amount per line<textarea name="income" rows="2" placeholder="Leave blank if uncertain"></textarea></label>
  <p class="note">Only enter future income whose amount and date you have confirmed. Include all unposted bills and bank holds. Do not count investment values or credit limits as cash. Card and goal reserves must not duplicate bills entered above.</p>
  <button type="submit">Preview cash plan</button><div class="cash-plan-result" role="status"></div></form></details></section>`;
}
export async function previewCashPlan(form, api, money) {
  const result = form.querySelector(".cash-plan-result");
  result.textContent = "Calculating…";
  try {
    const data = Object.fromEntries(new FormData(form));
    const cents = (v) => {
      if (!/^\d{1,10}(\.\d{1,2})?$/.test(v))
        throw new Error("Enter nonnegative amounts with at most two decimals.");
      const [a, b = ""] = v.split(".");
      return Number(a) * 100 + Number(b.padEnd(2, "0"));
    };
    const lines = (s, direction) =>
      s.trim()
        ? s
            .trim()
            .split("\n")
            .map((line, i) => {
              const fields = line.trim().split(/\s+/);
              if (fields.length !== 2)
                throw new Error("Each line needs YYYY-MM-DD and an amount.");
              return {
                date: fields[0],
                amountCents: cents(fields[1]),
                direction,
                label: `${direction === "in" ? "Confirmed income" : "Bill"} ${i + 1}`,
                confirmed: direction === "in",
              };
            })
        : [];
    const now = new Date(),
      today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const events = [...lines(data.bills, "out"), ...lines(data.income, "in")];
    const end = new Date(Date.parse(today) + 30 * 86400000)
      .toISOString()
      .slice(0, 10);
    if (events.some((e) => e.date < today || e.date > end))
      throw new Error("Use dates within the next 30 days, including today.");
    const p = await api("/api/cash-plan", "POST", {
      today,
      days: 30,
      cashCents: cents(data.cash),
      observedAt: new Date(data.observed).toISOString(),
      bufferCents: cents(data.buffer),
      reserveCents: cents(data.reserve),
      dailySpendCents: cents(data.daily),
      events,
    });
    result.textContent = `Balance ${p.freshness}. Lowest projected headroom after reserves and buffer: ${money(p.projectedHeadroomCents)}. ${p.firstShortfall ? `Buffer breach ${p.firstShortfall}; gap ${money(p.shortfallCents)}.` : "No projected buffer breach within 30 days."} Estimated bills: ${p.bills.map((b) => `${b.days} days ${money(b.amountCents)}`).join("; ")}. This is a partial preview, not a safe-to-save amount. Verify missing obligations and payment timing.`;
  } catch (e) {
    result.textContent = e.message;
  }
}
