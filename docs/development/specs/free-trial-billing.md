# Free trial and Lemon Squeezy billing

## Objective

Provide a **14-day trial** with all Premium features, then enforce the existing free-tier limits unless the user has an active **yearly ($18)** or **lifetime ($37)** license validated via **Lemon Squeezy**.

## Entitlement model

Storage key: `premium-entitlement-v1` (v2 shape, migrated on read).

| Field | Purpose |
|-------|---------|
| `trialStartedAt` | Set once on `runtime.onInstalled` with `reason === 'install'` |
| `licenseKey` | Lemon Squeezy license key |
| `licenseInstanceId` | Instance id returned by activate API (required for validate) |
| `licenseType` | `none` \| `subscription` \| `lifetime` |
| `subscriptionExpiresAt` | Epoch ms for yearly subscription |
| `lastValidatedAt` | Last successful API validation |
| `manualPremiumUnlock` | Dev-only override |

**Premium resolution:** [`resolvePremiumAccess`](../../../packages/storage/lib/impl/premium-access.ts) — order: dev → lifetime → subscription (incl. 7-day offline grace) → active trial → free.

## Lemon Squeezy

- **Activate:** `POST https://api.lemonsqueezy.com/v1/licenses/activate` on first key entry.
- **Validate:** `POST https://api.lemonsqueezy.com/v1/licenses/validate` on schedule and “Restore purchase”.
- **Checkout:** env URLs `CLI_CEB_LS_CHECKOUT_YEARLY_URL`, `CLI_CEB_LS_CHECKOUT_LIFETIME_URL` (opened in new tab).
- **API key:** `CLI_CEB_LS_API_KEY` — background only, never content scripts.

Variant ids `CLI_CEB_LS_VARIANT_YEARLY_ID` / `CLI_CEB_LS_VARIANT_LIFETIME_ID` map API `meta.variant_id` to `licenseType`.

## Background messages

| Type | Payload | Response |
|------|---------|----------|
| `GET_ENTITLEMENT_STATUS` | — | `PremiumAccessStatus` |
| `ACTIVATE_LICENSE` | `{ licenseKey: string }` | `{ success, error? }` |
| `RESTORE_LICENSE` | — | `{ success, error? }` |
| `OPEN_CHECKOUT` | `{ plan: 'yearly' \| 'lifetime' }` | `{ success }` |

## UI

- **Options:** `BillingSection` — trial banner, plan badge, purchase buttons, license input, activate/restore.
- **Switcher:** `PremiumUpgradePanel` — yearly + lifetime buttons; remove `switcherPremiumUpgradeButton`.
- **Dev:** `manualPremiumUnlock` toggle only when `import.meta.env.MODE === 'development'`.

## Constraints

- Files ≤ 250 lines; functions ≤ 25 lines where practical.
- All gates use `checkPremiumStatus()` / `resolvePremiumAccess` — not raw `manualPremiumUnlock` in production paths.
