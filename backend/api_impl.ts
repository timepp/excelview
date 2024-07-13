import { BackendAPI } from '../api.ts'
import * as et from '../excel_tracker.ts'

export const apiImpl: BackendAPI = {
    launchExcel: async () => {
        await et.startNewTracker()
        return ''
    },
    getActiveExcelRow: async () => {
        return await et.getActiveExcelRow()
    }
}

export async function cleanUp() {
    await et.stopTracker()
}
