import {api} from '../api.js'

let tbl: HTMLTableElement | null = null
let currentRowData: { headings: string[], data: string[] } | null = null
let styles: Record<string, string> = {}
let showHeading = true

function updateStyle(app: HTMLElement, styleText: string) {
    styles = {}
    styleText.split('\n').forEach(line => {
        const parts = line.split(':')
        if (parts.length >= 2) {
            styles[parts[0].trim()] = parts.slice(1).join(':').trim()
        }
    })
}

async function exit() {
    try {
        await api.closeBackend()
    } catch (_e) {
        // ignore
    }
    window.close()
}

async function getActiveExcelRow() {
    try {
        return await api.getActiveExcelRow()
    } catch (e) {
        console.error('backend exit', e)
        window.close()
        throw 'unreachable'
    }
}

async function updateUI(app: HTMLElement, force: boolean = false) {
    const activeRow = await getActiveExcelRow()
    if (!force && currentRowData && JSON.stringify(currentRowData) === JSON.stringify(activeRow)) {
        return
    }
    currentRowData = activeRow
    if (tbl) {
        tbl.remove()
    }
    // create a table using headings as first column and data as second column
    const table = document.createElement('table')
    table.classList.add('table', 'table-bordered')
    app.appendChild(table)
    const tbody = document.createElement('tbody')
    table.appendChild(tbody)
    tbody.style.whiteSpace = 'pre-wrap'

    for (let i = 0; i < activeRow.data.length; i++) {
        if (activeRow.headings[i].trim() === '' && activeRow.data[i].trim() === '') {
            continue
        }
        const tr = document.createElement('tr')
        tbody.appendChild(tr)
        const propName = document.createElement('td')
        propName.style.fontWeight = 'bold'
        tr.appendChild(propName)
        propName.textContent = activeRow.headings[i] || ''
        if (!showHeading) {
            propName.style.display = 'none'
        }
        const td = document.createElement('td')
        tr.appendChild(td)
        // set style according to `styles` object
        const styleText = styles[activeRow.headings[i]]
        td.style.cssText = styleText || ''

        const v = activeRow.data[i]
        if (v.startsWith('http')) {
            const a = document.createElement('a')
            a.href = v
            a.textContent = v
            td.appendChild(a)
        } else {
            td.textContent = activeRow.data[i]
        }
    }

    tbl = table
}

async function main() {
    const app = document.createElement('div');
    document.body.appendChild(app);

    const help = document.createElement('div');
    help.classList.add('alert', 'alert-info')
    help.innerText = 
        'This app keep sync with Excel and show the data in current(active) row so that you can see all columns without scrolling if there are too many columns.\n' +
        'It assume there is a heading row in Excel and use the heading as the first column in the table. '
    app.appendChild(help)

    const launch = document.createElement('button');
    launch.classList.add('btn', 'btn-primary')
    launch.style.marginRight = '10px'
    launch.textContent = 'Launch Excel to open file';
    launch.onclick = async () => {
        await api.launchExcel()
    }
    app.append(launch)

    const style = document.createElement('button')
    style.classList.add('btn', 'btn-secondary')
    style.style.marginRight = '10px'
    style.textContent = 'Edit Style';
    app.append(style)
    style.onclick = () => {
        const styleText = document.getElementById('styleText')
        if (styleText) {
            styleText.style.display = styleText.style.display === 'none' ? 'block' : 'none'
        }
    }

    const toggleHeading = document.createElement('button')
    toggleHeading.classList.add('btn', 'btn-secondary')
    toggleHeading.style.marginRight = '10px'
    toggleHeading.textContent = 'Toggle Heading';
    app.append(toggleHeading)
    toggleHeading.onclick = () => {
        showHeading = !showHeading
        updateUI(app, true)
    }

    const close = document.createElement('button');
    close.classList.add('btn', 'btn-danger')
    close.textContent = 'Close';
    close.onclick = async () => {
        await exit()
    }
    app.append(close)


    // create a multi-line text area for style
    const styleText = document.createElement('textarea')
    styleText.classList.add('form-control')
    styleText.id = 'styleText'
    styleText.style.width = '100%'
    styleText.style.height = '200px'
    styleText.style.display = 'none'
    styleText.style.marginTop = '10px'
    styleText.style.fontFamily = 'monospace'
    styleText.value = localStorage.getItem('styleText') || ''
    app.appendChild(styleText)
    styleText.onkeydown = () => {
        const v = styleText.value
        updateStyle(app, v)
        updateUI(app, true)
        localStorage.setItem('styleText', v)
    }
    updateStyle(app, styleText.value)

    // window.onbeforeunload = e => {
    //     e.preventDefault()
    //     closeBackend()
    //     return "Just close"
    // }
    app.appendChild(document.createElement('p'))

    setInterval(updateUI, 1000, app)
}

document.addEventListener('DOMContentLoaded', function() {
    main();
}, false);

