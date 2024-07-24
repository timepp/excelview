// deno-lint-ignore-file no-var no-inner-declarations

function saveActiveRow(excel) {
    var sheet = excel.ActiveSheet;
    if (sheet) {
        // get max column that have data
        var maxColumn = Math.min(sheet.UsedRange.Columns.Count, 100);
        // get active range
        var cell = excel.ActiveCell;
        if (cell) {
            var activeRow = cell.Row;
            var rowValues = []
            var headings = []
            for (var i = 1; i <= maxColumn; i++) {
                var value = sheet.Cells(activeRow, i).Value;
                rowValues.push(value);
                var heading = sheet.Cells(1, i).Value;
                headings.push(heading);
            }
            // get excel file name
            var fileName = excel.ActiveWorkbook.FullName;
            // get sheet name
            var sheetName = sheet.Name;
            // get active row number
            var headingsStr = headings.join('_@@HS@@_');
            var rowValuesStr = rowValues.join('_@@VS@@_');
            var content = [fileName, sheetName, activeRow, headingsStr, rowValuesStr].join('_@@RS@@_');
            WScript.Echo('CCE:' + encodeStr(content));
            // WScript.Echo(content);
            return
        }
    }
    WScript.Echo('');
}

function updateActiveRow(col, value) {
    var sheet = excel.ActiveSheet;
    if (sheet) {
        var cell = excel.ActiveCell;
        if (cell) {
            var activeRow = cell.Row;
            sheet.Cells(activeRow, col).Value = value;
        }
    }
}

function gotoRow(row) {
    var sheet = excel.ActiveSheet;
    if (sheet) {
        sheet.Cells(row, 1).Select();
    }
}

function navigateRow(offset) {
    var sheet = excel.ActiveSheet;
    if (sheet) {
        var cell = excel.ActiveCell;
        if (cell) {
            var activeRow = cell.Row;
            var newRow = activeRow + offset;
            // keep current column
            sheet.Cells(newRow, cell.Column).Select();
        }
    }
}

var excel

function main() {
    excel = new ActiveXObject('Excel.Application');
    excel.Visible = true;

    for (;;) {
        var arr = WScript.StdIn.ReadLine().split(' ');
        var cmd = arr[0];
        var args = arr.slice(1);

        if (cmd == "exit") {
            WScript.Echo("ok");
            break;
        }
    
        try {
            if (cmd === 'getActiveRow') {
                try {
                    saveActiveRow(excel);
                } catch (e) {
                    WScript.Echo('Error: ' + e.message);
                }
            } else if (cmd === 'updateActiveRow') {
                var col = parseInt(args[0]);
                var value = args[1];
                updateActiveRow(col, value);
                WScript.Echo("done");
            } else if (cmd === 'gotoRow') {
                var row = parseInt(args[0]);
                gotoRow(row);
                WScript.Echo("done");
            } else if (cmd === 'navigateRow') {
                var offset = parseInt(args[0]);
                navigateRow(offset);
                WScript.Echo("done");
            } else if (cmd === 'test') {
                WScript.Echo("excel sync: test");
                WScript.Echo(encodeStr(excel.ActiveCell.Value));
            } else if (cmd === 'eval') {
                WScript.Echo(eval(args.join(' ')));
            }
        } catch (e) {
            WScript.Echo(e.message);
        }
    }
}

function encodeStr(s) {
    var e = []
    for (var i = 0; i < s.length; i++) {
        e.push(s.charCodeAt(i));
    }
    return e.join(",");
}

try {
    main();
} catch (e) { 
    WScript.Echo('Error: ' + e.message);
}

excel.Quit()
