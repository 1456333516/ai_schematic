import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { AIService } from './services/AIService'

let mainWindow: BrowserWindow | null = null
let aiService: AIService | null = null

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

function buildMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => send('menu:new-project') },
        { label: 'Open Project...', accelerator: 'CmdOrCtrl+O', click: () => send('menu:open-project') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('menu:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:save-as') },
        { type: 'separator' },
        { label: 'Recent Projects', submenu: [] },
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
        { label: 'AI Analysis', enabled: false, click: () => send('menu:ai-analysis') },
        { type: 'separator' },
        { label: 'Export', enabled: false, submenu: [
          { label: 'Export PNG...', click: () => send('menu:export-png') },
          { label: 'Export PDF...', click: () => send('menu:export-pdf') },
          { label: 'Export BOM...', click: () => send('menu:export-bom') }
        ]},
        { type: 'separator' },
        { label: 'Version History', enabled: false, click: () => send('menu:version-history') }
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

  return Menu.buildFromTemplate(template)
}

function send(channel: string, ...args: unknown[]): void {
  mainWindow?.webContents.send(channel, ...args)
}

// IPC handlers
ipcMain.handle('dialog:showSaveDialog', async (_e, options: Electron.SaveDialogOptions) => {
  if (!mainWindow) return { canceled: true, filePath: '' }
  return dialog.showSaveDialog(mainWindow, options)
})

ipcMain.handle('dialog:showOpenDialog', async (_e, options: Electron.OpenDialogOptions) => {
  if (!mainWindow) return { canceled: true, filePaths: [] }
  return dialog.showOpenDialog(mainWindow, options)
})

// Stub IPC handlers for file operations
ipcMain.handle('file:createProject', async (_e, _name: string, _path: string) => {
  return { success: true }
})

ipcMain.handle('file:openProject', async (_e, _path: string) => {
  return { success: true, data: null }
})

ipcMain.handle('file:saveProject', async (_e, _data: unknown) => {
  return { success: true }
})

ipcMain.handle('file:getRecentProjects', async () => {
  return []
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(buildMenu())
  aiService = new AIService()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
