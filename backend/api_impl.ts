import { BackendAPI } from '../api.ts'
import staticAssets from '../static_assets.json' with { type: "json" }

let scriptProcess: Deno.ChildProcess

const infoFile = Deno.env.get('TEMP') + '\\excel_info.txt'
function launchScript() {
    // check if excel.js is present
    let scriptFile = `./excel.js`
    try {
        Deno.statSync(scriptFile)
    } catch (_e) {
        scriptFile = Deno.env.get('TEMP') + '\\excel.js'
        const content = staticAssets['excel.js']
        Deno.writeTextFileSync(scriptFile, content)
    }
    const cmd = new Deno.Command('cscript.exe', {
        args: ['//nologo', scriptFile, infoFile],
        stdout: 'inherit',
        stderr: 'inherit',
    })
    const p = cmd.spawn()
    return p
}

export const apiImpl: BackendAPI = {
    launchExcel: async () => {
        if (scriptProcess) {
            try {
                scriptProcess.kill()
            } catch (_e) {
                // ignore
            }
        }
        scriptProcess = launchScript()
        return ''
    },
    getActiveExcelRow: async () => {
        // read output from script
        const s = Deno.readTextFileSync(infoFile)
        const [hs, vs] = s.split('_@@RS@@_')
        return {
            headings: hs.split('_@@HS@@_'),
            data: vs.split('_@@VS@@_')
        }
    }
}
