# Tasks: Auto-tab grouping

| ID | Priority | Est. |
|----|----------|------|
| A1 | P0 | 15m |
| A2 | P0 | 20m |
| A3 | P0 | 30m |
| A4 | P0 | 25m |
| A5 | P0 | 15m |
| A6 | P0 | 45m |
| A7 | P1 | 25m |

## A1 — Docs

Plan: [`docs/development/plans/auto-tab-grouping.md`](../plans/auto-tab-grouping.md). Spec: [`docs/development/specs/auto-grouping-tabs.md`](../specs/auto-grouping-tabs.md).

## A2 — Storages (`@extension/storage`)

1. [`packages/storage/lib/impl/premium-entitlement-storage.ts`](../../../packages/storage/lib/impl/premium-entitlement-storage.ts): `{ manualPremiumUnlock: boolean }`, default `false`; `setManualPremiumUnlock`; export key constant.
2. [`packages/storage/lib/impl/auto-group-rules-storage.ts`](../../../packages/storage/lib/impl/auto-group-rules-storage.ts): `{ rules: AutoGroupRule[] }`; `ChromeTabGroupColor` union matching 9 Chrome colors + exported list for Options `<select>`; versioned storage key `auto-group-rules-v1`.
3. Export both from [`impl/index.ts`](../../../packages/storage/lib/impl/index.ts).

## A3 — Matcher

[`chrome-extension/src/background/auto-group/url-matcher.ts`](../../../chrome-extension/src/background/auto-group/url-matcher.ts): `wildcardToRegex`, `isUrlMatch` from spec (~15 LOC functions).

## A4 — Entitlements

[`chrome-extension/src/background/entitlements.ts`](../../../chrome-extension/src/background/entitlements.ts): `checkPremiumStatus()` reads `premiumEntitlementStorage`.

## A5 — Handler

[`chrome-extension/src/background/auto-group/auto-group-handler.ts`](../../../chrome-extension/src/background/auto-group/auto-group-handler.ts): `<200` lines—`handleTabUrlUpdate`, `skip`, `executeTabRouting`, `findExistingOpenGroup`, `createDecoratedGroup`, load rules storage.

## A6 — Wire service worker

[`chrome-extension/src/background/index.ts`](../../../chrome-extension/src/background/index.ts): `chrome.tabs.onUpdated.addListener` → `void handleTabUrlUpdate(...)`.

## A7 — Options + i18n + README blurb

- New section UI (recommended component file under [`pages/options/src/`](../../../pages/options/src/)): dev Premium toggle + rules CRUD gated on `manualPremiumUnlock`.
- [`packages/i18n/locales/en/messages.json`](../../../packages/i18n/locales/en/messages.json): strings for section, forms, gated copy.
- README: brief “Development: Premium toggle for auto-grouping tests” bullet.

### QA checklist

- [ ] `manualPremiumUnlock` OFF → navigations do not assign groups.
- [ ] ON → first matching rule assigns to existing titled+colored group or creates one.
- [ ] Skip `chrome://`, `chrome-extension://`, `about:blank`.
- [ ] First rule wins ordering.
- [ ] `pnpm run build`; ESLint on touched paths.
