// Cancelling fetch saves work; the identity guard also rejects late completions
// from transports that have already finished or do not honor cancellation.
export function latestRequest() {
  let active = null;
  return {
    begin() {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      return {
        signal: controller.signal,
        current: () => active === controller && !controller.signal.aborted,
      };
    },
    cancel() {
      active?.abort();
      active = null;
    },
  };
}
