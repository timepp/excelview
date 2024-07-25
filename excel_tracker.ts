// Using "Excel.Application" through WScript to track active cell in Excel
// It's difficult to call COM (but possible) from FFI, so we use WScript for now
// However WScript(cscript.exe) has it's own problem:
//   - It's impossible to receive unicode output from stdout pipe, we have to use file to communicate data
//   - Need to create child process, make it a little bit complex

import staticAssets from './static_assets.json' with { type: "json" }
import * as enc from 'jsr:@std/encoding@1.0.1'
import {debug} from './debug.ts'

let scriptProcess: Deno.ChildProcess | null = null

function launchScript() {
    // check if excel.js is present
    let scriptFile = `./excel.js`
    try {
        Deno.statSync(scriptFile)
    } catch (_e) {
        scriptFile = Deno.env.get('TEMP') + '\\excel.js'
        const content = enc.decodeBase64(staticAssets['excel.js'])
        Deno.writeTextFileSync(scriptFile, new TextDecoder().decode(content))
    }
    const cmd = new Deno.Command('cscript.exe', {
        args: ['//nologo', scriptFile],
        stdin: 'piped',
        stdout: 'piped'
    })
    const p = cmd.spawn()
    return p
}

// charcode,charcode,...,charcode -> string
function decodeStr(s: string) {
    if (!s) return ''
    if (s.startsWith('CCE:')) {
        return String.fromCharCode(...s.slice(4).split(',').map(c => parseInt(c)))
    } else {
        return s
    }
}

let signal = new Promise<void>((r) => r())

async function sendCommand(cmd: string) {
    if (scriptProcess) {
        let mySignal = signal
        while (true) {
            await signal
            if (mySignal !== signal) {
                mySignal = signal
            } else {
                break
            }
        }
        
        let res: () => void
        signal = new Promise<void>((resolver) => res = resolver)
        let textValue = ''
        try {
            if (debug) console.log('ET: sendCommand:', cmd)
            const writer = scriptProcess.stdin.getWriter()
            await writer.write(new TextEncoder().encode(cmd + '\n'))
            writer.releaseLock()
            const reader = scriptProcess.stdout.getReader()
            if (debug) console.log('ET: read response')
            const { value, done } = await reader.read()
            reader.releaseLock()
            textValue = new TextDecoder().decode(value)
            if (debug) console.log(`ET: response: [${JSON.stringify(textValue)}]`)
        } catch (e) {
            console.error('ET: sendCommand error:', cmd, e)
        }
        // resolve the signal to unblock the next command
        res!()
        return decodeStr(textValue.trim())
    }
    return ''
}

export async function stopTracker() {
    if (scriptProcess) {
        console.log('stopping script process...')
        sendCommand('exit')
        await scriptProcess.status
        console.log('script process stopped')
        scriptProcess = null
    }
}

export async function startNewTracker() {
    await stopTracker()
    scriptProcess = launchScript()
}

export async function getActiveExcelRow() {
    if (!scriptProcess) {
        return {
            result: 'ExcelNotRunning' as const,
            fileName: '', sheetName: '', row: 0,
            headings: [],
            data: []
        }
    }

    const s = await sendCommand('getActiveRow')
    if (debug) console.log('ET: getActiveExcelRow:', JSON.stringify(s))
    if (s.startsWith('Error:')) {
        return {
            result: 'ExcelTempError' as const,
            fileName: '', sheetName: '', row: 0,
            headings: [],
            data: []
        }
    }
    
    if (s) {
        const [fileName, sheetName, r, hs, vs] = s.split('_@@RS@@_')
        const row = parseInt(r)
        return {
            result: 'Success' as const,
            fileName, sheetName, row,
            headings: hs?.split('_@@HS@@_'),
            data: vs?.split('_@@VS@@_')
        }
    }

    return {
        result: 'SheetNotReady' as const,
        fileName: '', sheetName: '', row: 0,
        headings: [],
        data: []
    }
}

export async function setActiveExcelRowValue(col: number, value: string) {
    if (scriptProcess) {
        console.log('ET: setActiveExcelRowValue:', col, value)
        await sendCommand(`updateActiveRow ${col} ${value}`)
        return true
    }
    return false
}

export async function gotoRow(row: number) {
    if (scriptProcess) {
        console.log('ET: gotoRow:', row)
        await sendCommand(`gotoRow ${row}`)
        return true
    }
    return false
}

export async function navigateRow(offset: number) {
    if (scriptProcess) {
        console.log('ET: navigateRow:', offset)
        await sendCommand(`navigateRow ${offset}`)
        return true
    }
    return false
}

