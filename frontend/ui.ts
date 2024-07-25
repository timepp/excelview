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

function createReviewPane() {
    const defaultSettings = {
        reviewColumnName: '',
        predefinedValues: [] as string[],
    }
    const sstr = localStorage.getItem('reviewSettings')
    const settings = sstr ? JSON.parse(sstr) as typeof defaultSettings : defaultSettings

    const rp = document.createElement('div')
    rp.id = 'reviewPane'
    rp.style.display = 'none'
    rp.style.marginTop = '10px'

    // create a input group for review
    // which contains a text addon("select field") and a selector
    const inputGroup = document.createElement('div')
    inputGroup.classList.add('input-group')
    rp.appendChild(inputGroup)

    // create "prev" and "next" navigation buttons
    const prev = document.createElement('button')
    prev.classList.add('btn', 'btn-primary')
    prev.textContent = 'Prev'
    prev.onclick = async () => {
        await api.navigateRow(-1)
    }
    inputGroup.appendChild(prev)
    const next = document.createElement('button')
    next.classList.add('btn', 'btn-primary')
    next.textContent = 'Next'
    next.onclick = async () => {
        await api.navigateRow(1)
    }
    inputGroup.appendChild(next)

    const inputGroupText = document.createElement('span')
    inputGroupText.classList.add('input-group-text')
    inputGroupText.textContent = 'Select Field'
    inputGroup.appendChild(inputGroupText)

    // create a column selector
    const columnSelector = document.createElement('input')
    columnSelector.classList.add('form-control')
    columnSelector.id = 'columnSelector'
    columnSelector.value = settings.reviewColumnName
    inputGroup.appendChild(columnSelector)

    const predefinedValuePrompt = document.createElement('span')
    predefinedValuePrompt.textContent = 'Predefined Value:'
    predefinedValuePrompt.classList.add('input-group-text')
    inputGroup.appendChild(predefinedValuePrompt)
    
    // create a input for predefined value, and 
    const predefinedValue = document.createElement('input')
    predefinedValue.classList.add('form-control')
    predefinedValue.id = 'predefinedValue'
    predefinedValue.placeholder = 'Enter predefined value'
    predefinedValue.value = settings.predefinedValues.join(',')
    inputGroup.appendChild(predefinedValue)

    const valuePrompt = document.createElement('span')
    valuePrompt.textContent = 'Review Value:'
    valuePrompt.classList.add('input-group-text')
    inputGroup.appendChild(valuePrompt)

    // create a select to choose predefined value
    const valueSelector = document.createElement('select')
    valueSelector.classList.add('form-control')
    valueSelector.id = 'valueSelector'
    inputGroup.appendChild(valueSelector)

    columnSelector.onchange = () => {
        settings.reviewColumnName = columnSelector.value
        localStorage.setItem('reviewSettings', JSON.stringify(settings))
    }

    predefinedValue.onchange = () => {
        const arr = predefinedValue.value.split(',').map(s => s.trim()).filter(s => s !== '')
        updateSelectorCandidates(valueSelector, arr)
        settings.predefinedValues = arr
        localStorage.setItem('reviewSettings', JSON.stringify(settings))
    }
    updateSelectorCandidates(valueSelector, settings.predefinedValues)

    valueSelector.onchange = async () => {
        const value = valueSelector.options[valueSelector.selectedIndex].text
        const col = currentRowData!.headings.indexOf(columnSelector.value)
        if (col >= 0) {
            await api.reviewActiveExcelRow(col + 1, value)
        } else {
            console.error('column not found:', columnSelector.value)
            alert(`Error: Column ${columnSelector.value} not found`)
        }
    }

    return rp
}

function updateSelectorCandidates(selector: HTMLSelectElement, arr: string[]) {
    const currentValue = selector.value
    selector.innerHTML = ''
    arr.forEach((v, i) => {
        const opt = document.createElement('option')
        opt.value = i.toString()
        opt.textContent = v
        selector.appendChild(opt)
    })
    selector.value = currentValue
}

async function updateUI(app: HTMLElement, force: boolean = false) {
    const activeRow = await getActiveExcelRow()
    // schedule next update

    if (!force && currentRowData && JSON.stringify(currentRowData) === JSON.stringify(activeRow)) {
        return
    }

    if (activeRow.result === 'ExcelTempError') {
        console.log('temp error, wait for next update')
        return
    }

    if (activeRow.result === 'ExcelNotRunning' || activeRow.result === 'SheetNotReady') {
        // excel not ready, wait
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
    4. In the review pane, you can navigate to previous/next row, pick a "review column" and change the value with predefined value. <br>
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

    const toggleReview = document.createElement('button')
    toggleReview.classList.add('btn', 'btn-danger')
    toggleReview.style.marginRight = '10px'
    toggleReview.textContent = 'Toggle Review';
    app.append(toggleReview)
    toggleReview.onclick = () => {
        const rp = document.getElementById('reviewPane')
        if (rp) {
            rp.style.display = rp.style.display === 'none' ? 'block' : 'none'
        }
    }

    app.append(createReviewPane())

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
    setInterval(() => {
        updateUI(app)
    }, 1000)
}

document.addEventListener('DOMContentLoaded', function() {
    main();
}, false);

