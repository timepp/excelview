import * as vite from 'npm:vite@5.3.3'
import { parseArgs } from "jsr:@std/cli@0.224.7/parse-args";
import * as apiImpl from "./backend/api_impl.ts";
import * as service from "./dwa/dwa_service.ts";
import { debug } from './debug.ts'
import { setDebug } from './debug.ts';

async function main() {
    const args = parseArgs(Deno.args)
    if (args.debug) setDebug(true)

    let apiPort = 22312
    // try different ports if the default one is already in use
    let backend : Deno.HttpServer | null = null
    for (let i = 0; i < 10; i++) {
        try {
            backend = service.startDenoWebAppService('./frontend', apiPort, apiImpl.apiImpl);
            break
        } catch (_e) {
            apiPort++
        }
    }

    if (!backend) {
        console.error('could not start backend')
        Deno.exit(1)
    }
    
    let webPort = apiPort
    let frontend: vite.ViteDevServer | null = null
    // If it's local development, use vite to serve the frontend so that we can use hot reload
    if (!args.release && import.meta.url.startsWith('file://')) {
        frontend = await vite.createServer()
        webPort = 5173
        frontend.listen(webPort)
    }
    
    const edge = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
    const chrome = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ]
    const browsers = args.browser === 'edge'? edge : args.browser === 'chrome'? chrome : args.browser? [args.browser] : [...edge, ...chrome]
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

    await backend.finished
    if (frontend) {
        await frontend.close()
    }
    await apiImpl.cleanUp()
    console.log('App Exit')
}

await main()

