# Tasks: Switcher color filter

**Plan:** [`docs/development/plans/switcher-color-filter.md`](../plans/switcher-color-filter.md)

| ID | Priority | Estimate | Depends on |
|----|----------|----------|------------|
| SCF1 | P0 | 30m | — |
| SCF2 | P0 | 35m | SCF1 |
| SCF3 | P0 | 45m | SCF1 |
| SCF4 | P0 | 40m | SCF2, SCF3 |
| SCF5 | P1 | 20m | SCF4 |
| SCF6 | P0 | 20m | SCF5 |

---

## SCF1 — Color constants

1. Add [`tab-group-colors.ts`](../../../packages/storage/lib/impl/tab-group-colors.ts).
2. Import colors in [`auto-group-rules-storage.ts`](../../../packages/storage/lib/impl/auto-group-rules-storage.ts).
3. Export from [`index.ts`](../../../packages/storage/lib/impl/index.ts).

**Done when:** `pnpm -F @extension/storage ready` passes.

---

## SCF2 — Filter helpers

1. Add [`filter-switcher-entries.ts`](../../../packages/ui/lib/switcher/filter-switcher-entries.ts).
2. Export from [`packages/ui/lib/index.ts`](../../../packages/ui/lib/index.ts).

**Done when:** `isColorFilterActive`, `filterSwitcherEntries`, `toggleSelectedColor` exported.

---

## SCF3 — Search bar UI

1. Add [`SwitcherSearchWithColorFilter.tsx`](../../../packages/ui/lib/components/SwitcherSearchWithColorFilter.tsx).
2. Nine chips, opacity 0.7 / 1.0, `aria-pressed`.

**Done when:** `pnpm -F @extension/ui ready` passes.

---

## SCF4 — Overlay wiring

1. Update content-ui and new-tab [`SwitcherOverlay.tsx`](../../../pages/content-ui/src/components/SwitcherOverlay.tsx) copies.
2. Use `isListExpanded` for free-tier cap bypass.

**Done when:** Both overlays build.

---

## SCF5 — i18n + docs

1. EN/KO message keys for empty state + per-color aria labels.
2. Plan/tasks/summary + README note.

---

## SCF6 — QA

| Action | Expected |
|--------|----------|
| No chips selected | Full list (free-tier cap applies) |
| 1–8 colors | Filtered union |
| All 9 colors | Same as no filter |
| Search + color | AND |
| Free + color filter | Full filtered list |
