import { useState, useEffect } from 'react'
import { Drawer, Timeline, Button, Modal, Spin, message } from 'antd'
import { useAppStore } from '@renderer/stores/useAppStore'
import { useDomain } from '@renderer/contexts/DomainContext'
import { getGraph } from '../canvas/SchematicCanvas'
import type { VersionEntry } from '@shared/types/project'

interface Props {
  open: boolean
  onClose: () => void
}

export function VersionHistoryDrawer({ open, onClose }: Props) {
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [loading, setLoading] = useState(false)
  const { netlistManager } = useDomain()

  useEffect(() => {
    if (!open) return
    const { projectPath } = useAppStore.getState()
    if (!projectPath) return

    setLoading(true)
    window.electronAPI.version.list(projectPath)
      .then((data: unknown) => setVersions(data as VersionEntry[]))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false))
  }, [open])

  const handleRestore = (entry: VersionEntry) => {
    Modal.confirm({
      title: '确认恢复到该版本？',
      content: `将恢复到 ${new Date(entry.savedAt).toLocaleString()} 的版本`,
      onOk: async () => {
        const { projectPath } = useAppStore.getState()
        if (!projectPath) return
        try {
          const data = await window.electronAPI.version.restore(projectPath, entry.versionId) as any
          const graph = getGraph()
          if (graph) {
            graph.fromJSON(data.canvas ?? {})
            netlistManager.loadFromDSL(data.schema ?? { components: [], connections: [] })
            useAppStore.getState().markDirty()
          }
          message.success('已恢复到该版本')
          onClose()
        } catch (err: any) {
          message.error(`恢复失败: ${err.message}`)
        }
      }
    })
  }

  const timelineItems = versions.map(v => ({
    key: v.versionId,
    children: (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{v.projectName}</div>
          <div style={{ fontSize: 12, color: '#888' }}>
            {new Date(v.savedAt).toLocaleString()} · {v.sizeKB} KB
          </div>
        </div>
        <Button type="link" size="small" onClick={() => handleRestore(v)}>恢复</Button>
      </div>
    )
  }))

  return (
    <Drawer
      title="版本历史"
      placement="right"
      width={360}
      open={open}
      onClose={onClose}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : versions.length === 0 ? (
        <div style={{ color: '#888', textAlign: 'center', padding: 24 }}>暂无版本历史</div>
      ) : (
        <Timeline items={timelineItems} />
      )}
    </Drawer>
  )
}
