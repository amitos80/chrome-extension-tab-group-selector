# Implementation summary: Auto-tab grouping

Related follow-up (**Options modularization** vs [`specs/auto-grouping-tabs-settings.md`](../specs/auto-grouping-tabs-settings.md)): plan [`plans/auto-grouping-tabs-settings.md`](../plans/auto-grouping-tabs-settings.md), tasks [`tasks/auto-grouping-tabs-settings.md`](../tasks/auto-grouping-tabs-settings.md).

## Delivered

| Area | Detail |
|------|--------|
| Spec | Driven by [`docs/development/specs/auto-grouping-tabs.md`](../specs/auto-grouping-tabs.md). |
| Storages | [`premium-entitlement-storage.ts`](../../packages/storage/lib/impl/premium-entitlement-storage.ts), [`auto-group-rules-storage.ts`](../../packages/storage/lib/impl/auto-group-rules-storage.ts); exported via [`impl/index.ts`](../../packages/storage/lib/impl/index.ts). |
| Entitlements stub | [`chrome-extension/src/background/entitlements.ts`](../../chrome-extension/src/background/entitlements.ts). |
| Matcher | [`chrome-extension/src/background/auto-group/url-matcher.ts`](../../chrome-extension/src/background/auto-group/url-matcher.ts). |
| Runtime | [`auto-group-handler.ts`](../../chrome-extension/src/background/auto-group/auto-group-handler.ts); wired in [`chrome-extension/src/background/index.ts`](../../chrome-extension/src/background/index.ts) with `chrome.tabs.onUpdated`. |
| Options UI | [`pages/options/src/components/AutoGroupingRulesSection.tsx`](../../pages/options/src/components/AutoGroupingRulesSection.tsx); page width [`max-w-2xl`](../../pages/options/src/Options.tsx). |
| i18n | EN strings in [`packages/i18n/locales/en/messages.json`](../../packages/i18n/locales/en/messages.json). |
| Docs | README “Development: Premium & auto-grouping” note for manual Premium testing. |

## QA checklist

- [ ] Premium **off**: navigate to HTTPS tab → no grouping.
- [ ] Premium **on** + rule `*example.com*` (or similar) → navigation matches → tab joins matching named/colored group or new group created.
- [ ] `chrome://`, `chrome-extension://`, `about:blank` → skipped.
- [ ] Multiple rules → first ordered rule wins.
- [ ] `pnpm run build` + ESLint on touched paths.
