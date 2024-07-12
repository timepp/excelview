import * as wui from "https://win32.deno.dev/0.4.1/UI.WindowsAndMessaging"
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
        const content = staticAssets['./excel.js']
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
    checkResult: async (a: number, b: number, res: number) => {
        if ((a + b) == res) {
            return `Correct: ${a} + ${b} = ${res}`;
        }
        else {
            return `Incorrect: ${a} + ${b} != ${res}`;
        }
    },
    getWindows: async () => {
        const windows: { title: string, className: string }[] = []
        const cb = new Deno.UnsafeCallback({
            parameters: ['pointer', 'pointer'],
            result: 'bool'
        }, (w, lparam) => {
            const buf = new Uint8Array(100)
            const buffer = new Uint16Array(1000)
            wui.GetWindowTextW(w, buffer, 1000)
            const title = new TextDecoder('utf-16le').decode(buffer).split('\0')[0]
            wui.GetClassNameW(w, buffer, 1000)
            const className = new TextDecoder('utf-16le').decode(buffer).split('\0')[0]
            const tid = wui.GetWindowThreadProcessId(w, buf)
            const pp = Deno.UnsafePointer.of(buf)
            const pid = new Deno.UnsafePointerView(pp!).getInt32()
            const info = { title, className }
            console.log(w, info, title, className, tid, pid);
            windows.push(info)
            return true;
        })
        wui.EnumWindows(cb.pointer, null)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return windows
    },
    launchExcel: async () => {
        if (scriptProcess) {
            try {
                scriptProcess.kill()
            } catch (_e) {
                // ignore
            }
            scriptProcess.kill();
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
