import { createStorage, StorageEnum } from '../base/index.js'

interface TabBackup {
  title: string
  url: string
  groupTitle?: string
  groupColor?: string
}

interface WindowBackup {
  id: number
  tabs: TabBackup[]
}

interface SessionSnapshot {
  id: string
  timestamp: number
  windows: WindowBackup[]
}

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

export type { SessionSnapshot, SessionSnapshotsStorageType, TabBackup, WindowBackup }

export { MAX_SESSION_SNAPSHOT_RETENTION, SESSION_SNAPSHOTS_STORAGE_KEY, sessionSnapshotsStorage }
