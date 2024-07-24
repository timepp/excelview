import {typeByExtension} from 'jsr:@std/media-types@1.0.1'
import { extname } from 'jsr:@std/path@1.0.0'
import staticAssets from '../static_assets.json' with { type: "json" }
import * as enc from 'jsr:@std/encoding@1.0.1'
import {debug} from '../debug.ts'

const clients: WebSocket[] = []
let server: Deno.HttpServer | null = null
const ac = new AbortController()
export function startDenoWebAppService(root: string, port: number, apiImpl: {[key: string]: Function}) {
    const handlerCORS = async (req: Request) => {
        // handle websocket connection
        if (req.headers.get("upgrade") === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(req);
            let closeTimer = 0
            socket.onopen = () => {
                console.log("socket opened");
                clearTimeout(closeTimer)
                clients.push(socket)
            }
            socket.onmessage = async (e) => {
                if (debug) console.log("socket message", e.data);
                const {id, cmd, args} = JSON.parse(e.data)
                try {
                    let result = `unknown command: ${cmd}`
                    if (cmd in apiImpl) {
                        const func = apiImpl[cmd as keyof typeof apiImpl]
                        result = await func.apply(apiImpl, args)
                    }
                    // console.log('sending response:', result)
                    socket.send(JSON.stringify({id, result}))
                } catch (_e) {
                    console.error(_e)
                    socket.send(JSON.stringify({id, result:`error: ${_e}`}))
                }
            }
            socket.onclose = () => {
                console.log("socket closed");
                const i = clients.indexOf(socket)
                if (i >= 0) {
                    clients.splice(i, 1)
                }
                closeTimer = setTimeout(() => {
                    if (clients.length === 0) {
                        console.log('no more clients, shutting down server')
                        ac.abort()
                    }
                }, 2000)
            }
            socket.onerror = (e) => {
                console.log("socket error", e);
            }
            return response;
        }

        const response = await handler(req);
        response.headers.set("Access-Control-Allow-Origin", "*");
        return response;
    }
    const handler = async (req: Request) => {
        let path = new URL(req.url).pathname;
    
        if(path == "/"){
            path = `/index.html`;
        }
        try {
            console.log('serving', root + path)
            if (path in staticAssets) {
                console.log('serving from static assets', path)
                const content = enc.decodeBase64(staticAssets[path as keyof typeof staticAssets])
                return new Response(content, {
                    headers: {
                        "content-type" : typeByExtension(extname(path)) || "text/plain"
                    }
                });
            }
            const file = await Deno.open(root + path);
            return new Response(file.readable, {
                headers: {
                    "content-type" : typeByExtension(extname(path)) || "text/plain"
                }
            });
        } catch(ex){
            if(ex.code === "ENOENT"){
                // check from static assets
                return new Response("Not Found", { status: 404 });
            }
            return new Response("Internal Server Error", { status: 500 });
        }
    };
    
    server = Deno.serve({ port, signal:ac.signal }, handlerCORS);
    return server
}

export function stopDenoWebAppService() {
    clients.forEach(c => c.close())
}
