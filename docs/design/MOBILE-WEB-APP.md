# Home-screen mobile web app specification

Status: implementation and physical-device acceptance plan. The desktop preview demonstrates responsive layout, safe-area CSS, selected recovery states and a VisualViewport hook. It is not an installed-device performance result.

## Entry and navigation

Use the deployed app's reachable HTTPS origin, a stable manifest id/start_url/scope, display standalone, correctly padded 192/512 icons and an Apple touch icon. Align manifest and page theme colors with the active surface to avoid launch flashes. Launch into the last authorized route when safe, with Home as a fallback. Keep OAuth callback routes inside the intended application scope and validate return routes.

On iPhone: Safari → Share → Add to Home Screen → enable Open as Web App when offered → Add. On Android: Chrome menu → Install app / Add to Home screen, depending on browser support. Hide redundant install prompts when already standalone; never require an install event supported by only one browser. The phone cannot reach this computer's loopback URL. [Apple installation guide](https://support.apple.com/guide/iphone/iphea86e5236/ios), [standalone application mode](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Create_a_standalone_app).

Home, Review, Activity, Wealth and More stay in the thumb zone. Nested routes have their own Back button. Restore selected period, list filters, scroll position and chart selection when returning. Android system Back first dismisses a sheet, then follows route history; desktop Escape dismisses a sheet; iPhone has a labeled Back affordance. Do not rely on a browser toolbar or an invisible swipe. External provider consent is a distinct navigation flow with a clear return to the purchase.

## Layout and keyboard contract

| Situation | Required behavior |
|---|---|
| Portrait with notch/home indicator | Apply safe-area insets to sticky header, tab bar, composer and sheet footer; content padding includes nav height |
| Landscape | Respect left/right cutouts; allow scrollable content and full labels; avoid a locked orientation |
| Dynamic browser chrome | Use dynamic viewport units with a fallback, avoid a fixed 100vh content trap |
| Chat keyboard | Keep messages scrollable and Send reachable; derive visual viewport height/offset when needed; avoid applying a keyboard transform during pinch zoom |
| Form keyboard | Scroll focused input into the sheet's visible area; retain sticky actions only when they fit; never cover validation or cancel |
| Text and zoom | At least 16px form text; no maximum-scale/user-scalable restriction; 200% text must reflow |
| Touch | At least 44×44 CSS px hit regions including icons, calendar days, swatches and close controls; visible pressed/focus states |
| Accessibility | Proper landmarks, form labels, dialog focus return, live status without repeating whole transcript, VoiceOver/TalkBack chart readouts |

An on-screen keyboard can change the visual viewport independently of the layout viewport. Use feature detection and test actual platform behavior; dynamic viewport units alone are not a universal keyboard fix. Progressive enhancement through VisualViewport should account for height, offset and scale, and remove listeners on unmount. Avoid assuming the VirtualKeyboard API is present on Safari. [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [PWA app layout and safe areas](https://web.dev/learn/pwa/app-design).

Do not autofocus chat on route entry or after a response. Only focus when the user starts composing. Use a 1–5 line composer before internal text scrolling. Preserve draft and caret while a request runs. Hide the bottom navigation only when necessary for focused composition, retaining explicit navigation in the thread header. Use one intentional scroll owner per screen/sheet rather than nested competing scroll panes.

## Background, foreground and offline lifecycle

- On visibility/pageshow restoration, revalidate the authenticated session and re-fetch only stale visible data. Resume a known AI job by id; do not re-submit its prompt.
- Show per-source freshness, preserve dated last-known values and distinguish offline from provider failure. Missing data is not zero.
- Do not assume timers, streaming requests or service workers keep running while iOS suspends the app. Persist durable work server-side before model execution.
- Financial edits and external commits require an active authenticated connection and explicit confirmation. Do not queue them for automatic delivery after reconnect.
- If adding a service worker, initially cache only versioned non-sensitive shell assets. History, financial API responses, attachments, auth and provider requests remain network-only/no-store. An unavailable offline shell must not display fabricated balances.
- Use a new-version prompt at a safe boundary. Never reload during a financial confirmation or while an unsaved draft would be lost. Include rollback and stale-chunk recovery.
- Web-app installation does not provide Face ID, native background execution, native notifications or device storage guarantees automatically. Add and test such capabilities separately if requested.

## Measurable performance targets

These are initial acceptance budgets, not measured results. Record the device, OS, browser, standalone/tab mode, network, dataset and cold/warm cache on every report.

| Measure | Initial target | Verification |
|---|---|---|
| Cold shell on representative mid-range phone / throttled mobile network | LCP ≤2.5 s, CLS ≤0.1 | Repeat cold loads and inspect largest contentful element; report median and slow runs |
| Interaction responsiveness | INP ≤200 ms where field collection is available | Use field data when available; lab traces of filter, nav, chart and input actions support but do not replace field evidence |
| Initial application JS | Aim ≤150 KB gzip excluding separately measured auth SDK | Bundle report; route-split charts/markdown; include auth cost explicitly in total payload |
| Repeat tab navigation | Target visible response ≤100 ms before data loading state | Trace on physical device with representative records |
| Input/scroll smoothness | No repeated >50 ms tasks during typing and list scrolling | Performance trace; cap rendering work and avoid whole-thread re-renders |
| Long activity/history | Bounded pages (e.g. 50 rows), cursor pagination, virtualize only when necessary | 10k transaction fixture and 200-message thread; preserve focus/scroll |
| Charts | Mount only visible/reached charts; decimate visual series while keeping precise source | Test six-month daily view and multi-year snapshots; avoid loading every chart on Home startup |
| Network | Deduplicate visible requests; cancel obsolete filters; no provider refresh on each navigation | Request trace and stale-while-display behavior; billable actions remain explicit |

Recharts and Markdown are already route/lazy-load candidates. Keep the accounting on the server. Memoize derived presentation only when traces justify it. Avoid speculative prefetch of all financial screens or entire chat transcripts. A full library redesign is unnecessary if measurement shows targeted splitting and bounded rendering meet the budget. [Core Web Vitals thresholds](https://web.dev/articles/vitals).

## Device acceptance matrix

| Environment | Must exercise |
|---|---|
| Small iPhone (360–375 CSS px class), Safari tab and Home Screen | Sign-in, launch icon, safe areas, all tabs, chart selection, attachment picker, chat keyboard, history reload/relaunch |
| Standard and large iPhone (390/430 CSS px class) | Portrait/landscape, keyboard open/closed, text size, app switch, screen lock, OS memory eviction, reconnect |
| Mid-range Android (360–412 CSS px), Chrome tab and installed app | Install, system Back, keyboard resize, draft/retry, file selection, accessibility focus |
| Tablet / desktop / external keyboard | Wider layout, route history, tab order, no clipped sheets, chart exact-value alternatives |
| VoiceOver / TalkBack; reduced motion; 200% text | Full core journey without hover or color-only signals; readable labels and focus return |

For each environment test: cold launch → sign-in → Home → chart drilldown → Activity detail → Review split → provider return simulation → saved AI conversation → background during generation → resume → sign-out → re-auth. Repeat with empty/error/stale/offline states. Use synthetic provider fixtures for automated tests. Actual provider acceptance and a production rollout require their own evidence.

## Public counterpart

The public starter should receive the generic shell, lifecycle and saved-chat interfaces with adopter-owned hosting/auth/provider settings. Secure HTTPS deployment remains a separate implementation gap in the current loopback-only starter. Never copy personal hosts, credentials, accounts, conversation history or device screenshots containing real balances to make its installation guide look complete.
