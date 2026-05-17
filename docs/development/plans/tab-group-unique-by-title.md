# Development plan: Unique tab group rows by title (last-write-wins)

## Objective and current situation

**Goal:** In tab group selection, **at most one row per meaningful group name**. The row must reflect the **latest observed state** for that name (`lastSeenAt` / most recent Chrome or persistence event).

**Today:** Rows are keyed by random `persistKey` (`crypto.randomUUID()`). Multiple Chrome groups or stale closed rows can still produce **duplicate titles** in the switcher after fingerprint-based dedupe (same-window reactivation, open-vs-closed fingerprint drop). Users still see two entries for the same visible name.

**Non-goal:** Changing Chrome’s native behaviour (Chrome still allows duplicate titles). We only unify **our persisted registry + snapshot**.

---

## Technical approach — options

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Storage-level canonical merge** | After each registry mutation, collapse rows that share a merge-eligible canonical title; winner = latest `lastSeenAt` (with tie-breakers). Optionally stable `persistKey` per canonical title. | Single source of truth; switcher stays simple; restore ID stable if persistKey derived | Must define title edge cases; interacts with reactivation logic |
| **B. Snapshot-only dedupe** | Keep storage as-is; dedupe in `buildSwitcherSnapshot` by normalized title. | Small diff | `persistKey` / restore ambiguous which URLs row wins; duplicates return after next write |
| **C. Per-window uniqueness** | Canonical key = `windowId + normalizedTitle`. | Safer for multi-window same name | User asked for global uniqueness by name; duplicates remain across windows |

**Chosen: A (storage-level canonical merge)** with optional snapshot defense kept minimal.

**Rationale:** Restore (`RESTORE_CLOSED_GROUP`) resolves **`persistKey` → `PersistedTabGroup`**. If uniqueness is only enforced in the UI, keys and `urls` diverge. Collapsing in storage keeps **one row per name** and makes **“last state”** unambiguous.

---

## Canonical title and merge eligibility

Reuse [`normalizeGroupTitle`](../../../packages/storage/lib/impl/tab-group-registry-fingerprint.ts) (trim, collapse whitespace, lowercase).

**Merge-eligible:** normalized title is **non-empty** and **not** the placeholder for unnamed groups (treat `normalizeGroupTitle('Untitled')` / empty display title as **ineligible**).

**WHY:** Many unrelated groups share **Untitled**. Globally merging them would collapse distinct groups into one row.

For ineligible titles, keep **current behaviour** (per-group identity + existing fingerprint dedupe / reactivation).

Optional product follow-up: encourage renaming in UI or disambiguate Untitled with suffix (out of scope unless requested).

---

## Winner selection (“last state”)

For each bucket of rows sharing the same **merge-eligible canonical title**:

1. **Primary:** Highest `lastSeenAt`.
2. **Tie-break:** Prefer `isOpen === true`.
3. **Next tie-break:** Prefer row with `chromeGroupId != null`.
4. **Final tie-break:** Highest `createdAt` or stable sort by `persistKey` (deterministic).

**Merged payload:** Use the **full winner row only** (no field-wise merge from losers). Losers are discarded from `groups`.

**WHY:** Matches “last state” literally and avoids ambiguous blending (e.g. mixed `urls` from two closed rows).

---

## Stable `persistKey` (recommended)

**Problem:** If the winner’s UUID changes whenever a different physical row “wins”, any UI or logging holding an old `persistKey` breaks.

**Recommendation:** For merge-eligible titles, set `persistKey` to a **deterministic** value derived from canonical title, e.g. `nm_` + fixed-length hash (SHA-256 hex or base64url), after sanitizing inputs.

- **New opens/closes** for that title keep updating the **same** row object (same key).
- **Migration:** Collapse existing duplicates → assign deterministic key to winner; drop losers.

**Legacy / Untitled rows:** Keep UUID `persistKey` until renamed to a merge-eligible title (then optional remap on next upsert).

---

## Integration points

1. **Pure function** `collapseRegistryGroupsByUniqueMergeableTitle(groups: PersistedTabGroup[]): PersistedTabGroup[]`  
   - Exported from storage impl (or `tab-group-registry-unique-title.ts`).  
   - Unit-test buckets, Untitled exclusion, tie-breaks.

2. **Call site:** At end of every `storage.set` reducer in [`all-tab-groups-registry-storage.ts`](../../../packages/storage/lib/impl/all-tab-groups-registry-storage.ts) — **after** mutations, **before** `pruneToCap`:
   - `groups = pruneToCap(collapse(...)(groups))`

3. **Ordering with fingerprint dedupe:**  
   - Run **collapse by title first**, then existing `dropClosedRowsDuplicatingOpenFingerprints` inside migrate/init path (or keep current `runRegistryFingerprintDedupeOnce` order: reconcile → fingerprint migration → … and insert **unique-title collapse** in a clearly documented order).  
   - Suggested init order after load: legacy migrate → URLs → dedupe version → **unique-title migration** → reconcile → fingerprint dedupe → sync.

4. **Reactivation [`findReactivatableClosedRowIndex`](../../../packages/storage/lib/impl/tab-group-registry-fingerprint.ts):**  
   - After global collapse by title, **at most one closed merge-eligible row** per name exists.  
   - **Window match:** Today same-window is required. After collapse, winner’s `windowId` is updated on each `upsertOpenFromChrome`; for closed rows, prefer relaxing same-window only when multiple candidates exist **or** document that single global closed row per name must match Chrome’s `windowId` on reopening — may require relaxing `windowsMatchForReactivation` for merge-eligible titles only when `candidates.length === 1`.  
   - **Validate in QA:** Close group in window A, recreate same title in window B, reopen — ensure reactivation or new row path still correct.

5. **Switcher snapshot:**  
   - With storage uniqueness for merge-eligible names, [`dedupeSwitcherSnapshotRows`](../../../chrome-extension/src/background/switcher-snapshot-utils.ts) becomes redundant for those titles but can remain as a safety net for Untitled / races.

6. **State version:** Add `registryUniqueTitleVersion?: number` (or bump a combined migration version), plus `runRegistryUniqueTitleCollapseOnce` mirroring fingerprint migration pattern.

---

## Architecture sketch

```text
Chrome events → upsertOpen / markClosed / reconcile
       → groups[] mutate
       → collapseRegistryGroupsByUniqueMergeableTitle
       → pruneToCap
       → persist

init → migrate unique-title once → reconcile → fingerprint dedupe → …
```

---

## Implementation phases

| Phase | Priority | Work |
|-------|----------|------|
| P1 | High | `isMergeEligibleCanonicalTitle`, `collapseRegistryGroupsByUniqueMergeableTitle`, deterministic `persistKey` helper |
| P2 | High | Wire collapse into `all-tab-groups-registry-storage` set paths; tests |
| P3 | High | One-shot migration + `registryUniqueTitleVersion`; hook in background init |
| P4 | Medium | Review `findReactivatableClosedRowIndex` + window match for single global closed row per name |
| P5 | Low | Docs / AGENTS restore notes if `persistKey` format changes for named groups |

---

## Success metrics

| Metric | Target |
|--------|--------|
| Switcher rows | At most one row per merge-eligible normalized title |
| State correctness | Row matches group that updated most recently (`lastSeenAt`) |
| Untitled | No global merge; list length unchanged modulo existing dedupe |
| Restore | `RESTORE_CLOSED_GROUP` resolves URL snapshot for the surviving row |
| Regression | Existing fingerprint dedupe + reactivation tests still pass |

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Two **open** Chrome groups with same custom title | Only one survives in registry; other stays in Chrome but disappears from switcher until renamed — **document as accepted** |
| Deterministic key collision (hash) | Extremely unlikely; use full hash length |
| Relaxing window match causes wrong reactivation | Gate relaxation on single candidate + merge-eligible only; add tests |

---

## Open questions (resolve before / during implementation)

1. Should **per-window** uniqueness be a future setting if users complain about hiding duplicate-named groups across windows?
2. Do we ever merge **`urls`** from a discarded closed row into the winner when the winner is “newer” but empty (probably **no** per last-state rule)?

**Status:** Implemented (see [`summaries/tab-group-unique-by-title.md`](../summaries/tab-group-unique-by-title.md)).
