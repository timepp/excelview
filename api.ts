export const api = {
    launchExcel: async function () {
        return await callAPI('launchExcel', arguments) as string
    },
    getActiveExcelRow: async function () {
        return await callAPI('getActiveExcelRow', arguments) as {
            headings: string[],
            data: string[]
        }
    }
}

export type BackendAPI = typeof api

async function callAPI_http(cmd:string, ...args:any[]){
    const proto = window.location.protocol
    const host = window.location.hostname
    const params = new URLSearchParams(window.location.search)
    const port = params.get('apiPort') || '22311'
    const resp = await fetch(`${proto}//${host}:${port}/api?cmd=${cmd}&args=${encodeURIComponent(JSON.stringify(args))}`)
    return await resp.json()
}

// call api using web socket
export async function callAPI(cmd: string, ...args: any[]) {
    const ws = await getWebSocket()
    ws.send(JSON.stringify({ cmd, args }))
    return new Promise(resolve => ws.onmessage = e => resolve(JSON.parse(e.data)))
}

let ws: WebSocket | null = null
async function getWebSocket() {
    if (!ws) {
        const proto = window.location.protocol
        const host = window.location.hostname
        const params = new URLSearchParams(window.location.search)
        const port = params.get('apiPort') || '22311'
        ws = new WebSocket(`${proto === 'https:' ? 'wss:' : 'ws:'}//${host}:${port}`)
        ws.onclose = () => { close() }
        await new Promise(resolve => ws!.onopen = resolve)
    }
    return ws
}
