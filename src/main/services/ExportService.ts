import { BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import ExcelJS from 'exceljs'
import type { BOMRow } from '../../shared/types/project'

export class ExportService {
  constructor(private readonly mainWindow: BrowserWindow) {}

  async exportPNG(pngDataUrl: string, destPath: string): Promise<void> {
    const base64 = pngDataUrl.replace(/^data:image\/png;base64,/, '')
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.writeFileSync(destPath, Buffer.from(base64, 'base64'))
  }

  async exportBOM(rows: BOMRow[], destPath: string): Promise<void> {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('BOM')
    ws.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '位号', key: 'refDes', width: 15 },
      { header: '名称', key: 'name', width: 20 },
      { header: '值', key: 'value', width: 15 },
      { header: '封装', key: 'package', width: 15 },
      { header: '数量', key: 'quantity', width: 8 },
      { header: '描述', key: 'description', width: 30 }
    ]
    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true }
    for (const row of rows) {
      ws.addRow(row)
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    await wb.xlsx.writeFile(destPath)
  }

  async exportPDF(pngDataUrl: string, destPath: string, landscape: boolean): Promise<void> {
    const html = encodeURIComponent(
      `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}` +
      `body{background:#fff;display:flex;justify-content:center;align-items:center;width:100vw;height:100vh}` +
      `img{max-width:100%;max-height:100%;object-fit:contain}</style></head>` +
      `<body><img src="${pngDataUrl}"/></body></html>`
    )
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } })
    await win.loadURL(`data:text/html;charset=utf-8,${html}`)
    const buf = await win.webContents.printToPDF({ printBackground: true, landscape, pageSize: 'A4' })
    win.close()
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.writeFileSync(destPath, buf)
  }
}
