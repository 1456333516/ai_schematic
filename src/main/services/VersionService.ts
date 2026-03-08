import * as fs from 'fs'
import * as path from 'path'
import type { ProjectFileData, VersionEntry } from '../../shared/types/project'

export class VersionService {
  private getVersionsDir(projectPath: string): string {
    return path.join(path.dirname(projectPath), '.aischematic_versions')
  }

  createSnapshot(projectPath: string, data: ProjectFileData): void {
    const dir = this.getVersionsDir(projectPath)
    fs.mkdirSync(dir, { recursive: true })

    const filename = `${Date.now()}.json`
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(data), 'utf8')

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()
    if (files.length > 50) {
      const toDelete = files.slice(0, files.length - 50)
      for (const f of toDelete) {
        try { fs.rmSync(path.join(dir, f)) } catch { /* ignore */ }
      }
    }
  }

  listVersions(projectPath: string): VersionEntry[] {
    const dir = this.getVersionsDir(projectPath)
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
      return files
        .map(f => {
          const versionId = f.replace('.json', '')
          const ts = parseInt(versionId, 10)
          const fullPath = path.join(dir, f)
          const stat = fs.statSync(fullPath)
          let projectName = 'Untitled'
          try {
            const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as ProjectFileData
            projectName = parsed.meta?.name ?? 'Untitled'
          } catch { /* ignore */ }
          return {
            versionId,
            savedAt: new Date(ts).toISOString(),
            projectName,
            sizeKB: Math.ceil(stat.size / 1024)
          }
        })
        .sort((a, b) => parseInt(b.versionId, 10) - parseInt(a.versionId, 10))
    } catch {
      return []
    }
  }

  restoreVersion(projectPath: string, versionId: string): ProjectFileData {
    const file = path.join(this.getVersionsDir(projectPath), `${versionId}.json`)
    if (!fs.existsSync(file)) throw new Error(`Version ${versionId} not found`)
    return JSON.parse(fs.readFileSync(file, 'utf8')) as ProjectFileData
  }
}
