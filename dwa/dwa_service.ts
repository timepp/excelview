import {typeByExtension} from 'jsr:@std/media-types@1.0.1'
import { extname } from 'jsr:@std/path@1.0.0'
import staticAssets from '../static_assets.json' with { type: "json" }
import * as base64 from 'jsr:@std/encoding/base64';

const clients: WebSocket[] = []
let server: Deno.HttpServer | null = null
export function startDenoWebAppService(root: string, port: number, apiImpl: {[key: string]: Function}) {
    const handlerCORS = async (req: Request) => {
        // handle websocket connection
        if (req.headers.get("upgrade") === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(req);
            socket.onopen = () => {
                console.log("socket opened");
                clients.push(socket)
            }
            socket.onmessage = async (e) => {
                const {cmd, args} = JSON.parse(e.data)
                try {
                    if (cmd in apiImpl) {
                        const func = apiImpl[cmd as keyof typeof apiImpl]
                        const result = await func.apply(apiImpl, args)
                        socket.send(JSON.stringify(result))
                    } else {
                        socket.send(`'invalid command ${cmd}'`)
                    }
                } catch (_e) {
                    // ignore
                }
            }
            socket.onclose = () => {
                console.log("socket closed");
                const i = clients.indexOf(socket)
                if (i >= 0) {
                    clients.splice(i, 1)
                }
                setTimeout(() => {
                    if (clients.length === 0) {
                        console.log('no more clients, shutting down server')
                        server?.shutdown()
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
                const content = base64.decodeBase64(staticAssets[path as keyof typeof staticAssets])
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
    
    server = Deno.serve({ port }, handlerCORS);
    return server
}

export function stopDenoWebAppService() {
    server?.shutdown()
}
