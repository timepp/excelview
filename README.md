# Excel View - helper UI for navigating long lines in Excel

This is a tool to help you navigate long lines in Excel. It keeps track the active cell and automatically get the entire row data and display it in a separate window. With this you can easily see all columns in a row without scrolling left and right.

## How to use

Prerequisite:

- Windows OS with Microsoft Excel installed
- [Deno](https://deno.land/)

Steps:

1. Run `deno run -A https://deno.land/x/excelview/launch.ts` in command line
1. In the opened app window, click "Launch Excel to open file"
1. In the opened Excel window, open the file you want to view
1. Click on any cell in excel, you will see the entire row data in the app window

![alt text](screenshot.png)
