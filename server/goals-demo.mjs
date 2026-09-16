import { randomUUID } from "node:crypto";
import { workspaceGoals } from "./goals-adapter.mjs";
// Invented, opt-in demonstration fixtures. Never invoked in personal mode.
export function seedGoalDemo(store, currency) {
  if (
    store.db
      .prepare("SELECT value FROM meta WHERE key='goal_demo_seeded'")
      .get()
  )
    return;
  if (store.db.prepare("SELECT count(*) n FROM goals").get().n) {
    store.db
      .prepare("INSERT INTO meta VALUES ('goal_demo_seeded','true')")
      .run();
    return;
  }
  const service = workspaceGoals(store, currency);
  const act = (action, values) =>
    service.execute({
      action,
      ...values,
      revision: service.state().settings.revision,
      request_id: randomUUID(),
    });
  act("cash", { name: "Example checking", balance: "7000", confirmed: true });
  act("configure", {
    source_id: "manual",
    monthly_limit: "500",
    bills: "3000",
    buffer: "500",
    due_day: 1,
    timezone: "UTC",
    automatic: false,
    protection_confirmed: true,
  });
  for (const [name, kind, target, saved, monthly, priority] of [
    ["New laptop", "purchase", "1800", "540", "100", 1],
    ["Headphones", "purchase", "280", "0", "0", 0],
    ["Weekend camera", "purchase", "950", "0", "0", 0],
    ["House fund", "longterm", "24000", "2100", "250", 0],
    ["Wedding fund", "longterm", "9000", "300", "100", 0],
    ["Future car", "longterm", "", "0", "0", 0],
  ]) {
    const { id } = act("create", { name, kind, target, monthly, priority });
    if (saved !== "0") act("reserve", { id, amount: saved });
  }
  store.db.prepare("INSERT INTO meta VALUES ('goal_demo_seeded','true')").run();
}
