import { contextBridge, ipcRenderer } from 'electron'
import type { ProjectFileData, BOMRow } from '../shared/types/project'

const electronAPI = {
  file: {
    createProject: (name: string, path: string) =>
      ipcRenderer.invoke('file:createProject', name, path),
    openProject: (path: string) =>
      ipcRenderer.invoke('file:openProject', path),
    saveProject: (path: string, data: ProjectFileData) =>
      ipcRenderer.invoke('file:saveProject', path, data),
    getRecentProjects: () =>
      ipcRenderer.invoke('file:getRecentProjects'),
    openDialog: () =>
      ipcRenderer.invoke('file:openDialog'),
    onAutosaveRequest: (callback: () => void) => {
      const sub = () => callback()
      ipcRenderer.on('autosave:request', sub)
      return () => { ipcRenderer.removeListener('autosave:request', sub) }
    }
  },
  ai: {
    analyze: (netlist: unknown) =>
      ipcRenderer.invoke('ai:analyze', netlist)
  },
  export: {
    png: (pngDataUrl: string, destPath: string) =>
      ipcRenderer.invoke('export:png', pngDataUrl, destPath),
    pdf: (pngDataUrl: string, destPath: string, landscape: boolean) =>
      ipcRenderer.invoke('export:pdf', pngDataUrl, destPath, landscape),
    bom: (rows: BOMRow[], destPath: string) =>
      ipcRenderer.invoke('export:bom', { rows, destPath })
  },
  version: {
    list: (projectPath: string) =>
      ipcRenderer.invoke('version:list', projectPath),
    restore: (projectPath: string, versionId: string) =>
      ipcRenderer.invoke('version:restore', projectPath, versionId)
  },
  system: {
    showSaveDialog: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('dialog:showOpenDialog', options),
    showMessageBox: (options: Electron.MessageBoxOptions) =>
      ipcRenderer.invoke('dialog:showMessageBox', options),
    setTitle: (title: string) =>
      ipcRenderer.invoke('system:setTitle', title)
  },
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) =>
      ipcRenderer.invoke(channel, ...args),
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
      ipcRenderer.on(channel, subscription)
      return () => { ipcRenderer.removeListener(channel, subscription) }
    },
    removeListener: (channel: string, callback: (...args: unknown[]) => void) => {
      ipcRenderer.removeListener(channel, callback)
    }
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => { ipcRenderer.removeListener(channel, subscription) }
  }
} as const

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
contextBridge.exposeInMainWorld('electron', electronAPI)

export type ElectronAPI = typeof electronAPI
