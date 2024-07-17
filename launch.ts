import * as vite from 'npm:vite@5.3.3'
import { parseArgs } from "jsr:@std/cli@0.224.7/parse-args";
import * as apiImpl from "./backend/api_impl.ts";
import * as service from "./dwa/dwa_service.ts";

async function main() {
    const args = parseArgs(Deno.args)
    const apiPort = 22312
    const backend = service.startDenoWebAppService('./frontend', apiPort, apiImpl.apiImpl);
    
    let webPort = apiPort
    let frontend: vite.ViteDevServer | null = null
    // Use Vite for local development
    if (!args.release && import.meta.url.startsWith('file://')) {
        frontend = await vite.createServer()
        webPort = 5173
        frontend.listen(webPort)
    }
    
    const browsers = args.browser? [args.browser] : 
        ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',]
    let cp: Deno.ChildProcess | null = null
    for (const browser of browsers) {
        console.log('trying to start browser:', browser)
        try {
            const cmd = new Deno.Command(browser, {
                args: [`--app=http://localhost:${webPort}/?apiPort=${apiPort}`, '--new-window', '--profile-directory=Default'],
            })
            cp = cmd.spawn()
            break
        } catch (e) {
            console.warn('error starting browser:', e)
        }
    }

    if (!cp) {
        console.error('could not start browser')
        Deno.exit(1)
    }

    console.log('browser started, pid:', cp.pid)

    const cleanUp = async () => {
        console.log('cleaning up...')
        if (frontend) {
            await frontend.close()
        }
        await apiImpl.cleanUp()
    }

    let sigIntCount = 0
    Deno.addSignalListener('SIGINT', () => {
        sigIntCount++
        if (sigIntCount > 1) {
            console.log('SIGINT received again, force exit')
            Deno.exit(1)
        } else {
            console.log('SIGINT received, shutting down backend')
            service.stopDenoWebAppService()
        }
    })

    await backend.finished
    await cleanUp()
    console.log('App Exit')
}

await main()

