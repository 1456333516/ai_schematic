import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { AIService } from './services/AIService'
import { FileService } from './services/FileService'
import { ExportService } from './services/ExportService'
import { VersionService } from './services/VersionService'
import type { RecentEntry, BOMRow } from '../shared/types/project'

let mainWindow: BrowserWindow | null = null
let aiService: AIService | null = null
let fileService: FileService | null = null
let exportService: ExportService | null = null
let versionService: VersionService | null = null

function send(channel: string, ...args: unknown[]): void {
  mainWindow?.webContents.send(channel, ...args)
}

function rebuildRecentMenu(): void {
  const recent = fileService?.getRecentProjects() ?? []
  const submenu: Electron.MenuItemConstructorOptions[] = recent.length === 0
    ? [{ label: 'No Recent Projects', enabled: false }]
    : recent.map((entry) => ({
        label: entry.name,
        click: () => send('menu:open-recent', entry.path)
      }))

  const menu = Menu.getApplicationMenu()
  if (!menu) return

  const fileMenu = menu.items.find((i) => i.label === 'File')
  const recentItem = fileMenu?.submenu?.items.find((i) => i.label === 'Recent Projects')
  if (recentItem) {
    recentItem.submenu = Menu.buildFromTemplate(submenu)
    Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate()))
  }
}

function buildMenuTemplate(): Electron.MenuItemConstructorOptions[] {
  const recent = fileService?.getRecentProjects() ?? []
  const recentSubmenu: Electron.MenuItemConstructorOptions[] = recent.length === 0
    ? [{ label: 'No Recent Projects', enabled: false }]
    : recent.map((entry) => ({
        label: entry.name,
        click: () => send('menu:open-recent', entry.path)
      }))

  return [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => send('menu:new-project') },
        { label: 'Open Project...', accelerator: 'CmdOrCtrl+O', click: () => send('menu:open-project') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('menu:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:save-as') },
        { type: 'separator' },
        { label: 'Recent Projects', submenu: recentSubmenu },
        { type: 'separator' },
        { label: 'Version History', click: () => send('menu:version-history') },
        { type: 'separator' },
        { label: 'Settings', click: () => send('menu:settings') },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('menu:undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', click: () => send('menu:redo') },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { type: 'separator' },
        { label: 'Delete', accelerator: 'Delete', click: () => send('menu:delete') },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => send('menu:select-all') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => send('menu:zoom-in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => send('menu:zoom-out') },
        { label: 'Zoom to Fit', accelerator: 'CmdOrCtrl+0', click: () => send('menu:zoom-fit') },
        { type: 'separator' },
        { label: 'Toggle Grid', accelerator: 'CmdOrCtrl+G', click: () => send('menu:toggle-grid') },
        { type: 'separator' },
        { label: 'Component Library', accelerator: 'CmdOrCtrl+Shift+L', click: () => send('menu:toggle-component-library') },
        { label: 'AI Chat Panel', accelerator: 'CmdOrCtrl+Shift+R', click: () => send('menu:toggle-ai-chat') },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Developer Tools' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'AI Analysis', click: () => send('menu:ai-analysis') },
        { type: 'separator' },
        {
          label: 'Export',
          submenu: [
            { label: 'Export PNG...', click: () => send('menu:export-png') },
            { label: 'Export PDF...', click: () => send('menu:export-pdf') },
            { label: 'Export BOM...', click: () => send('menu:export-bom') }
          ]
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: () => send('menu:shortcuts') },
        { type: 'separator' },
        { label: 'About', click: () => send('menu:about') }
      ]
    }
  ]
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// System handlers
ipcMain.handle('system:setTitle', (_e, title: string) => {
  mainWindow?.setTitle(title)
})

// Dialog handlers
ipcMain.handle('dialog:showSaveDialog', async (_e, options: Electron.SaveDialogOptions) => {
  if (!mainWindow) return { canceled: true, filePath: '' }
  return dialog.showSaveDialog(mainWindow, options)
})

ipcMain.handle('dialog:showOpenDialog', async (_e, options: Electron.OpenDialogOptions) => {
  if (!mainWindow) return { canceled: true, filePaths: [] }
  return dialog.showOpenDialog(mainWindow, options)
})

ipcMain.handle('dialog:showMessageBox', async (_e, options: Electron.MessageBoxOptions) => {
  if (!mainWindow) return { response: 2 }
  return dialog.showMessageBox(mainWindow, options)
})

// File IPC handlers
function updateRecentsAndMenu(entry: RecentEntry): void {
  try { fileService!.addRecentProject(entry) } catch { /* non-critical */ }
  try { rebuildRecentMenu() } catch { /* non-critical */ }
  try { if (mainWindow) fileService!.startAutoSave(mainWindow) } catch { /* non-critical */ }
}

ipcMain.handle('file:createProject', async (_e, name: string, filePath: string) => {
  try {
    const data = {
      schema: { components: [], connections: [] },
      canvas: {},
      meta: { name, version: '1.0', savedAt: new Date().toISOString() }
    }
    fileService!.save(filePath, data)
    fileService!.setProjectPath(filePath)
    updateRecentsAndMenu({ name, path: filePath, savedAt: new Date().toISOString() })
    return { success: true, path: filePath }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:saveProject', async (_e, filePath: string, data: unknown) => {
  try {
    const projectData = data as any
    fileService!.save(filePath, projectData)
    fileService!.setProjectPath(filePath)
    updateRecentsAndMenu({
      name: projectData.meta?.name ?? 'Untitled',
      path: filePath,
      savedAt: new Date().toISOString()
    })
    try { versionService?.createSnapshot(filePath, projectData) } catch (e) { console.error('[VersionService] Snapshot failed:', e) }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:openProject', async (_e, filePath: string) => {
  try {
    const data = fileService!.open(filePath)
    fileService!.setProjectPath(filePath)
    updateRecentsAndMenu({
      name: data.meta?.name ?? 'Untitled',
      path: filePath,
      savedAt: new Date().toISOString()
    })
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('file:getRecentProjects', async () => {
  return fileService?.getRecentProjects() ?? []
})

ipcMain.handle('file:openDialog', async () => {
  if (!mainWindow) return { canceled: true, filePath: null }
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'AI Schematic', extensions: ['aischematic'] }],
    properties: ['openFile']
  })
  return { canceled: result.canceled, filePath: result.filePaths[0] ?? null }
})

ipcMain.handle('autosave:respond', async (_e, filePath: string, data: unknown) => {
  try {
    if (filePath) {
      fileService!.save(filePath, data as any)
      try { versionService?.createSnapshot(filePath, data as any) } catch (e) { console.error('[VersionService] Snapshot failed:', e) }
    }
  } catch (err) {
    console.error('[FileService] Auto-save failed:', err)
  }
})

// Export IPC handlers
ipcMain.handle('export:png', async (_e, pngDataUrl: string, destPath: string) => {
  try {
    await exportService!.exportPNG(pngDataUrl, destPath)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('export:pdf', async (_e, pngDataUrl: string, destPath: string, landscape: boolean) => {
  try {
    await exportService!.exportPDF(pngDataUrl, destPath, landscape)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('export:bom', async (_e, { rows, destPath }: { rows: BOMRow[], destPath: string }) => {
  try {
    await exportService!.exportBOM(rows, destPath)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// Version IPC handlers
ipcMain.handle('version:list', async (_e, projectPath: string) => {
  return versionService?.listVersions(projectPath) ?? []
})

ipcMain.handle('version:restore', async (_e, projectPath: string, versionId: string) => {
  return versionService!.restoreVersion(projectPath, versionId)
})

app.whenReady().then(() => {
  fileService = new FileService()
  versionService = new VersionService()
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate()))
  aiService = new AIService()
  createWindow()

  if (mainWindow) {
    exportService = new ExportService(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  fileService?.stopAutoSave()
  if (process.platform !== 'darwin') app.quit()
})
