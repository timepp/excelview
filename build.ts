// wrap some static assest to a single json file
// so that they are be imported to main app and can be created on demand on a http import use case

import * as vite from 'npm:vite@5.3.3'
import * as base64 from 'jsr:@std/encoding/base64'

await vite.build()

const staticAssets = {
    '/index.html': './frontend/dist/index.html',
    '/assets/index.js': './frontend/dist/assets/index.js',
    '/assets/logo.jpg': './frontend/dist/assets/logo.jpg',
    'excel.js': './excel.js'
}

for (const [path, filePath] of Object.entries(staticAssets)) {
    staticAssets[path as keyof typeof staticAssets] = base64.encodeBase64(Deno.readFileSync(filePath))
}

Deno.writeTextFileSync('./static_assets.json', JSON.stringify(staticAssets, null, 2))
