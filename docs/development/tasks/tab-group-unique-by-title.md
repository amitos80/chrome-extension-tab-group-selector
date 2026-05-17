# Tasks: Unique registry rows by merge-eligible title

Plan: [`plans/tab-group-unique-by-title.md`](../plans/tab-group-unique-by-title.md)

## Task checklist

1. [x] **`isMergeEligibleCanonicalTitle`** in fingerprint module (excludes empty / Untitled canonical titles).
2. [x] **`tab-group-registry-unique-title.ts`**: collapse + deterministic `nm_*` `persistKey` + `finalizeRegistryGroupsForPersistence` (collapse → `pruneToCap`).
3. [x] Wire **`finalizeRegistryGroupsForPersistence`** into registry storage mutations, `removeByPersistKey`, migrate helpers (`urls`, legacy import, fingerprint dedupe path).
4. [x] **`registryUniqueTitleVersion`** + **`ensureRegistryUniqueTitleVersionDefault`** + **`runRegistryUniqueTitleCollapseOnce`** migration.
5. [x] **`initTabGroupRegistry`**: run unique-title collapse **before** `reconcileRegistryWithChrome`; **`reconcileRegistryWithChrome`** uses finalize on written groups.
6. [x] **`findReactivatableClosedRowIndex`**: merge-eligible titles allow single cross-window closed candidate; if multiple, prefer same-window pool before ambiguity tie-break.
7. [x] **`docs/AGENTS.md`** note on `nm_*` persistKey.

## Manual QA

1. Create two Chrome tab groups with the **same custom title** in one window → switcher shows **one** row (latest activity wins).
2. **Untitled** groups → multiple distinct rows remain.
3. Close a named group with saved URLs → restore from switcher → **`RESTORE_CLOSED_GROUP`** resolves **`nm_*`** key.
4. Reload extension → migration runs once; no duplicate titles for merge-eligible names.
