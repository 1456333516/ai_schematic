import { useCallback, useRef, useEffect, useState } from 'react'
import { useAppStore } from '@renderer/stores/useAppStore'
import { useCanvasStore } from '@renderer/stores/useCanvasStore'
import { Toolbar } from './Toolbar'
import { StatusBar } from './StatusBar'
import { SheetTabs } from './SheetTabs'
import { ComponentLibrary } from '../panels/ComponentLibrary'
import { AIChatPanel } from '../panels/AIChatPanel'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import { ErrorBoundary } from '../ErrorBoundary'
import { SchematicCanvas } from '../canvas/SchematicCanvas'
import { WelcomePage } from '../welcome/WelcomePage'
import { logger } from '@shared/utils/logger'
import '@renderer/styles/layout.css'

export function AppLayout() {
  const {
    currentView,
    componentLibraryVisible,
    aiChatPanelVisible,
    componentLibraryWidth,
    aiChatPanelWidth,
    setPanelWidth
  } = useAppStore()

  const [settingsVisible, setSettingsVisible] = useState(false)

  logger.debug('AppLayout', 'Render', {
    currentView,
    componentLibraryVisible,
    aiChatPanelVisible,
    componentLibraryWidth,
    aiChatPanelWidth
  })

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

  // Global IPC menu listeners
  useEffect(() => {
    logger.debug('AppLayout', 'Binding IPC menu listeners')
    const unsubs = [
      window.electronAPI.on('menu:toggle-grid', () => {
        logger.debug('AppLayout', 'IPC menu:toggle-grid')
        useCanvasStore.getState().toggleGrid()
      }),
      window.electronAPI.on('menu:toggle-component-library', () => {
        logger.debug('AppLayout', 'IPC menu:toggle-component-library')
        useAppStore.getState().toggleComponentLibrary()
      }),
      window.electronAPI.on('menu:toggle-ai-chat', () => {
        logger.debug('AppLayout', 'IPC menu:toggle-ai-chat')
        useAppStore.getState().toggleAIChatPanel()
      }),
      window.electronAPI.on('menu:new-project', () => {
        logger.debug('AppLayout', 'IPC menu:new-project')
        useAppStore.getState().setCurrentView('welcome')
      }),
      window.electronAPI.on('menu:settings', () => {
        logger.debug('AppLayout', 'IPC menu:settings')
        setSettingsVisible(true)
      }),
    ]
    return () => {
      logger.debug('AppLayout', 'Unbinding IPC menu listeners')
      unsubs.forEach((fn) => fn())
    }
  }, [])

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

  logger.debug('AppLayout', 'Layout class', { layoutClass })

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
          {currentView === 'welcome' ? <WelcomePage /> : <SchematicCanvas />}
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
    </div>
  )
}
