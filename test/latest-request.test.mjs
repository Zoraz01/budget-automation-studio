import test from "node:test";
import assert from "node:assert/strict";
import { latestRequest } from "../web/latest-request.js";

test("a delayed read cannot replace a newer month, publish an error or survive logout", async () => {
  const requests = latestRequest();
  const shown = [];
  let finishOld;
  const oldRead = requests.begin();
  const oldResponse = new Promise((r) => {
    finishOld = r;
  }).then((value) => {
    if (oldRead.current()) shown.push(value);
  });
  const currentRead = requests.begin();
  assert.equal(oldRead.signal.aborted, true);
  if (currentRead.current()) shown.push("current month");
  finishOld("outdated month");
  await oldResponse;
  if (oldRead.current()) shown.push("outdated failure");
  assert.deepEqual(shown, ["current month"]);
  requests.cancel();
  assert.equal(currentRead.signal.aborted, true);
  assert.equal(currentRead.current(), false);
  const nextSession = requests.begin();
  assert.equal(nextSession.current(), true);
  assert.equal(currentRead.current(), false);
});
