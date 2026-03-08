import * as fs from 'fs'
import * as path from 'path'
import { app, BrowserWindow } from 'electron'
import type { ProjectFileData, RecentEntry } from '../../shared/types/project'

export class FileService {
  private projectPath: string | null = null
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null
  private readonly recentPath = path.join(app.getPath('userData'), 'recent.json')

  save(projectPath: string, data: ProjectFileData): void {
    const tmpPath = `${projectPath}.tmp`
    try {
      fs.writeFileSync(tmpPath, JSON.stringify(data), 'utf8')
      fs.renameSync(tmpPath, projectPath)
    } catch (err) {
      try { fs.rmSync(tmpPath, { force: true }) } catch { /* ignore */ }
      throw err
    }
  }

  open(projectPath: string): ProjectFileData {
    return JSON.parse(fs.readFileSync(projectPath, 'utf8')) as ProjectFileData
  }

  getRecentProjects(): RecentEntry[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.recentPath, 'utf8'))
      return Array.isArray(parsed) ? (parsed as RecentEntry[]) : []
    } catch {
      return []
    }
  }

  addRecentProject(entry: RecentEntry): void {
    const norm = (p: string) => {
      const n = path.normalize(p)
      return process.platform === 'win32' ? n.toLowerCase() : n
    }
    const normalized = norm(entry.path)
    const next = [entry, ...this.getRecentProjects().filter((r) => norm(r.path) !== normalized)].slice(0, 10)
    fs.writeFileSync(this.recentPath, JSON.stringify(next), 'utf8')
  }

  setProjectPath(p: string): void {
    this.projectPath = p
  }

  startAutoSave(mainWindow: BrowserWindow, intervalMs = 60000): void {
    if (!this.projectPath) return
    this.stopAutoSave()
    this.autoSaveTimer = setInterval(() => {
      if (mainWindow.isDestroyed()) { this.stopAutoSave(); return }
      mainWindow.webContents.send('autosave:request')
    }, intervalMs)
  }

  stopAutoSave(): void {
    if (!this.autoSaveTimer) return
    clearInterval(this.autoSaveTimer)
    this.autoSaveTimer = null
  }
}
