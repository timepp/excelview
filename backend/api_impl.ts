import { BackendAPI } from '../api.ts'
import * as et from '../excel_tracker.ts'

export const apiImpl: BackendAPI = {
    launchExcel: async () => {
        await et.startNewTracker()
        return ''
    },
    getActiveExcelRow: async () => {
        return await et.getActiveExcelRow()
    },
    reviewActiveExcelRow: async (col: number, value: string) => {
        return await et.setActiveExcelRowValue(col, value)
    },
    gotoRow: async (row: number) => {
        return await et.gotoRow(row)
    },
    navigateRow: async (offset: number) => {
        return await et.navigateRow(offset)
    }
}

export async function cleanUp() {
    await et.stopTracker()
}
