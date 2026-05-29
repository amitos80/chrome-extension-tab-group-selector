# Implementation summary: Free trial + Lemon Squeezy billing

**Date:** 2026-05-29  
**Plan:** [`docs/development/plans/free-trial-billing.md`](../plans/free-trial-billing.md)

## What was implemented

| Task | Status |
|------|--------|
| BL1 Spec + entitlement storage v2 | Done |
| BL2 `resolvePremiumAccess` + install trial | Done |
| BL3 Lemon Squeezy client + background messages | Done |
| BL4 Options `BillingSection` | Done |
| BL5 `PremiumUpgradePanel` in switcher | Done |
| BL6 `usePremiumAccess` hook | Done |
| BL7 Daily validation alarm + env/README | Done |
| BL8 Summary + QA matrix | Done |

## Files created / modified

- `packages/storage/lib/billing-constants.ts`
- `packages/storage/lib/impl/premium-access.ts`
- `packages/storage/lib/impl/premium-entitlement-storage.ts` (v2 + migration)
- `chrome-extension/src/background/entitlements.ts`
- `chrome-extension/src/background/lemon-squeezy-config.ts`
- `chrome-extension/src/background/lemon-squeezy-license.ts`
- `chrome-extension/src/background/license-validation-scheduler.ts`
- `chrome-extension/src/background/index.ts`
- `packages/shared/lib/hooks/use-premium-access.ts`
- `packages/ui/lib/components/PremiumUpgradePanel.tsx`
- `pages/options/src/components/BillingSection.tsx`
- `pages/options/src/Options.tsx`
- Switcher overlays, popup, new-tab, content-ui, AutoGroupingRulesSection
- `packages/i18n/locales/en/messages.json`
- `.env.example`, `README.md`
- `docs/development/specs|plans|tasks|summaries/free-trial-billing.md`

## Manual QA matrix

| Scenario | Expected |
|----------|----------|
| Fresh install | 14-day trial; Options shows days remaining |
| Trial day 15, no license | Free tier limits (3 groups, no auto-group/sync) |
| Activate valid yearly key | Premium; plan shows Yearly |
| Expired subscription + validate | License cleared; free tier |
| Activate lifetime key | Premium; plan shows Lifetime |
| Offline >7d since last validate (subscription) | Premium off until network validate |
| `pnpm dev` | Dev Premium toggle visible |
| `pnpm build` | Dev toggle hidden; billing section visible |

## Known limitations

- Lemon Squeezy API key is embedded in the background bundle at build time (standard for MV3 without a backend).
- Checkout URLs must be configured before purchase buttons open a tab.
- Users upgrading from pre-billing installs do not receive a retroactive trial (install-only `trialStartedAt`).
