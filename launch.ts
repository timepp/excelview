import * as vite from 'npm:vite'
import { apiImpl } from "./backend/api_impl.ts";
import { startDenoWebApp } from "./dwa/dwa_service.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

async function main() {
    const args = parseArgs(Deno.args)
    const apiPort = 22311
    startDenoWebApp('./frontend', apiPort, apiImpl);
    
    let webPort = apiPort
    // Use Vite for local development
    if (!args.release && import.meta.url.startsWith('file://')) {
        const frontend = await vite.createServer()
        webPort = 5173
        frontend.listen(webPort)
    }
    
    const browser = args.browser || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    const cmd = new Deno.Command(browser, {
        args: [`--app=http://localhost:${webPort}/?apiPort=${apiPort}`, '--new-window', '--profile-directory=Default'],
    })
    const cp = cmd.spawn()
    console.log('browser started, pid:', cp.pid)
}

await main()

