import { useEffect, useRef, useState } from 'react'
import { Graph } from '@antv/x6'
import { Selection } from '@antv/x6-plugin-selection'
import { Snapline } from '@antv/x6-plugin-snapline'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import { Clipboard } from '@antv/x6-plugin-clipboard'
import { History } from '@antv/x6-plugin-history'
import { MiniMap } from '@antv/x6-plugin-minimap'
import { useCanvasStore } from '@renderer/stores/useCanvasStore'
import { useAppStore } from '@renderer/stores/useAppStore'
import { registerAllShapes } from '../shapes/registerShapes'
import { logger } from '@shared/utils/logger'
import { useDomain } from '@renderer/contexts/DomainContext'

let graphInstance: Graph | null = null
export function getGraph(): Graph | null { return graphInstance }

export function SchematicCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  const { gridVisible, activeTool } = useCanvasStore()
  const { initializeGraphSyncer, netlistManager } = useDomain()

  logger.debug('Canvas', 'SchematicCanvas render', { gridVisible, activeTool, hasGraph: !!graphRef.current })

  // Initialize graph
  useEffect(() => {
    logger.info('Canvas', 'useEffect: init start', {
      container: !!containerRef.current,
      existingGraph: !!graphRef.current
    })

    if (!containerRef.current) {
      logger.warn('Canvas', 'Container ref is null, skipping init')
      return
    }
    if (graphRef.current) {
      logger.debug('Canvas', 'Graph already exists, skipping init')
      return
    }

    try {
      // Step 1: Register shapes
      logger.debug('Canvas', 'Step 1: Registering shapes...')
      registerAllShapes()
      logger.debug('Canvas', 'Step 1: Shapes registered OK')

      // Step 2: Create graph
      logger.debug('Canvas', 'Step 2: Creating Graph...', {
        containerSize: {
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight
        }
      })
      const graph = new Graph({
        container: containerRef.current,
        grid: {
          visible: true,
          size: 10,
          type: 'dot',
          args: { color: '#ddd', thickness: 1 }
        },
        background: { color: '#FFFFFF' },
        mousewheel: {
          enabled: true,
          modifiers: 'ctrl',
          minScale: 0.2,
          maxScale: 4
        },
        panning: { enabled: true },
        connecting: {
          router: {
            name: 'manhattan',
            args: {
              padding: { left: 30, top: 30, right: 30, bottom: 30 },
              step: 10,
              excludeTerminals: ['source', 'target']
            }
          },
          connector: { name: 'rounded', args: { radius: 4 } },
          snap: { radius: 20 },
          allowBlank: false,
          allowLoop: false,
          allowMulti: false,
          highlight: true,
          createEdge() {
            return graph.createEdge({ shape: 'schematic-wire' })
          }
        },
        highlighting: {
          magnetAdsorbed: {
            name: 'stroke',
            args: { attrs: { fill: '#5F95FF', stroke: '#5F95FF' } }
          }
        }
      })
      logger.info('Canvas', 'Step 2: Graph created OK')

      // Step 3: Plugins
      const usePlugin = (name: string, factory: () => unknown) => {
        try {
          logger.debug('Canvas', `Step 3: Loading plugin [${name}]...`)
          graph.use(factory() as never)
          logger.debug('Canvas', `Step 3: Plugin [${name}] OK`)
        } catch (e) {
          logger.error('Canvas', `Step 3: Plugin [${name}] FAILED`, e)
        }
      }
      usePlugin('Selection', () => new Selection({
        enabled: true,
        multiple: true,
        rubberband: true,
        movable: true,
        showNodeSelectionBox: true
      }))
      usePlugin('Snapline', () => new Snapline({ enabled: true }))
      usePlugin('Keyboard', () => new Keyboard({ enabled: true, global: false }))
      usePlugin('Clipboard', () => new Clipboard({ enabled: true }))
      usePlugin('History', () => new History({ enabled: true }))

      if (minimapRef.current) {
        usePlugin('MiniMap', () => new MiniMap({
          container: minimapRef.current!,
          width: 200,
          height: 160
        }))
      } else {
        logger.warn('Canvas', 'MiniMap container ref is null, skipping')
      }

      // Step 4: Event wiring
      logger.debug('Canvas', 'Step 4: Binding events...')
      let rafId = 0
      graph.on('cell:mousemove', ({ e }) => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const p = graph.clientToLocal({ x: e.clientX, y: e.clientY })
          useCanvasStore.getState().setCursor(p.x, p.y)
        })
      })
      graph.on('blank:mousemove', ({ e }) => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const p = graph.clientToLocal({ x: e.clientX, y: e.clientY })
          useCanvasStore.getState().setCursor(p.x, p.y)
        })
      })

      graph.on('scale', ({ sx }: { sx: number }) => {
        useCanvasStore.getState().setZoom(sx)
      })

      graph.on('selection:changed', ({ selected }: { selected: { isNode: () => boolean; id: string }[] }) => {
        const ids = selected.filter((c) => c.isNode()).map((c) => c.id)
        useCanvasStore.getState().setSelectedNodes(ids)
        useAppStore.getState().setPropertyPanelVisible(ids.length > 0)
      })

      graph.on('node:added', ({ node }: { node: { getData: () => Record<string, unknown> | undefined; attr: (path: string, val: unknown) => void; setData: (d: unknown) => void } }) => {
        useCanvasStore.getState().incrementNodeCount()
        useAppStore.getState().markDirty()
        const data = node.getData()
        if (data?.refDesPrefix && !data.refDes) {
          const refDes = useCanvasStore.getState().getNextRefDes(data.refDesPrefix as string)
          node.attr('refDes/text', refDes)
          node.setData({ ...data, refDes })
          logger.debug('Canvas', 'Node added, assigned refDes', { refDes })
        }
      })
      graph.on('node:removed', () => { useCanvasStore.getState().decrementNodeCount() })
      logger.debug('Canvas', 'Step 4: Events bound OK')

      // Step 5: Keyboard shortcuts
      logger.debug('Canvas', 'Step 5: Binding keyboard shortcuts...')
      graph.bindKey('delete', () => {
        const cells = graph.getSelectedCells()
        if (cells.length) graph.removeCells(cells)
      })
      graph.bindKey('backspace', () => {
        const cells = graph.getSelectedCells()
        if (cells.length) graph.removeCells(cells)
      })

      const guardKey = (key: string, fn: () => void) => {
        graph.bindKey(key, () => {
          const el = document.activeElement
          if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)) return
          fn()
        })
      }

      guardKey('v', () => useCanvasStore.getState().setActiveTool('select'))
      guardKey('h', () => useCanvasStore.getState().setActiveTool('pan'))
      guardKey('b', () => useCanvasStore.getState().setActiveTool('select-box'))
      guardKey('r', () => {
        graph.getSelectedCells().filter((c) => c.isNode()).forEach((node) => {
          node.rotate(90, { absolute: false })
        })
      })
      guardKey('x', () => {
        graph.getSelectedCells().filter((c) => c.isNode()).forEach((node) => {
          const current = node.attr('body/transform') || ''
          const flipped = current.includes('scale(-1')
          const { width } = node.size()
          node.attr('body/transform', flipped ? '' : `scale(-1,1) translate(${-width},0)`)
        })
      })

      graph.bindKey('ctrl+=', () => graph.zoom(0.1))
      graph.bindKey('ctrl+-', () => graph.zoom(-0.1))
      graph.bindKey('ctrl+0', () => graph.zoomToFit({ padding: 40 }))

      graph.bindKey('ctrl+z', () => { if (graph.canUndo()) graph.undo() })
      graph.bindKey('ctrl+y', () => { if (graph.canRedo()) graph.redo() })

      graph.bindKey('ctrl+c', () => {
        const cells = graph.getSelectedCells()
        if (cells.length) graph.copy(cells)
      })
      graph.bindKey('ctrl+v', () => {
        if (!graph.isClipboardEmpty()) {
          const pasted = graph.paste({ offset: { dx: 20, dy: 20 } })
          pasted.filter((c) => c.isNode()).forEach((node) => {
            const data = node.getData() as Record<string, unknown> | undefined
            if (data?.refDesPrefix) {
              const newDes = useCanvasStore.getState().getNextRefDes(data.refDesPrefix as string)
              node.attr('refDes/text', newDes)
              node.setData({ ...data, refDes: newDes })
            }
          })
        }
      })
      logger.debug('Canvas', 'Step 5: Keyboard shortcuts OK')

      // Done
      graphRef.current = graph
      graphInstance = graph
      initializeGraphSyncer(graph)

      // Apply pending project data (opened from welcome page)
      // setTimeout(0) defers clearing so React StrictMode's second effect run
      // also finds the data (first run clears it synchronously, second run misses it otherwise)
      const pending = useAppStore.getState().pendingProjectData
      if (pending) {
        try { graph.fromJSON(pending.canvas) } catch { /* non-fatal */ }
        try { netlistManager.loadFromDSL(pending.schema) } catch { /* non-fatal */ }
        useAppStore.getState().markClean()
        setTimeout(() => {
          useAppStore.getState().setPendingProjectData(null)
          useAppStore.getState().markClean()
        }, 0)
      }

      logger.info('Canvas', 'Init complete — all steps passed')

      return () => {
        logger.info('Canvas', 'Disposing graph...')
        cancelAnimationFrame(rafId)
        graph.dispose()
        graphRef.current = null
        graphInstance = null
      }
    } catch (e) {
      const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
      logger.error('Canvas', 'Init FAILED', e)
      setInitError(msg)
    }
  }, [])

  // Sync grid visibility
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    logger.debug('Canvas', 'Sync grid', { gridVisible })
    gridVisible ? graph.showGrid() : graph.hideGrid()
  }, [gridVisible])

  // Sync tool mode — use ref to only disable the *previous* mode
  // Avoids calling disablePanning() on first render (X6 Selection plugin
  // throws if no mouse event has occurred yet).
  const prevToolRef = useRef(activeTool)
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    const prev = prevToolRef.current
    prevToolRef.current = activeTool
    if (prev === activeTool) return

    logger.debug('Canvas', 'Sync tool mode', { from: prev, to: activeTool })
    try {
      if (prev === 'pan') graph.disablePanning()
      if (prev === 'select-box') graph.disableRubberband()

      if (activeTool === 'pan') {
        graph.disableRubberband()
        graph.enablePanning()
      } else if (activeTool === 'select-box') {
        graph.disablePanning()
        graph.enableRubberband()
      } else {
        // select: panning allowed, rubberband disabled
        graph.disableRubberband()
      }
    } catch (e) {
      logger.warn('Canvas', 'Tool mode sync error (non-fatal)', e)
    }
  }, [activeTool])

  // Wire toolbar buttons via DOM id
  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return
    const handlers: Record<string, () => void> = {
      'btn-undo': () => { if (graph.canUndo()) graph.undo() },
      'btn-redo': () => { if (graph.canRedo()) graph.redo() },
      'btn-zoom-in': () => graph.zoom(0.1),
      'btn-zoom-out': () => graph.zoom(-0.1),
      'btn-zoom-fit': () => graph.zoomToFit({ padding: 40 }),
      'btn-rotate': () => graph.getSelectedCells().filter((c) => c.isNode()).forEach((n) => n.rotate(90, { absolute: false })),
      'btn-flip': () => graph.getSelectedCells().filter((c) => c.isNode()).forEach((node) => {
        const cur = node.attr('body/transform') || ''
        const flipped = cur.includes('scale(-1')
        const { width } = node.size()
        node.attr('body/transform', flipped ? '' : `scale(-1,1) translate(${-width},0)`)
      })
    }
    for (const [id, handler] of Object.entries(handlers)) {
      document.getElementById(id)?.addEventListener('click', handler)
    }
    return () => {
      for (const [id, handler] of Object.entries(handlers)) {
        document.getElementById(id)?.removeEventListener('click', handler)
      }
    }
  }, [])

  if (initError) {
    return (
      <div style={{ padding: 24, color: '#ff4d4f', fontFamily: 'monospace', fontSize: 12, overflow: 'auto' }}>
        <b>Canvas init failed:</b>
        <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{initError}</pre>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div
        ref={minimapRef}
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-l1)',
          borderRadius: 4
        }}
      />
    </div>
  )
}
