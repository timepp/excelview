// wrap some static assest to a single json file
// so that they are be imported to main app and can be created on demand on a http import use case

const htmlContent = Deno.readTextFileSync('./frontend/dist/index.html')
const jsContent = Deno.readTextFileSync('./frontend/dist/assets/index.js')

// replace content within <!--SCRIPT-START--> and <!--SCRIPT-END--> to jsContent
const newHtmlContent = htmlContent.replace(/<!--SCRIPT-START-->[\s\S]*<!--SCRIPT-END-->/, `<!--SCRIPT-START-->\n<script type="module">\n${jsContent}\n</script>\n<!--SCRIPT-END-->`)

const wshScriptContent = Deno.readTextFileSync('./excel.js')

const staticAssets = {
    '/index.html': newHtmlContent,
    '/index2.html': newHtmlContent,
    'excel.js': wshScriptContent,
}

Deno.writeTextFileSync('./static_assets.json', JSON.stringify(staticAssets, null, 2))
