import { Button, Typography } from 'antd'
import { PlusOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useAppStore } from '@renderer/stores/useAppStore'
import { NewProjectDialog } from './NewProjectDialog'
import { logger } from '@shared/utils/logger'

const { Title, Text } = Typography

export function WelcomePage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [recentProjects, setRecentProjects] = useState<string[]>([])
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
    logger.debug('WelcomePage', 'Opening project dialog...')
    const result = await window.electronAPI.system.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open Project'
    })
    if (!result.canceled && result.filePaths[0]) {
      const path = result.filePaths[0]
      const name = path.split(/[\\/]/).pop() ?? 'Untitled'
      logger.info('WelcomePage', 'Opening project', { name, path })
      setProject(name, path)
    }
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
          {recentProjects.map((p, i) => (
            <div key={i} style={{
              padding: '8px 0',
              borderBottom: '1px solid var(--color-border)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)'
            }}>
              {p}
            </div>
          ))}
        </div>
      )}

      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
