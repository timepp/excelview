// launch backend and frontend
// wait for frontend exit, then terminate backend
import { apiImpl } from "./backend/api_impl.ts";
import { startDenoWebApp } from "./dwa/dwa_service.ts";
import * as vite from 'npm:vite'

startDenoWebApp('./frontend', 8080, apiImpl);

const frontend = await vite.createServer()
frontend.listen(5173)

//await new Promise(r => setTimeout(r, 1000))
// launch chrome with Default proflie
const cmd3 = new Deno.Command(`C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`, {
    args: ['--app=http://localhost:5173', '--new-window', '--profile-directory=Default'],
})

const browser = cmd3.spawn()
console.log('browser started, pid:', browser.pid)

Deno.addSignalListener("SIGINT", () => {
    console.log('SIGINT received')
    Exit()
})

// stop frontend if backend is closed

function Exit() {
    const close = (p: Deno.ChildProcess) => {
        try {
            p.kill()
        } catch (e) { 
            console.log(e.message)
        }
    }
    console.log('exiting app')
    // console.log('closing frontend')
    // close(frontend)
    console.log('closing browser')
    close(browser)
    Deno.exit()
}


