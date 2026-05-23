# Tasks: Auto-grouping Options UI (settings spec alignment)

**Plan:** [`docs/development/plans/auto-grouping-tabs-settings.md`](../plans/auto-grouping-tabs-settings.md) · **Specs:** [`auto-grouping-tabs-settings.md`](../specs/auto-grouping-tabs-settings.md), runtime [`auto-grouping-tabs.md`](../specs/auto-grouping-tabs.md)

| ID | Priority | Estimate | Depends on |
|----|----------|----------|-------------|
| S1 | P0 | 25m | — |
| S2 | P0 | 45m | S1 |
| S3 | P0 | 40m | S2 |
| S4 | P0 | 30m | S3 |
| S5 | P1 | 20m | S4 |
| S6 | P0 | 25m | S4 |

## S1 — Scaffolding & barrel

**Goal:** Establish folder [`pages/options/src/components/auto-grouping/`](../../../pages/options/src/components/auto-grouping/) without behavior change initially (move + re-export) or stub files exporting same `AutoGroupingRulesSection` signature.

### Steps

1. Create **`pages/options/src/components/auto-grouping/`** directory.
2. Optionally add **`index.ts`** exporting public surface (e.g. `AutoGroupingRulesSection` only).
3. Update [`pages/options/src/Options.tsx`](../../../pages/options/src/Options.tsx) import path if section moves from `components/AutoGroupingRulesSection.tsx` → `components/auto-grouping/AutoGroupingRulesSection.tsx` (or keep flat file temporarily—pick one incremental strategy).
4. Run **`pnpm eslint`** / **`pnpm run build`** for options package slice.

### Completion criteria

- [ ] Folder exists (or refactor path unchanged if deferred to S4).
- [ ] Extension Options page still renders auto-group section.
- [ ] No functional regression.

---

## S2 — Extract draft hook (`useAutoGroupingRulesDraft`)

**Goal:** Isolate draft state machine from JSX to keep components under **25 lines** logic each.

### Steps

1. Add [`pages/options/src/components/auto-grouping/useAutoGroupingRulesDraft.ts`](../../../pages/options/src/components/auto-grouping/useAutoGroupingRulesDraft.ts) (exact name flexible).

2. Move from current section logic:

   - `editingId`, `draftPattern`, `draftTitle`, `draftColor` state  
   - `resetDraft`, `startAdd`, `startEdit`, `saveDraft`, `removeRule`

3. Dependencies: **`useStorage(autoGroupRulesStorage)`** for `rules` read + **`setRules`** mutations; **`t()`** only if validation keeps `window.alert(t(...))` inside hook—or pass **`onValidationError`** callback to keep hook storage-only.

4. Export shape e.g.

   ```ts
   export function useAutoGroupingRulesDraft(/* rules, setRules proxies */): {
     editingId,
     drafts,
     setters,
     startAdd,
     startEdit,
     resetDraft,
     saveDraft,
     removeRule,
   }
   ```

5. Split any function **>25 lines** into small pure helpers **`appendRule`**, **`replaceRule`** in same file (private).

### Completion criteria

- [ ] **`useAutoGroupingRulesDraft.ts`** &lt; 250 LOC.
- [ ] Each exported function **≤25 lines** after split.
- [ ] Unit/integration: manual QA add / edit / delete / cancel still works post-wiring.

---

## S3 — Presentational **`AutoGroupingRuleItem`**

### Steps

1. Create **`AutoGroupingRuleItem.tsx`** with props:

   - `rule: AutoGroupRule`  
   - `isLight: boolean`  
   - `colorSwatchClass: Record<ChromeTabGroupColor, string>` or pass **single** Tailwind token from parent constants  
   - `onEdit: (id)` / `onDelete: (id)`  

2. No storage calls inside item—callbacks only.

3. Apply theme classes matching current list-row styling [`AutoGroupingRulesSection.tsx`](../../../pages/options/src/components/AutoGroupingRulesSection.tsx) (~lines 150–177).

### Completion criteria

- [ ] File &lt; 250 LOC; component ≤ 25 lines.
- [ ] A11y: buttons have discernible labels (reuse `t('optionAutoGroupingEdit')` etc.).

---

## S4 — **`AutoGroupingRuleList`**, **`AutoGroupingRuleForm`**, slim **`AutoGroupingRulesSection`**

### Steps

1. **`AutoGroupingRuleList.tsx`:**

   - If `rules.length === 0`, render **`null`** (section currently hides list when empty) or optional empty helper text aligned with [`auto-grouping-tabs-settings.md`](../specs/auto-grouping-tabs-settings.md) “No automation rules” copy—**reuse i18n** if string exists only in spec prose; skip if product prefers purely empty UI.

   - **`rules.map`** → **`<AutoGroupingRuleItem />`**.

2. **`AutoGroupingRuleForm.tsx`:**

   - Move labels/inputs/select + Save/Cancel from current inline block (~lines 182–256).
   - Props: draft values, `onChange*` setters from hook, **`onSave`** / **`onCancel`**, **`isLight`**.

3. **`AutoGroupingRulesSection.tsx`:**

   - Keep section header, Premium dev toggle row (`switchTrackPlain` prop), gated intro + warning strip.
   - Compose **List**, **Form**, **Add Rule** button; wire **hook**.
   - Target **≤120 lines** ideally; enforce **≤250** hard ceiling.

### Completion criteria

- [ ] **`AutoGroupingRulesSection.tsx`** &lt; 250 LOC total.
- [ ] **`AutoGroupingRuleList.tsx`** + **`AutoGroupingRuleForm.tsx`** each &lt; 250 LOC.
- [ ] **`pnpm eslint`** fixes import order (`import-x`) for new files.
- [ ] Visual parity screenshot or manual diff with [`Options.tsx`](../../../pages/options/src/Options.tsx) theme contexts.

---

## S5 — Optional **`AutoGroupingPremiumDevRow.tsx`**

### Steps

1. If section still bulky after S4: extract Premium dev toggle block (~same lines as current divider + switch).

2. Pass **`manualPremiumUnlock`**, **`switchTrackPlain`**, **`isLight`**.

### Completion criteria

- [ ] Section file still under LOC budget.
- [ ] Popup / Options premium toggles UX unchanged.

---

## S6 — Docs & QA handoff

### Steps

1. Add **`docs/development/summaries/auto-grouping-tabs-settings.md`** after implementation with table of touched files + QA checklist.
2. Link from [`plans/auto-grouping-tabs-settings.md`](../plans/auto-grouping-tabs-settings.md) (already referenced).

### QA checklist (Options refactor)

- [ ] Premium **OFF**: gated copy visible; cannot add/edit list (mirror current).
- [ ] Premium **ON**: Add rule validates empty fields (**alert** parity).
- [ ] Premium **ON**: Edit + Save updates storage; Cancel clears draft.
- [ ] Premium **ON**: Delete confirm + list refresh.
- [ ] **`pnpm run build`** + ESLint on **`pages/options/src/components/auto-grouping/**`** and **`AutoGroupingRulesSection`** (if lingering path).

---

## Notes

- **Execution order suggestion:** S1 scaffolding → **S3 Item** first (easiest churn per original spec § “presentational items first”), then **S2 hook**, then **S4 list/form/section**.
- Alternate order (hook-first): S2 → S4 if you prefer data layer before JSX leaf components.
