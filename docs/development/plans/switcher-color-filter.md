# Development plan: Switcher color filter

## Objective

Add **multi-select color filtering** to the Tab Group Switcher search field: nine Chrome color chips inside the input (right side), opacity **0.7** default / **1.0** when selected. Filter list by selected colors; **0 or all 9 selected** = no color filter.

## Technical approach

- Shared colors: [`packages/storage/lib/impl/tab-group-colors.ts`](../../packages/storage/lib/impl/tab-group-colors.ts)
- Filter helpers: [`packages/ui/lib/switcher/filter-switcher-entries.ts`](../../packages/ui/lib/switcher/filter-switcher-entries.ts)
- UI: [`packages/ui/lib/components/SwitcherSearchWithColorFilter.tsx`](../../packages/ui/lib/components/SwitcherSearchWithColorFilter.tsx)
- Integrate in both [`SwitcherOverlay.tsx`](../../pages/content-ui/src/components/SwitcherOverlay.tsx) surfaces (content-ui + new-tab)

## Success metrics

- Chips visible in search on both switcher surfaces
- Multi-color union filter; all 9 selected = unfiltered
- Free tier: color filter expands list like search
- Builds pass for storage, ui, content-ui, new-tab

## Companion documents

- Tasks: [`docs/development/tasks/switcher-color-filter.md`](../tasks/switcher-color-filter.md)
- Summary: [`docs/development/summaries/switcher-color-filter.md`](../summaries/switcher-color-filter.md)
