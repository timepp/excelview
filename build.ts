// wrap some static assest to a single json file
// so that they are be imported to main app and can be created on demand on a http import use case

import * as vite from 'npm:vite@5.3.3'

await vite.build()

const htmlContent = Deno.readTextFileSync('./frontend/dist/index.html')
const jsContent = Deno.readTextFileSync('./frontend/dist/assets/index.js')

// replace this line:
// <script type="module" crossorigin src="/assets/index.js"></script>
// to jsContent
const newHtmlContent = htmlContent.replace(
    /<script type="module" crossorigin src="\/assets\/index.js"><\/script>/, 
    `<script type="module"> ${jsContent} </script>`)

const wshScriptContent = Deno.readTextFileSync('./excel.js')

const staticAssets = {
    '/index.html': newHtmlContent,
    'excel.js': wshScriptContent,
}

Deno.writeTextFileSync('./static_assets.json', JSON.stringify(staticAssets, null, 2))

console.log(newHtmlContent)
