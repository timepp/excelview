import {api} from '../api.ts'

let tbl: HTMLTableElement | null = null
let currentRowData: Awaited<ReturnType<typeof getActiveExcelRow>> | null = null
let showHeading = true

function updateCss(styleId: string, cssText: string) {
    let style = document.getElementById(styleId)
    if (!style) {
        style = document.createElement('style')
        style.id = styleId
        document.head.appendChild(style)
    }
    style.textContent = cssText
}

function updateStyle(styleText: string) {
    let cssText = styleText.split('\n').map(line => {
        const parts = line.split(':')
        if (parts.length >= 2) {
            return `#${parts[0].trim()} {${parts.slice(1).join(':').trim()}}`
        }
        return ''
    }).join('\n')
    updateCss('tableStyle', cssText)
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

    const summary = document.getElementById('summary')!
    if (activeRow.fileName === '') {
        summary.innerHTML = getUsage()
    } else {
        summary.innerHTML = `${activeRow.fileName} - ${activeRow.sheetName} - ${activeRow.row}`
    }

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
        const td = document.createElement('td')
        td.id = activeRow.headings[i]
        td.style.wordBreak = 'break-word'
        tr.appendChild(td)

        const v = activeRow.data[i]
        if (v.startsWith('http')) {
            const a = document.createElement('a')
            a.href = v
            a.target = '_blank'
            a.textContent = v
            td.appendChild(a)
        } else {
            td.textContent = activeRow.data[i]
        }
    }

    tbl = table
}

function getUsage() {
    return `
    This app keep sync with Excel and show the data in current(active) row so that you can see all columns without scrolling if there are too many columns.<br>
    It assume there is a heading row in Excel and use the heading as the first column in the table. <br><p></p>
    <b>Usage:</b> <br>
    1. Click "Launch Excel to open file", Excel window will open. <br>
    2. Then open your file in Excel. <br>
    3. Locate to any cell, you will see full row data below. <br>
    <br>
    <b>Note:</b><br>
    The window might be flashing on taskbar instead of showing up, just click on the flashing icon to bring it up. <br>
    `.trim()
}

async function main() {
    const app = document.createElement('div');
    document.body.appendChild(app);

    const summary = document.createElement('div');
    summary.classList.add('alert', 'alert-info')
    summary.innerHTML = getUsage()
    summary.style.marginTop = '10px'
    summary.id = 'summary'

    const launch = document.createElement('button');
    launch.classList.add('btn', 'btn-success')
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
            if (styleText.style.display === 'block') {
                styleText.focus()
            }
        }
    }

    const toggleHeading = document.createElement('button')
    toggleHeading.classList.add('btn', 'btn-secondary')
    toggleHeading.style.marginRight = '10px'
    toggleHeading.textContent = 'Toggle Heading';
    app.append(toggleHeading)
    toggleHeading.onclick = () => {
        showHeading = !showHeading
        updateCss('showHeading', showHeading ? '' : 'td:first-child {display: none}')
    }

    // create a multi-line text area for style
    const defaultStyle = `
    Customize css style by headings below
    -------------------------------------

    Title: color:blue;font-weight:bold;
    Problem: color:darkred;
    `.split('\n').map(s => s.trim()).slice(1).join('\n')
    const styleText = document.createElement('textarea')
    styleText.classList.add('form-control')
    styleText.id = 'styleText'
    styleText.spellcheck = false
    styleText.style.width = '100%'
    styleText.style.backgroundColor = 'lightyellow'
    styleText.style.height = '200px'
    styleText.style.display = 'none'
    styleText.style.marginTop = '10px'
    styleText.style.fontFamily = 'monospace'
    styleText.value = localStorage.getItem('styleText') || defaultStyle
    app.appendChild(styleText)
    styleText.onkeydown = () => {
        const v = styleText.value
        updateStyle(v)
        localStorage.setItem('styleText', v)
    }
    updateStyle(styleText.value)

    app.appendChild(summary)
    // window.onbeforeunload = e => {
    //     e.preventDefault()
    //     closeBackend()
    //     return "Just close"
    // }
    app.appendChild(document.createElement('p'))

    updateUI(app)
    setInterval(updateUI, 1000, app)
}

document.addEventListener('DOMContentLoaded', function() {
    main();
}, false);

