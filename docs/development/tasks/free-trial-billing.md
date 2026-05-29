# Tasks: Free trial + Lemon Squeezy billing

**Plan:** [`docs/development/plans/free-trial-billing.md`](../plans/free-trial-billing.md) · **Spec:** [`free-trial-billing.md`](../specs/free-trial-billing.md)

| ID | Priority | Estimate | Depends on |
|----|----------|----------|------------|
| BL1 | P0 | 60m | — |
| BL2 | P0 | 45m | BL1 |
| BL3 | P0 | 75m | BL2 |
| BL4 | P0 | 70m | BL3 |
| BL5 | P0 | 50m | BL3 |
| BL6 | P1 | 55m | BL2 |
| BL7 | P1 | 40m | BL3 |
| BL8 | P1 | 45m | BL4–BL7 |

---

## BL1 — Spec + billing constants + entitlement storage v2

### Completion criteria

- [x] Spec, plan, tasks docs authored
- [x] `billing-constants.ts`, `premium-access.ts`, storage v2 + migration

---

## BL2 — Resolver + trial bootstrap + checkPremiumStatus

### Steps

1. Update [`entitlements.ts`](../../../chrome-extension/src/background/entitlements.ts) to use `resolvePremiumAccess`.
2. Add `getEntitlementStatus()` export for UI messages.
3. Register `chrome.runtime.onInstalled` → `startTrialOnFreshInstall()` when `details.reason === 'install'`.

### Completion criteria

- [ ] `checkPremiumStatus` returns trial premium for 14 days after fresh install
- [ ] Updates do not start a new trial

---

## BL3 — Lemon Squeezy client + background handlers

### Steps

1. Add [`lemon-squeezy-license.ts`](../../../chrome-extension/src/background/lemon-squeezy-license.ts).
2. Wire `ACTIVATE_LICENSE`, `RESTORE_LICENSE`, `GET_ENTITLEMENT_STATUS`, `OPEN_CHECKOUT` in [`index.ts`](../../../chrome-extension/src/background/index.ts).
3. Add env vars to `@extension/env` types and `.env.example`.

### Completion criteria

- [ ] Activate + validate persist license fields
- [ ] API key only used in background

---

## BL4 — Options BillingSection

### Steps

1. Add [`BillingSection.tsx`](../../../pages/options/src/components/BillingSection.tsx) with `id="billing"`.
2. Replace dev Premium section in [`Options.tsx`](../../../pages/options/src/Options.tsx); dev toggle behind `import.meta.env.MODE === 'development'`.

### Completion criteria

- [ ] Trial countdown, purchase buttons, license activate/restore

---

## BL5 — PremiumUpgradePanel + switcher CTA

### Steps

1. Add [`PremiumUpgradePanel`](../../../packages/ui/lib/components/PremiumUpgradePanel.tsx).
2. Replace upgrade block in both [`SwitcherOverlay.tsx`](../../../pages/new-tab/src/components/SwitcherOverlay.tsx) files; remove `switcherPremiumUpgradeButton` i18n.

### Completion criteria

- [ ] Yearly + lifetime buttons; license link to Options `#billing`

---

## BL6 — usePremiumAccess hook

### Steps

1. Add [`use-premium-access.ts`](../../../packages/shared/lib/hooks/use-premium-access.ts).
2. Refactor popup, new-tab, content-ui, options, AutoGroupingRulesSection.

### Completion criteria

- [ ] No production UI reads `manualPremiumUnlock` directly for gating

---

## BL7 — Daily validation alarm + docs

### Steps

1. Add [`license-validation-scheduler.ts`](../../../chrome-extension/src/background/license-validation-scheduler.ts).
2. i18n strings for billing; README + `.env.example`.

### Completion criteria

- [ ] Daily revalidation; subscription offline grace honored

---

## BL8 — QA + summary

### Completion criteria

- [ ] Manual QA matrix in summary doc
- [ ] `docs/development/summaries/free-trial-billing.md` written
