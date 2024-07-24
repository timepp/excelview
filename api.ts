export const api = {
    launchExcel: async function () {
        return await callAPI('launchExcel', ...arguments) as string
    },
    getActiveExcelRow: async function () {
        return await callAPI('getActiveExcelRow', ...arguments) as {
            result: 'ExcelNotRunning'|'SheetNotReady'|'ExcelTempError'|'Success',
            fileName: string,
            sheetName: string,
            row: number,
            headings: string[],
            data: string[]
        }
    },
    reviewActiveExcelRow: async function (col: number /* 1 based index*/, value: string) {
        return await callAPI('reviewActiveExcelRow', ...arguments) as boolean
    },
    gotoRow: async function (row: number) {
        return await callAPI('gotoRow', ...arguments) as boolean
    },
    navigateRow: async function (offset: number) {
        return await callAPI('navigateRow', ...arguments) as boolean
    }
}

export type BackendAPI = typeof api

let ws: WebSocket | null = null
let requestID = 0
const pendingPromises = new Map<number, (value: any) => void>()
async function getWebSocket() {
    if (!ws) {
        const proto = window.location.protocol
        const host = window.location.hostname
        const params = new URLSearchParams(window.location.search)
        const port = params.get('apiPort') || '22311'
        ws = new WebSocket(`${proto === 'https:' ? 'wss:' : 'ws:'}//${host}:${port}`)
        ws.onclose = () => { close() }
        ws.onmessage = e => {
            const { id, result } = JSON.parse(e.data)
            pendingPromises.get(id)!(result)
            pendingPromises.delete(id)
        }
        await new Promise(resolve => ws!.onopen = resolve)
    }
    return ws
}

// call api using web socket
export async function callAPI(cmd: string, ...args: any[]) {
    const ws = await getWebSocket()
    ws.send(JSON.stringify({ id: ++requestID, cmd, args }))
    return new Promise(resolve => pendingPromises.set(requestID, resolve))
}
