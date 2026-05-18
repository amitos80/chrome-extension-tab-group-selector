import { createStorage, StorageEnum } from '../base/index.js'

type BulkImportUIState = {
  initialBulkImportCompleted: boolean
}

/** WHY: Separate key avoids churn on large registry blob; popup subscribes via liveUpdate. v2 resets mistaken completions from the old registry-non-empty migration. */
const BULK_IMPORT_UI_STORAGE_KEY = 'bulk-import-ui-v2'

const bulkImportUiStorage = createStorage<BulkImportUIState>(
  BULK_IMPORT_UI_STORAGE_KEY,
  {
    initialBulkImportCompleted: false,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
)

export type { BulkImportUIState }
export { bulkImportUiStorage, BULK_IMPORT_UI_STORAGE_KEY }
