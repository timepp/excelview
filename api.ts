export const api = {
    checkResult: async function (_a:number, _b:number, _res:number) {
        return await callAPI('checkResult', arguments) as string
    },
    getWindows: async function () {
        return await callAPI('getWindows', arguments) as {title:string, className:string}[]
    },
    launchExcel: async function () {
        return await callAPI('launchExcel', arguments) as string
    },
    getActiveExcelRow: async function () {
        return await callAPI('getActiveExcelRow', arguments) as {
            headings: string[],
            data: string[]
        }
    },
    closeBackend: async function () {
        return await callAPI('closeBackend', arguments) as string
    }
}

export type BackendAPI = Omit<typeof api, 'closeBackend'>

async function callAPI(cmd:string, ...args:any[]){
    const proto = window.location.protocol
    const host = window.location.hostname
    const params = new URLSearchParams(window.location.search)
    const port = params.get('apiPort') || '22311'
    const resp = await fetch(`${proto}//${host}:${port}/api?cmd=${cmd}&args=${encodeURIComponent(JSON.stringify(args))}`)
    return await resp.json()
}
