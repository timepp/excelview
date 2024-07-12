// deno-lint-ignore-file no-var no-inner-declarations

function WriteTextFile (text, path, encoding) {
    var stream = new ActiveXObject('ADODB.Stream');
    stream.Type = 2;
    stream.Mode = 3;
    if (encoding) stream.Charset = encoding;
    stream.Open();
    stream.Position = 0;

    stream.WriteText(text);
    try {
        fso.CreateFolder(tps.file.GetDir(path));
    } catch (e) { }
    stream.SaveToFile(path, 2);

    stream.Close();
}

function saveActiveRow(excel) {
    var sheet = excel.ActiveSheet;
    if (sheet) {
        // get max column that have data
        var maxColumn = sheet.UsedRange.Columns.Count;
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
                var headings = headings.join('_@@HS@@_');
                var rowValues = rowValues.join('_@@VS@@_');
                var content = [headings, rowValues].join('_@@RS@@_');
                WScript.Echo(content);
                WriteTextFile(content, 'excelrow.txt', 'utf-8');
        }
    }
}

var excel = new ActiveXObject('Excel.Application');
excel.Visible = true;

if (WScript.Arguments.Length > 0) {
    var path = WScript.Arguments(0);
    excel.Workbooks.Open(path);
}

// for test, open a workbook
// excel.Workbooks.Open('d:\\src\\excelview\\test.xlsx');

for (;;) {
    try {
        saveActiveRow(excel);
    } catch (e) {
        WScript.Echo(e.message);
    }

    WScript.Sleep(1000);
}