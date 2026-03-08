import { useCallback, useRef, useEffect, useState } from 'react'
import { useAppStore } from '@renderer/stores/useAppStore'
import { useCanvasStore } from '@renderer/stores/useCanvasStore'
import { useDomain } from '@renderer/contexts/DomainContext'
import { Toolbar } from './Toolbar'
import { StatusBar } from './StatusBar'
import { SheetTabs } from './SheetTabs'
import { ComponentLibrary } from '../panels/ComponentLibrary'
import { PropertyPanel } from '../panels/PropertyPanel'
import { AIChatPanel } from '../panels/AIChatPanel'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import { ExportDialog } from '../dialogs/ExportDialog'
import { VersionHistoryDrawer } from '../dialogs/VersionHistoryDrawer'
import { ErrorBoundary } from '../ErrorBoundary'
import { SchematicCanvas, getGraph } from '../canvas/SchematicCanvas'
import { WelcomePage } from '../welcome/WelcomePage'
import { logger } from '@shared/utils/logger'
import '@renderer/styles/layout.css'

export function AppLayout() {
  const {
    currentView,
    componentLibraryVisible,
    aiChatPanelVisible,
    propertyPanelVisible,
    componentLibraryWidth,
    aiChatPanelWidth,
    projectName,
    isDirty,
    setPanelWidth
  } = useAppStore()

  const { commandBus, netlistManager } = useDomain()

  const [settingsVisible, setSettingsVisible] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [exportState, setExportState] = useState<{
    visible: boolean
    mode: 'png' | 'pdf' | 'bom'
    destPath: string
  }>({ visible: false, mode: 'png', destPath: '' })

  logger.debug('AppLayout', 'Render', { currentView })

  const dragging = useRef<{ panel: 'componentLibrary' | 'aiChat'; startX: number; startW: number } | null>(null)

  const onSplitterDown = useCallback((panel: 'componentLibrary' | 'aiChat', e: React.PointerEvent) => {
    const startW = panel === 'componentLibrary' ? componentLibraryWidth : aiChatPanelWidth
    dragging.current = { panel, startX: e.clientX, startW }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [componentLibraryWidth, aiChatPanelWidth])

  const onSplitterMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const { panel, startX, startW } = dragging.current
    const delta = panel === 'componentLibrary' ? e.clientX - startX : startX - e.clientX
    setPanelWidth(panel, startW + delta)
  }, [setPanelWidth])

  const onSplitterUp = useCallback(() => { dragging.current = null }, [])

  const getSaveData = useCallback((nameOverride?: string) => {
    const graph = getGraph()
    const { projectName } = useAppStore.getState()
    return {
      schema: netlistManager.serialize(),
      canvas: graph?.toJSON() ?? {},
      meta: { name: nameOverride ?? projectName ?? 'Untitled', version: '1.0', savedAt: new Date().toISOString() }
    }
  }, [netlistManager])

  const doSave = useCallback(async (filePath: string, nameOverride?: string) => {
    const data = getSaveData(nameOverride)
    const result = await window.electronAPI.file.saveProject(filePath, data as any)
    if (result?.success !== false) {
      useAppStore.getState().markClean()
      useAppStore.getState().setProjectPath(filePath)
    }
    return result
  }, [getSaveData])

  const doSaveAs = useCallback(async () => {
    const { projectName } = useAppStore.getState()
    const dlg = await window.electronAPI.system.showSaveDialog({
      defaultPath: `${projectName ?? 'Untitled'}.aischematic`,
      filters: [{ name: 'AI Schematic', extensions: ['aischematic'] }]
    })
    if (dlg.canceled || !dlg.filePath) return null
    const newName = dlg.filePath.split(/[\\/]/).pop()?.replace(/\.aischematic$/, '') ?? projectName ?? 'Untitled'
    const result = await doSave(dlg.filePath, newName)
    if (result?.success !== false) {
      useAppStore.getState().setProject(newName, dlg.filePath)
    }
    return dlg.filePath
  }, [doSave])

  const applyProjectData = useCallback((data: any, filePath: string) => {
    const graph = getGraph()
    if (graph) {
      graph.fromJSON(data.canvas ?? {})
      netlistManager.loadFromDSL(data.schema ?? { components: [], connections: [] })
      useAppStore.getState().setProject(data.meta?.name ?? 'Untitled', filePath)
      // setProject sets isDirty:false, but graph.fromJSON fires node:added→markDirty synchronously before setProject
      useAppStore.getState().markClean()
    } else {
      useAppStore.getState().setPendingProjectData({
        canvas: data.canvas ?? {},
        schema: data.schema ?? { components: [], connections: [] }
      })
      useAppStore.getState().setProject(data.meta?.name ?? 'Untitled', filePath)
    }
  }, [netlistManager])

  // Auto-save response listener
  useEffect(() => {
    const unsub = window.electronAPI.file.onAutosaveRequest(() => {
      const { projectPath } = useAppStore.getState()
      if (!projectPath) return
      const data = getSaveData()
      window.electronAPI.ipcRenderer.invoke('autosave:respond', projectPath, data).then(() => {
        useAppStore.getState().markClean()
      }).catch(() => { /* silent */ })
    })
    return unsub
  }, [getSaveData])

  // Title sync
  useEffect(() => {
    const name = projectName ?? 'Untitled'
    const title = isDirty ? `● ${name} — AI Schematic` : `${name} — AI Schematic`
    document.title = title
    void window.electronAPI.system.setTitle(title)
  }, [projectName, isDirty])

  // Global IPC menu listeners
  useEffect(() => {
    logger.debug('AppLayout', 'Binding IPC menu listeners')
    const unsubs = [
      window.electronAPI.on('menu:toggle-grid', () => {
        useCanvasStore.getState().toggleGrid()
      }),
      window.electronAPI.on('menu:toggle-component-library', () => {
        useAppStore.getState().toggleComponentLibrary()
      }),
      window.electronAPI.on('menu:toggle-ai-chat', () => {
        useAppStore.getState().toggleAIChatPanel()
      }),
      window.electronAPI.on('menu:new-project', () => {
        useAppStore.getState().setCurrentView('welcome')
      }),
      window.electronAPI.on('menu:settings', () => {
        setSettingsVisible(true)
      }),

      // Edit
      window.electronAPI.on('menu:undo', () => { const g = getGraph(); if (g?.canUndo()) g.undo() }),
      window.electronAPI.on('menu:redo', () => { const g = getGraph(); if (g?.canRedo()) g.redo() }),
      window.electronAPI.on('menu:delete', () => {
        const graph = getGraph()
        if (graph) graph.removeCells(graph.getSelectedCells())
      }),
      window.electronAPI.on('menu:select-all', () => {
        const graph = getGraph()
        if (graph) graph.select(graph.getNodes())
      }),

      // View / zoom
      window.electronAPI.on('menu:zoom-in', () => { getGraph()?.zoom(0.1) }),
      window.electronAPI.on('menu:zoom-out', () => { getGraph()?.zoom(-0.1) }),
      window.electronAPI.on('menu:zoom-fit', () => { getGraph()?.zoomToFit({ padding: 40 }) }),

      // File operations
      window.electronAPI.on('menu:save', async () => {
        const { projectPath } = useAppStore.getState()
        if (projectPath) { await doSave(projectPath) } else { await doSaveAs() }
      }),
      window.electronAPI.on('menu:save-as', async () => { await doSaveAs() }),
      window.electronAPI.on('menu:open-project', async () => {
        try {
          const { isDirty, projectPath } = useAppStore.getState()
          if (isDirty) {
            const box = await window.electronAPI.system.showMessageBox({
              type: 'question',
              buttons: ['Save', 'Discard', 'Cancel'],
              defaultId: 0, cancelId: 2,
              message: 'Unsaved changes',
              detail: 'Save changes before opening another project?'
            })
            if (box.response === 2) return
            if (box.response === 0) {
              if (projectPath) { const r = await doSave(projectPath); if (r?.success === false) return }
              else { const p = await doSaveAs(); if (!p) return }
            }
          }

          const dlg = await window.electronAPI.file.openDialog()
          if (dlg.canceled || !dlg.filePath) return

          const result = await window.electronAPI.file.openProject(dlg.filePath)
          if (!result?.success || !result.data) return

          const data = result.data as any
          applyProjectData(data, dlg.filePath)
        } catch { /* non-fatal */ }
      }),
      window.electronAPI.on('menu:open-recent', async (path: unknown) => {
        try {
          const { isDirty, projectPath } = useAppStore.getState()
          if (isDirty) {
            const box = await window.electronAPI.system.showMessageBox({
              type: 'question',
              buttons: ['Save', 'Discard', 'Cancel'],
              defaultId: 0, cancelId: 2,
              message: 'Unsaved changes',
              detail: 'Save changes before opening another project?'
            })
            if (box.response === 2) return
            if (box.response === 0) {
              if (projectPath) { const r = await doSave(projectPath); if (r?.success === false) return }
              else { const p = await doSaveAs(); if (!p) return }
            }
          }
          const result = await window.electronAPI.file.openProject(path as string)
          if (!result?.success || !result.data) return
          applyProjectData(result.data as any, path as string)
        } catch { /* non-fatal */ }
      }),

      // Export
      window.electronAPI.on('menu:export-png', async () => {
        const dlg = await window.electronAPI.system.showSaveDialog({
          filters: [{ name: 'PNG Image', extensions: ['png'] }]
        })
        if (dlg.canceled || !dlg.filePath) return
        setExportState({ visible: true, mode: 'png', destPath: dlg.filePath })
      }),
      window.electronAPI.on('menu:export-pdf', async () => {
        const dlg = await window.electronAPI.system.showSaveDialog({
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
        })
        if (dlg.canceled || !dlg.filePath) return
        setExportState({ visible: true, mode: 'pdf', destPath: dlg.filePath })
      }),
      window.electronAPI.on('menu:export-bom', () => {
        setExportState({ visible: true, mode: 'bom', destPath: '' })
      }),
      window.electronAPI.on('menu:version-history', () => {
        setVersionHistoryOpen(true)
      }),
    ]

    return () => {
      logger.debug('AppLayout', 'Unbinding IPC menu listeners')
      unsubs.forEach((fn) => typeof fn === 'function' && fn())
    }
  }, [commandBus, netlistManager, doSave, doSaveAs])

  const leftCollapsed = !componentLibraryVisible
  const rightCollapsed = !aiChatPanelVisible
  const layoutClass = [
    'app-layout',
    leftCollapsed && rightCollapsed ? 'app-layout--both-collapsed' :
      leftCollapsed ? 'app-layout--left-collapsed' :
        rightCollapsed ? 'app-layout--right-collapsed' : ''
  ].filter(Boolean).join(' ')

  const style = {
    '--panel-left-w': `${componentLibraryWidth}px`,
    '--panel-right-w': `${aiChatPanelWidth}px`
  } as React.CSSProperties

  return (
    <div className={layoutClass} style={style}>
      <div className="layout-toolbar"><Toolbar /></div>

      <div className="layout-left" style={{ position: 'relative' }}>
        {componentLibraryVisible && (
          <ErrorBoundary>
            <ComponentLibrary />
          </ErrorBoundary>
        )}
        {componentLibraryVisible && (
          <div
            className="panel-splitter panel-splitter--left"
            onPointerDown={(e) => onSplitterDown('componentLibrary', e)}
            onPointerMove={onSplitterMove}
            onPointerUp={onSplitterUp}
          />
        )}
      </div>

      <div className="layout-canvas">
        <ErrorBoundary>
          {currentView === 'welcome' ? <WelcomePage /> : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <SchematicCanvas />
              </div>
              {propertyPanelVisible && (
                <ErrorBoundary>
                  <PropertyPanel />
                </ErrorBoundary>
              )}
            </div>
          )}
        </ErrorBoundary>
      </div>

      <div className="layout-right" style={{ position: 'relative' }}>
        {aiChatPanelVisible && (
          <ErrorBoundary>
            <AIChatPanel />
          </ErrorBoundary>
        )}
        {aiChatPanelVisible && (
          <div
            className="panel-splitter panel-splitter--right"
            onPointerDown={(e) => onSplitterDown('aiChat', e)}
            onPointerMove={onSplitterMove}
            onPointerUp={onSplitterUp}
          />
        )}
      </div>

      <div className="layout-sheets"><SheetTabs /></div>
      <div className="layout-status"><StatusBar /></div>

      <SettingsDialog visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <ExportDialog
        visible={exportState.visible}
        mode={exportState.mode}
        destPath={exportState.destPath}
        onClose={() => setExportState((s) => ({ ...s, visible: false }))}
      />
      <VersionHistoryDrawer
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
      />
    </div>
  )
}
