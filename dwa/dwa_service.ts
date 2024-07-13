import {typeByExtension} from 'jsr:@std/media-types@1.0.1'
import { extname } from 'jsr:@std/path@1.0.0'
import staticAssets from '../static_assets.json' with { type: "json" }

export function startDenoWebApp(root: string, port: number, apiImpl: {[key: string]: Function}) {
    const ac = new AbortController();
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Content-Length, X-Requested-With",
    };
    const handlerCORS = async (req: Request) => {
        const response = await handler(req);
        response.headers.set("Access-Control-Allow-Origin", "*");
        return response;
    }
    const handler = async (req: Request) => {
        let path = new URL(req.url).pathname;
    
        // API
        if (path == "/api") {
            const cmd = new URL(req.url).searchParams.get("cmd") || ''
            const args = JSON.parse(decodeURI(new URL(req.url).searchParams.get("args") || "[]"))
            if (cmd in apiImpl) {
                const func = apiImpl[cmd as keyof typeof apiImpl]
                const result = await func.apply(apiImpl, args)
                return new Response(JSON.stringify(result), { status: 200 });
            } else {
                if (cmd === 'closeBackend') {
                    setTimeout(() => {
                        console.log('backend closed')
                        ac.abort()
                    }, 1000)
                    return new Response(JSON.stringify('OK'), { status: 200 });
                }
            }
            return new Response(`invalid command ${cmd}`, { status: 404 });
        }
    
        if(path == "/"){
            path = `/index.html`;
        }
        try {
            console.log('serving', root + path)
            if (path in staticAssets) {
                return new Response(staticAssets[path as keyof typeof staticAssets], {
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
    
    return Deno.serve({ port, signal: ac.signal }, handlerCORS);
}

