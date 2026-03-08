import { Button, Typography } from 'antd'
import { PlusOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useAppStore } from '@renderer/stores/useAppStore'
import { NewProjectDialog } from './NewProjectDialog'
import { logger } from '@shared/utils/logger'
import type { RecentEntry } from '@shared/types/project'

const { Title, Text } = Typography

export function WelcomePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [recentProjects, setRecentProjects] = useState<RecentEntry[]>([])
  const setProject = useAppStore((s) => s.setProject)

  logger.debug('WelcomePage', 'Render')

  useEffect(() => {
    logger.debug('WelcomePage', 'Fetching recent projects...')
    window.electronAPI.file.getRecentProjects()
      .then((list) => {
        logger.debug('WelcomePage', 'Recent projects', { count: list.length })
        setRecentProjects(list)
      })
      .catch((err) => logger.error('WelcomePage', 'Failed to fetch recent projects', err))
  }, [])

  const handleOpenProject = async () => {
    logger.debug('WelcomePage', 'Opening project file dialog...')
    const dlg = await window.electronAPI.file.openDialog()
    if (dlg.canceled || !dlg.filePath) return
    const result = await window.electronAPI.file.openProject(dlg.filePath)
    if (!result?.success || !result.data) return
    const data = result.data as any
    useAppStore.getState().setPendingProjectData({
      canvas: data.canvas ?? {},
      schema: data.schema ?? { components: [], connections: [] }
    })
    logger.info('WelcomePage', 'Opening project', { name: data.meta?.name, path: dlg.filePath })
    setProject(data.meta?.name ?? 'Untitled', dlg.filePath)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: 'var(--color-bg-l1)',
      gap: 32
    }}>
      <div style={{ textAlign: 'center' }}>
        <Title level={2} style={{ marginBottom: 4 }}>AI Schematic Generator</Title>
        <Text type="secondary">AI-driven electronic schematic design tool</Text>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setDialogOpen(true)}>
          New Project
        </Button>
        <Button size="large" icon={<FolderOpenOutlined />} onClick={handleOpenProject}>
          Open Project
        </Button>
      </div>

      {recentProjects.length > 0 && (
        <div style={{ width: 360, textAlign: 'left' }}>
          <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>Recent Projects</Text>
          {recentProjects.map((entry, i) => (
            <div key={i} style={{
              padding: '8px 0',
              borderBottom: '1px solid var(--color-border)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}
              onClick={async () => {
                const result = await window.electronAPI.file.openProject(entry.path)
                if (!result?.success || !result.data) return
                const data = result.data as any
                useAppStore.getState().setPendingProjectData({
                  canvas: data.canvas ?? {},
                  schema: data.schema ?? { components: [], connections: [] }
                })
                setProject(entry.name, entry.path)
              }}
            >
              <div>{entry.name}</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>{entry.path}</div>
            </div>
          ))}
        </div>
      )}

      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
