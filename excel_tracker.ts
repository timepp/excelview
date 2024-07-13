// Using "Excel.Application" through WScript to track active cell in Excel
// It's difficult to call COM (but possible) from FFI, so we use WScript for now
// However WScript(cscript.exe) has it's own problem:
//   - It's impossible to receive unicode output from stdout pipe, we have to use file to communicate data
//   - Need to create child process, make it a little bit complex

import staticAssets from './static_assets.json' with { type: "json" }

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
        stdin: 'piped'
    })
    const p = cmd.spawn()
    return p
}

async function sendCommand(cmd: string) {
    if (scriptProcess) {
        const writer = scriptProcess.stdin.getWriter()
        await writer.write(new TextEncoder().encode(cmd + '\n'))
        await writer.releaseLock()
    }
}

export async function stopTracker() {
    if (scriptProcess) {
        sendCommand('exit')
        await scriptProcess.status
    }
}

export async function startNewTracker() {
    await stopTracker()
    scriptProcess = launchScript()
}

export async function getActiveExcelRow() {
    if (scriptProcess) {
        await sendCommand('get active row')
    }
    // wait the file to be created
    await new Promise(resolve => setTimeout(resolve, 500))
    // read output from script
    const s = Deno.readTextFileSync(infoFile)
    const [hs, vs] = s.split('_@@RS@@_')
    return {
        headings: hs.split('_@@HS@@_'),
        data: vs.split('_@@VS@@_')
    }
}
