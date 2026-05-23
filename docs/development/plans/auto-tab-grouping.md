# Development plan: Auto-grouping tabs

## Objective

Premium-gated automation that assigns tabs to labeled, color-coded groups from user-defined URL patterns when a tab navigates to a matching URL—per [`docs/development/specs/auto-grouping-tabs.md`](../specs/auto-grouping-tabs.md).

## Technical approach

- **Rules**: Typed array persisted via [`packages/storage/lib/impl/auto-group-rules-storage.ts`](../../../packages/storage/lib/impl/auto-group-rules-storage.ts); first match wins; CRUD from Options.
- **Entitlements**: `checkPremiumStatus()` in [`chrome-extension/src/background/entitlements.ts`](../../../chrome-extension/src/background/entitlements.ts) backed by [`premium-entitlement-storage`](../../../packages/storage/lib/impl/premium-entitlement-storage.ts) (`manualPremiumUnlock` defaults `false`; Options toggle documents dev/testing until store billing exists).
- **Matcher**: Pure [`url-matcher.ts`](../../../chrome-extension/src/background/auto-group/url-matcher.ts) wildcard → regex (aligned with spec).
- **Runtime**: [`auto-group-handler.ts`](../../../chrome-extension/src/background/auto-group/auto-group-handler.ts) keyed off `tabs.onUpdated` when `changeInfo.url`; skip privileged URLs; `tabs.group` + `tabGroups.update` mirroring [`restore-closed-group.ts`](../../../chrome-extension/src/background/restore-closed-group.ts).
- **User override**: Handler runs only on URL-change events—drag-out without navigation does not re-trigger (SPA / reload nuances in task QA).

## Success criteria

- Free tier (`manualPremiumUnlock` false): no auto-grouping; Options explains Premium.
- Dev unlock ON: matching navigation groups tab; skips `chrome://`, `chrome-extension://`, `about:blank`; first rule wins.
