import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  file: {
    createProject: (name: string, path: string) =>
      ipcRenderer.invoke('file:createProject', name, path),
    openProject: (path: string) =>
      ipcRenderer.invoke('file:openProject', path),
    saveProject: (data: unknown) =>
      ipcRenderer.invoke('file:saveProject', data),
    getRecentProjects: () =>
      ipcRenderer.invoke('file:getRecentProjects')
  },
  system: {
    showSaveDialog: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('dialog:showOpenDialog', options)
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => { ipcRenderer.removeListener(channel, subscription) }
  }
} as const

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
