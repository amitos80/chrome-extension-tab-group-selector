# Tasks: Session snapshots (scheduled capture)

**Plan:** [`docs/development/plans/session-snapshots.md`](../plans/session-snapshots.md) · **Spec:** [`session-snapshots.md`](../specs/session-snapshots.md)

| ID | Priority | Estimate | Depends on |
|----|----------|----------|------------|
| SN1 | P0 | 20m | — |
| SN2 | P0 | 35m | SN1 |
| SN3 | P0 | 45m | SN2 |
| SN4 | P0 | 25m | SN3 |
| SN5 | P0 | 20m | SN4 |
| SN6 | P1 | 15m | SN5 |

---

## SN1 — Manifest: `alarms` + `windows`

**Goal:** Declare permissions required for scheduling and window enumeration.

### Steps

1. Edit [`chrome-extension/manifest.ts`](../../../chrome-extension/manifest.ts).
2. Append **`alarms`** and **`windows`** to the `permissions` array (keep existing cast pattern if needed for `ManifestType`).
3. Rebuild / load unpacked extension to confirm manifest parses.

### Completion criteria

- [ ] `permissions` includes `alarms` and `windows`.
- [ ] No manifest validation errors in build output.

---

## SN2 — Storage module: types + `prependSnapshot`

**Goal:** Persist rolling history under key **`sessionSnapshots`** with **`@extension/storage`** (`liveUpdate: true`), max **30** entries.

### Steps

1. Add [`packages/storage/lib/impl/session-snapshots-storage.ts`](../../../packages/storage/lib/impl/session-snapshots-storage.ts) with `TabBackup`, `WindowBackup`, `SessionSnapshot`, `sessionSnapshotsStorage`, and **`prependSnapshot`** following the same shapes as the snippet below (line order matches the shipped file).

   ```ts
   const SESSION_SNAPSHOTS_STORAGE_KEY = 'sessionSnapshots'

   const MAX_SESSION_SNAPSHOT_RETENTION = 30

   const storage = createStorage<SessionSnapshot[]>(SESSION_SNAPSHOTS_STORAGE_KEY, [], {
     storageEnum: StorageEnum.Local,
     liveUpdate: true,
   })

   type SessionSnapshotsStorageType = typeof storage & {
     prependSnapshot: (snapshot: SessionSnapshot) => Promise<void>
   }

   const sessionSnapshotsStorage: SessionSnapshotsStorageType = {
     ...storage,
     prependSnapshot: async snapshot => {
       await storage.set(prev => [snapshot, ...prev].slice(0, MAX_SESSION_SNAPSHOT_RETENTION))
     },
   }

   export { MAX_SESSION_SNAPSHOT_RETENTION, SESSION_SNAPSHOTS_STORAGE_KEY, sessionSnapshotsStorage }
   ```

2. Complete the file to match shipped [`session-snapshots-storage.ts`](../../../packages/storage/lib/impl/session-snapshots-storage.ts): **`import`** at top; interfaces **`TabBackup`**, **`WindowBackup`**, **`SessionSnapshot`** above the keyed block in step 1; at EOF **`export type { SessionSnapshot, SessionSnapshotsStorageType, TabBackup, WindowBackup }`** then **`export { MAX_SESSION_SNAPSHOT_RETENTION, SESSION_SNAPSHOTS_STORAGE_KEY, sessionSnapshotsStorage }`**.

3. Export from [`packages/storage/lib/impl/index.ts`](../../../packages/storage/lib/impl/index.ts).

### Completion criteria

- [ ] File &lt; 250 LOC; functions small (split if ESLint/max-lines flagged).
- [ ] Public API mirrors other `*-storage.ts` patterns.

---

## SN3 — `snapshot-service.ts` capture pipeline

**Goal:** Alarm handler entrypoint + serialization matching spec semantics.

### Steps

1. Add [`chrome-extension/src/background/snapshot-service.ts`](../../../chrome-extension/src/background/snapshot-service.ts).

2. Implement **`handleSnapshotAlarm`**:

   ```ts
   const isPremium = await checkPremiumStatus()
   if (!isPremium) return
   try { await processSnapshotCapture() } catch (e) { console.error('[SNAPSHOT] Automated capture pipeline aborted:', e) }
   ```

3. Implement **`processSnapshotCapture`** (`Promise.all` for `chrome.windows.getAll({ populate: true })` + `chrome.tabGroups.query({})`), build **`Map`** of groups by id, map windows via **`serializeWindow`**, **`filter`** windows with **`tabs.length > 0`**, **`prependSnapshot`**.

4. **`serializeTab`**: resolve group via **`tab.groupId`** vs **`chrome.tabGroups.TAB_GROUP_ID_NONE`**; **`title`/`url`** default **`''`**; optionally include **`groupTitle`**, **`groupColor`**.

### Completion criteria

- [ ] No URL filtering stripping `chrome://` / extension pages.
- [ ] Ungrouped tabs omit group fields.
- [ ] Imports **`checkPremiumStatus`** from `./entitlements` and **`sessionSnapshotsStorage`** from `@extension/storage`.

---

## SN4 — `snapshot-scheduler.ts` + bootstrap

**Goal:** Periodic alarm (**30 minutes** default) without duplicate **`onAlarm`** listeners.

### Steps

1. Add [`chrome-extension/src/background/snapshot-scheduler.ts`](../../../chrome-extension/src/background/snapshot-scheduler.ts):

   - **`SNAPSHOT_ALARM_NAME`** — must match spec: **`'automated-session-snapshot'`**.

2. **`initSnapshotScheduler`**: guard module flag so **`chrome.alarms.onAlarm.addListener`** runs **once**; delegate to **`handleSnapshotAlarm`** when name matches.

3. **`ensureAlarmRegistered`**: `chrome.alarms.get(name)`; if missing, **`chrome.alarms.create(name, { periodInMinutes: 30 })`**.

4. In [`chrome-extension/src/background/index.ts`](../../../chrome-extension/src/background/index.ts), import and call **`void initSnapshotScheduler()`** near other startup (e.g. after **`initTabGroupRegistry`**).

### Completion criteria

- [ ] Extension startup registers alarm + listener.
- [ ] Second hypothetical init does not stack duplicate listeners.

---

## SN5 — Build, ESLint, manual QA

### Steps

1. `pnpm eslint` on touched paths (or full project if required by CI).
2. `pnpm run build`.
3. Manual QA (dev build, Premium dev toggle on Options):

   - Trigger wait for alarm **or** temporarily lower interval in dev-only code (optional; if not, wait 30+ min or use `chrome.alarms` devtools).
   - Inspect **`chrome.storage.local`** → **`sessionSnapshots`**: array length ≤ 30, newest first.
   - Turn Premium **off** → confirm no new entries after next alarm (compare timestamp).

### Completion criteria

- [ ] ESLint + build green.
- [ ] QA checklist recorded (above) satisfied or noted limitations.

---

## SN6 — Post-merge summary doc (optional but standard workflow)

After implementation is merged:

1. Add [`docs/development/summaries/session-snapshots.md`](../summaries/session-snapshots.md) with what shipped, files touched, known limitations.

### Completion criteria

- [ ] Summary exists when closing the feature formally.
