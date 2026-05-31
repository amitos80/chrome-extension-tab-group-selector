# Tasks: Cross-device sync toggle

**Plan:** [`docs/development/plans/cross-device-sync-toggle.md`](../plans/cross-device-sync-toggle.md) · **Sync spec:** [`cross-device-sync.md`](../specs/cross-device-sync.md)

| ID | Priority | Estimate | Depends on |
|----|----------|----------|------------|
| CDT1 | P0 | 25m | — |
| CDT2 | P0 | 40m | CDT1 |
| CDT3 | P0 | 35m | CDT1 |
| CDT4 | P1 | 20m | CDT2, CDT3 |
| CDT5 | P0 | 25m | CDT4 |

---

## CDT1 — Preference storage

**Goal:** Persist user opt-in with default **`false`**.

### Steps

1. Add [`packages/storage/lib/impl/cross-device-sync-preference-storage.ts`](../../../packages/storage/lib/impl/cross-device-sync-preference-storage.ts).
2. Export **`CROSS_DEVICE_SYNC_PREFERENCE_STORAGE_KEY`**, **`crossDeviceSyncPreferenceStorage`**, **`setCrossDeviceTabGroupsSyncEnabled`** from [`packages/storage/lib/impl/index.ts`](../../../packages/storage/lib/impl/index.ts).
3. Run **`pnpm -F @extension/storage ready`**.

### Completion criteria

- [ ] Fresh profile **`get()`** returns **`crossDeviceTabGroupsSyncEnabled: false`**.
- [ ] Setter persists and **`liveUpdate`** fires in UI.

---

## CDT2 — Background gating

**Goal:** Gate all sync paths on Premium **and** toggle; react to preference changes.

### Steps

1. Add [`chrome-extension/src/background/cross-device-sync-allowed.ts`](../../../chrome-extension/src/background/cross-device-sync-allowed.ts) with **`resolveCrossDeviceSyncAllowed()`**.
2. Gate **`pushWorkspacesToCloud`**, **`mergeInboundPayload`**, **`coldStartPullFromSync`**, **`scheduleDebouncedPush`** in [`cross-device-sync.ts`](../../../chrome-extension/src/background/cross-device-sync.ts).
3. On local **`CROSS_DEVICE_SYNC_PREFERENCE_STORAGE_KEY`** change: disable → **`clearCrossDeviceSyncPushDebouncer()`** only; enable → cold pull + push.
4. Log **`skipped (toggle off)`** vs **`skipped (premium off)`**.
5. Run **`pnpm -F chrome-extension build`**.

### Completion criteria

- [ ] Toggle off: no outbound **`sync.set`**; inbound merge skipped.
- [ ] Toggle on + Premium: sync resumes without reload.
- [ ] Disable does **not** call **`sync.remove`**.

---

## CDT3 — Options UI + i18n

**Goal:** Toggle + beta notice + Premium lock in Options.

### Steps

1. Add [`pages/options/src/components/CrossDeviceSyncSection.tsx`](../../../pages/options/src/components/CrossDeviceSyncSection.tsx).
2. Wire into [`pages/options/src/Options.tsx`](../../../pages/options/src/Options.tsx) (after New tab section).
3. Add EN keys in [`packages/i18n/locales/en/messages.json`](../../../packages/i18n/locales/en/messages.json) and KO in [`packages/i18n/locales/ko/messages.json`](../../../packages/i18n/locales/ko/messages.json).
4. Run **`pnpm -F @extension/options build`**.

### Completion criteria

- [ ] Beta notice always visible in section.
- [ ] Non-Premium: switch disabled with caption.
- [ ] Premium user can toggle on/off.

---

## CDT4 — Documentation

**Goal:** Plan/tasks/summary + README/spec updates.

### Steps

1. This file + plan + summary under **`docs/development/`**.
2. Update [`README.md`](../../../README.md) cross-device bullet (opt-in, beta).
3. Update [`docs/development/specs/cross-device-sync.md`](../specs/cross-device-sync.md) eligibility (Premium + toggle).

### Completion criteria

- [ ] Docs linked from plan.
- [ ] README reflects default-off behavior.

---

## CDT5 — Manual QA

| Step | Expected |
|------|----------|
| Fresh install, Premium, toggle off | No **`[SYNC][outbound] sync.set`** |
| Enable toggle | **`[SYNC][preference]`** cold pull + push |
| Disable toggle | Push/pull stop; cloud key still present |
| Free tier | Toggle UI disabled; sync never runs |
| Dual profile | Sync only when **both** opt in + Premium |

### Completion criteria

- [ ] Checklist executed on two Chrome profiles (or documented blockers).
