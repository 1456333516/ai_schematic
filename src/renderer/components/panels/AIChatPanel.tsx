import { useState, useEffect, useRef } from 'react'
import { Input, Button, Spin, Alert, Tag } from 'antd'
import {
  SendOutlined,
  ClearOutlined,
  StopOutlined,
  ThunderboltOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import { useCanvasStore } from '@renderer/stores/useCanvasStore'
import { useDomain } from '@renderer/contexts/DomainContext'
import { getGraph } from '../canvas/SchematicCanvas'
import { createICNode } from '../shapes/registerShapes'
import type { AnalysisReport, AnalysisItem } from '@shared/types/project'

type Message =
  | { id: string; role: 'user' | 'assistant'; content: string; timestamp: number }
  | { id: string; role: 'analysis'; report: AnalysisReport; timestamp: number }

function AnalysisResultBubble({ report }: { report: AnalysisReport }) {
  const allEmpty = report.errors.length === 0 && report.warnings.length === 0 && report.suggestions.length === 0

  const renderItems = (items: AnalysisItem[], color: string) =>
    items.map((item, i) => (
      <div key={i} style={{ fontSize: 'var(--font-size-xs)', marginBottom: 4, color }}>
        • {item.message}{item.component ? ` (${item.component})` : ''}
      </div>
    ))

  return (
    <div style={{ fontSize: 'var(--font-size-sm)' }}>
      {allEmpty ? (
        <div style={{ color: '#52c41a', fontWeight: 500 }}>✓ 分析完成，未发现问题</div>
      ) : (
        <>
          {report.errors.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: '#ff4d4f', fontWeight: 500, marginBottom: 4 }}>错误 ({report.errors.length})</div>
              {renderItems(report.errors, '#ff4d4f')}
            </div>
          )}
          {report.warnings.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: '#faad14', fontWeight: 500, marginBottom: 4 }}>警告 ({report.warnings.length})</div>
              {renderItems(report.warnings, '#faad14')}
            </div>
          )}
          {report.suggestions.length > 0 && (
            <div>
              <div style={{ color: '#1677ff', fontWeight: 500, marginBottom: 4 }}>建议 ({report.suggestions.length})</div>
              {renderItems(report.suggestions, '#1677ff')}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface ProgressInfo {
  operation: string
  count: number
  total: number
}

interface NetlistContext {
  components: Array<{ id: string; type: string; category: string; properties: Record<string, any> }>
  connections: Array<{ from: string; to: string; net: string }>
}

function buildContextFromGraph(): NetlistContext {
  const graph = getGraph()
  const empty: NetlistContext = { components: [], connections: [] }
  if (!graph) return empty

  const components = graph.getNodes().map(node => {
    const data = (node.getData() ?? {}) as Record<string, any>
    return {
      id: data.refDes || node.id,
      type: data.category || 'component',
      category: data.category || 'component',
      properties: {
        value: data.label ?? '',
        package: data.package ?? ''
      }
    }
  })

  const connections = graph.getEdges().map((edge, i) => {
    const fromCellId = edge.getSourceCellId() ?? ''
    const fromPortId = edge.getSourcePortId() ?? ''
    const toCellId = edge.getTargetCellId() ?? ''
    const toPortId = edge.getTargetPortId() ?? ''

    const fromData = (graph.getCellById(fromCellId)?.getData() ?? {}) as any
    const toData = (graph.getCellById(toCellId)?.getData() ?? {}) as any
    const fromRef = fromData.refDes || fromCellId
    const toRef = toData.refDes || toCellId

    return {
      from: fromPortId ? `${fromRef}.${fromPortId}` : fromRef,
      to: toPortId ? `${toRef}.${toPortId}` : toRef,
      net: `net${i}`
    }
  })

  return { components, connections }
}

const SHAPE_MAP: Record<string, string> = {
  resistor: 'schematic-resistor',
  capacitor: 'schematic-capacitor',
  led: 'schematic-led',
  diode: 'schematic-diode',
  inductor: 'schematic-inductor',
  fuse: 'schematic-fuse',
  zener: 'schematic-zener',
  schottky: 'schematic-schottky',
  transistor: 'schematic-npn',
  npn: 'schematic-npn',
  pnp: 'schematic-pnp',
  nmos: 'schematic-nmos',
  pmos: 'schematic-pmos',
  opamp: 'schematic-opamp',
  'gate-and': 'schematic-gate-and',
  'gate-or': 'schematic-gate-or',
  'gate-not': 'schematic-gate-not',
  'gate-nand': 'schematic-gate-nand',
  'gate-nor': 'schematic-gate-nor',
  crystal: 'schematic-crystal',
  buzzer: 'schematic-buzzer',
  'net-port': 'schematic-net-port',
  ic: 'schematic-ic',
  connector: 'schematic-ic',
}

const BASE_GEOMETRY: Record<string, { width: number; height: number; pinY: number }> = {
  'schematic-resistor': { width: 80, height: 30, pinY: 15 },
  'schematic-capacitor': { width: 60, height: 30, pinY: 15 },
  'schematic-led': { width: 60, height: 40, pinY: 20 },
  'schematic-diode': { width: 60, height: 40, pinY: 20 },
  'schematic-inductor': { width: 80, height: 30, pinY: 15 },
  'schematic-fuse': { width: 80, height: 30, pinY: 15 },
  'schematic-zener': { width: 60, height: 40, pinY: 20 },
  'schematic-schottky': { width: 60, height: 40, pinY: 20 },
  'schematic-npn': { width: 80, height: 60, pinY: 30 },
  'schematic-pnp': { width: 80, height: 60, pinY: 30 },
  'schematic-nmos': { width: 80, height: 60, pinY: 30 },
  'schematic-pmos': { width: 80, height: 60, pinY: 30 },
  'schematic-opamp': { width: 80, height: 60, pinY: 30 },
  'schematic-gate-and': { width: 70, height: 50, pinY: 25 },
  'schematic-gate-or': { width: 70, height: 50, pinY: 25 },
  'schematic-gate-not': { width: 60, height: 50, pinY: 25 },
  'schematic-gate-nand': { width: 74, height: 50, pinY: 25 },
  'schematic-gate-nor': { width: 74, height: 50, pinY: 25 },
  'schematic-crystal': { width: 80, height: 40, pinY: 20 },
  'schematic-buzzer': { width: 70, height: 50, pinY: 25 },
  'schematic-net-port': { width: 70, height: 24, pinY: 12 },
  'schematic-ic': { width: 120, height: 80, pinY: 40 },
  'schematic-vcc': { width: 30, height: 20, pinY: 20 },
  'schematic-gnd': { width: 30, height: 20, pinY: 0 },
}

// Port absolute Y positions within node for multi-terminal shapes
const PORT_Y: Record<string, Record<string, number>> = {
  'schematic-npn': { B: 30, C: 5, E: 55 },
  'schematic-pnp': { B: 30, C: 5, E: 55 },
  'schematic-nmos': { G: 30, D: 5, S: 55 },
  'schematic-pmos': { G: 30, D: 5, S: 55 },
  'schematic-opamp': { 'IN+': 20, 'IN-': 40, OUT: 30, 'V+': 0, 'V-': 60 },
  'schematic-gate-and': { A: 15, B: 35, Y: 25 },
  'schematic-gate-or': { A: 15, B: 35, Y: 25 },
  'schematic-gate-nand': { A: 15, B: 35, Y: 25 },
  'schematic-gate-nor': { A: 15, B: 35, Y: 25 },
  'schematic-gate-not': { A: 25, Y: 25 },
}

const GRID_SIZE = 10

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

function parseNodeId(pinRef: string): string {
  return String(pinRef ?? '').split('.')[0]
}

function parsePinId(pinRef: string): string {
  const parts = String(pinRef ?? '').split('.')
  return parts.length > 1 ? parts[1] : ''
}

function isVccSymbolType(symbolType?: string): boolean {
  const s = String(symbolType ?? '').toUpperCase()
  return s === 'VCC' || s === 'VDD'
}

function isGndSymbolType(symbolType?: string): boolean {
  const s = String(symbolType ?? '').toUpperCase()
  return s === 'GND' || s === 'VSS'
}

function isPowerSymbolType(symbolType?: string): boolean {
  return isVccSymbolType(symbolType) || isGndSymbolType(symbolType)
}

function powerShapeFromSymbolType(symbolType?: string): 'schematic-vcc' | 'schematic-gnd' {
  return isGndSymbolType(symbolType) ? 'schematic-gnd' : 'schematic-vcc'
}

function geometryForShape(shape?: string): { width: number; height: number; pinY: number } {
  return BASE_GEOMETRY[shape ?? ''] ?? BASE_GEOMETRY['schematic-resistor']
}

function setSnappedPosition(
  positions: Map<string, { x: number; y: number }>,
  id: string,
  x: number,
  y: number
): void {
  positions.set(id, { x: snapToGrid(x), y: snapToGrid(y) })
}

// Two-mode layout engine:
//   MODIFY MODE  – new components connect to existing graph nodes → anchor to existing positions
//   FRESH MODE   – all components are new → rank-based BFS grid layout
function computeLayout(
  toolCalls: any[],
  startX: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const graph = getGraph()

  const addComps = toolCalls.filter(tc => tc?.name === 'add_component')
  const addPower = toolCalls.filter(tc => tc?.name === 'add_power_symbol')
  const connects = toolCalls.filter(tc => tc?.name === 'connect_pins')

  const vccIds = new Set<string>(
    addPower.filter(tc => isVccSymbolType(tc?.input?.symbolType)).map(tc => String(tc.input.id))
  )
  const gndIds = new Set<string>(
    addPower.filter(tc => isGndSymbolType(tc?.input?.symbolType)).map(tc => String(tc.input.id))
  )
  const newSignalIds = new Set<string>(addComps.map(tc => String(tc.input.id)))
  const allNewIds = new Set<string>([...newSignalIds, ...vccIds, ...gndIds])

  // Build shape lookup
  const shapeById = new Map<string, string>()
  for (const tc of addComps) {
    const id = String(tc.input.id)
    const rawType = String(tc.input?.type ?? '').toLowerCase()
    shapeById.set(id, SHAPE_MAP[rawType] ?? 'schematic-resistor')
  }
  for (const tc of addPower) {
    const id = String(tc.input.id)
    shapeById.set(id, powerShapeFromSymbolType(tc?.input?.symbolType))
  }

  const shapeOf = (id: string): string => shapeById.get(id) ?? 'schematic-resistor'
  const geomOf = (id: string) => geometryForShape(shapeOf(id))

  // Build adjacency list
  const adj = new Map<string, Set<string>>()
  const ensureAdj = (id: string) => { if (!adj.has(id)) adj.set(id, new Set()) }
  for (const id of allNewIds) ensureAdj(id)
  for (const tc of connects) {
    const a = parseNodeId(tc?.input?.from)
    const b = parseNodeId(tc?.input?.to)
    if (!a || !b) continue
    ensureAdj(a); ensureAdj(b)
    adj.get(a)!.add(b); adj.get(b)!.add(a)
  }

  const existingBBox = (id: string) => {
    if (!graph) return null
    const cell = graph.getCellById(id)
    if (!cell || !(cell as any).isNode?.()) return null
    return (cell as any).getBBox() as { x: number; y: number; width: number; height: number }
  }

  const isModifyMode = [...allNewIds].some(id =>
    [...(adj.get(id) ?? [])].some(nb => !allNewIds.has(nb) && existingBBox(nb) !== null)
  )

  // ── MODIFY MODE ────────────────────────────────────────────────────────────
  if (isModifyMode) {
    const connCounts = new Map<string, Map<string, number>>()
    for (const tc of connects) {
      const a = parseNodeId(tc?.input?.from)
      const b = parseNodeId(tc?.input?.to)
      for (const [newId, existingId] of [[a, b], [b, a]] as [string, string][]) {
        if (!allNewIds.has(newId) || allNewIds.has(existingId) || !existingBBox(existingId)) continue
        if (!connCounts.has(newId)) connCounts.set(newId, new Map())
        const m = connCounts.get(newId)!
        m.set(existingId, (m.get(existingId) ?? 0) + 1)
      }
    }

    const ITEM_SPACING = 120
    // Sort by connection count descending for stable placement
    const sortedIds = [...allNewIds].sort((a, b) => {
      const ca = [...(connCounts.get(a)?.values() ?? [])].reduce((s, n) => s + n, 0)
      const cb = [...(connCounts.get(b)?.values() ?? [])].reduce((s, n) => s + n, 0)
      return cb !== ca ? cb - ca : a.localeCompare(b)
    })

    for (const id of sortedIds) {
      const counts = connCounts.get(id)
      if (!counts || counts.size === 0) continue

      let anchorId: string | undefined
      let bestCount = -1
      for (const [nb, count] of counts) {
        const data = (graph?.getCellById(nb) as any)?.getData?.()
        if (!isPowerSymbolType(data?.symbolType) && count > bestCount) {
          bestCount = count; anchorId = nb
        }
      }
      if (!anchorId) anchorId = [...counts.entries()].sort(([, a], [, b]) => b - a)[0]?.[0]
      if (!anchorId) continue

      const anchor = existingBBox(anchorId)
      if (!anchor) continue

      const anchorX = snapToGrid(anchor.x)
      let maxBottom = anchor.y + anchor.height // FIX: use bottom edge, not top

      if (graph) {
        for (const node of graph.getNodes()) {
          const bbox = (node as any).getBBox() as { x: number; y: number; width: number; height: number }
          if (Math.abs(snapToGrid(bbox.x) - anchorX) <= GRID_SIZE)
            maxBottom = Math.max(maxBottom, bbox.y + bbox.height)
        }
      }
      for (const [placedId, pos] of positions) {
        if (Math.abs(pos.x - anchorX) <= GRID_SIZE)
          maxBottom = Math.max(maxBottom, pos.y + geomOf(placedId).height)
      }

      setSnappedPosition(positions, id, anchorX, maxBottom + ITEM_SPACING)
    }

    // FIX: unresolved nodes get grid placement instead of stacking at same point
    const unresolved = [...allNewIds].filter(id => !positions.has(id)).sort((a, b) => a.localeCompare(b))
    if (unresolved.length > 0) {
      let maxRight = startX
      let minTop = 300
      if (graph) {
        for (const node of graph.getNodes()) {
          const bbox = (node as any).getBBox() as { x: number; y: number; width: number; height: number }
          maxRight = Math.max(maxRight, bbox.x + bbox.width)
          minTop = Math.min(minTop, bbox.y)
        }
      }
      for (const [placedId, pos] of positions) {
        maxRight = Math.max(maxRight, pos.x + geomOf(placedId).width)
        minTop = Math.min(minTop, pos.y)
      }
      const GRID_COLS = 3
      const GRID_X_SPACING = 220
      const GRID_Y_SPACING = 160
      const gridStartX = snapToGrid(Math.max(startX, maxRight + 140))
      const gridStartY = snapToGrid(minTop)
      unresolved.forEach((id, index) => {
        const col = index % GRID_COLS
        const row = Math.floor(index / GRID_COLS)
        setSnappedPosition(positions, id, gridStartX + col * GRID_X_SPACING, gridStartY + row * GRID_Y_SPACING)
      })
    }

    return positions
  }

  // ── FRESH MODE: simple grid placement (Phase 1) ───────────────────────────
  // Place components on a basic non-overlapping grid. Phase 2 (AI optimize) handles final layout.
  const GRID_COLS = 3
  const GRID_X_GAP = 200
  const GRID_Y_GAP = 150
  const GRID_START_X = startX + 100
  const GRID_START_Y = 150

  // Order: VCC first, then signal components (sorted), then GND last
  const orderedIds = [
    ...[...vccIds].sort(),
    ...[...newSignalIds].sort(),
    ...[...gndIds].sort()
  ]

  orderedIds.forEach((id, index) => {
    const col = index % GRID_COLS
    const row = Math.floor(index / GRID_COLS)
    setSnappedPosition(positions, id, GRID_START_X + col * GRID_X_GAP, GRID_START_Y + row * GRID_Y_GAP)
  })

  return positions
}

// Build canvas description for AI layout optimization (Phase 2)
function buildCanvasDescription(toolCalls: any[]): string {
  const addComps = toolCalls.filter(tc => tc?.name === 'add_component')
  const addPower = toolCalls.filter(tc => tc?.name === 'add_power_symbol')
  const connects = toolCalls.filter(tc => tc?.name === 'connect_pins')

  const lines: string[] = ['Optimize the layout for these components and connections.', '']
  lines.push('Components:')

  for (const tc of addPower) {
    const { id, symbolType } = tc.input
    const isGND = symbolType === 'GND' || symbolType === 'VSS'
    const shape = isGND ? 'schematic-gnd' : 'schematic-vcc'
    const geom = BASE_GEOMETRY[shape] ?? { width: 30, height: 20 }
    const portInfo = isGND ? 'P at (15,0)' : 'P at (15,20)'
    lines.push(`- ${id}: power ${symbolType}, ${geom.width}x${geom.height}, ports: ${portInfo}`)
  }

  for (const tc of addComps) {
    const { id, type, properties } = tc.input
    const shape = SHAPE_MAP[(type ?? '').toLowerCase()] ?? 'schematic-resistor'
    const geom = BASE_GEOMETRY[shape] ?? { width: 80, height: 30 }
    const value = properties?.value ?? ''
    const label = value ? ` (${value})` : ''

    // Build port info string
    const portMap = PORT_Y[shape]
    let portInfo: string
    if (portMap) {
      portInfo = Object.entries(portMap).map(([name, y]) => {
        const x = name === 'B' || name === 'G' || name === 'IN+' || name === 'IN-' || name === 'A' || name === 'P'
          ? 0 : name === 'V+' ? geom.width / 2 : name === 'V-' ? geom.width / 2 : geom.width
        return `${name} at (${x},${y})`
      }).join(', ')
    } else if (shape === 'schematic-net-port') {
      portInfo = 'P at (70,12)'
    } else if (shape === 'schematic-buzzer') {
      portInfo = 'P at (0,25), N at (70,25)'
    } else {
      const pinY = geom.pinY ?? geom.height / 2
      portInfo = `L at (0,${pinY}), R at (${geom.width},${pinY})`
    }
    lines.push(`- ${id}: ${type}${label}, ${geom.width}x${geom.height}, ports: ${portInfo}`)
  }

  lines.push('')
  lines.push('Connections:')
  for (const tc of connects) {
    lines.push(`- ${tc.input.from} → ${tc.input.to}`)
  }

  return lines.join('\n')
}

// Apply a batch of tool calls with pre-computed positions
function applyToolCallBatch(toolCalls: any[], startX: number): void {
  const graph = getGraph()
  if (!graph) return

  const positions = computeLayout(toolCalls, startX)

  for (const toolCall of toolCalls) {
    switch (toolCall.name) {
      case 'add_component': {
        const { id, type, properties } = toolCall.input
        const shape = SHAPE_MAP[(type ?? '').toLowerCase()] ?? 'schematic-resistor'
        const pos = positions.get(id) ?? { x: startX, y: 300 }
        const value = properties?.value ?? ''

        // net-port: show signal name (value or id) as the label
        const displayRefDes = shape === 'schematic-net-port' ? (value || id) : id

        let nodeConfig: Record<string, unknown>
        if (shape === 'schematic-ic') {
          const ic = createICNode(properties?.pinCount ?? 8)
          nodeConfig = {
            ...ic, id, x: pos.x, y: pos.y,
            attrs: { refDes: { text: id }, valueLabel: { text: value } },
            data: { refDes: id, refDesPrefix: id.replace(/\d+$/, ''), label: value, category: type }
          }
        } else {
          nodeConfig = {
            shape, id, x: pos.x, y: pos.y,
            attrs: { refDes: { text: displayRefDes }, valueLabel: { text: shape === 'schematic-net-port' ? '' : value } },
            data: { refDes: id, refDesPrefix: id.replace(/\d+$/, ''), label: value, category: type }
          }
        }
        try { graph.addNode(nodeConfig) } catch (e) { console.warn('[AI] addNode failed:', e) }
        break
      }

      case 'add_power_symbol': {
        const { id, symbolType } = toolCall.input
        const isGND = symbolType === 'GND' || symbolType === 'VSS'
        const shape = isGND ? 'schematic-gnd' : 'schematic-vcc'
        const pos = positions.get(id) ?? { x: startX, y: isGND ? 450 : 150 }
        try {
          graph.addNode({ shape, id, x: pos.x, y: pos.y, data: { refDes: id, symbolType } })
        } catch (e) { console.warn('[AI] addPowerSymbol failed:', e) }
        break
      }

      case 'connect_pins': {
        const { from, to } = toolCall.input
        const dotFrom = (from as string).indexOf('.')
        const dotTo = (to as string).indexOf('.')
        if (dotFrom === -1 || dotTo === -1) break

        const fromCell = (from as string).slice(0, dotFrom)
        const fromPort = (from as string).slice(dotFrom + 1)
        const toCell = (to as string).slice(0, dotTo)
        const toPort = (to as string).slice(dotTo + 1)

        if (!graph.getCellById(fromCell) || !graph.getCellById(toCell)) {
          console.warn('[AI] connect_pins: node not found', from, to)
          break
        }
        try {
          graph.addEdge({
            shape: 'schematic-wire',
            source: { cell: fromCell, port: fromPort },
            target: { cell: toCell, port: toPort }
          })
        } catch (e) { console.warn('[AI] addEdge failed:', e) }
        break
      }
    }
  }
}

export function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamingTextRef = useRef('')
  const toolCallBufferRef = useRef<any[]>([])
  const startXRef = useRef(300)

  const { nodeCount } = useCanvasStore()
  const { netlistManager } = useDomain()
  const isModifyMode = nodeCount > 0

  useEffect(() => {
    const handleToolCall = (toolCall: any) => {
      if (!toolCall?.name) return
      toolCallBufferRef.current.push(toolCall)
      setProgress((prev) => ({
        operation: `Received ${toolCall.input?.id ?? toolCall.name}...`,
        count: toolCallBufferRef.current.length,
        total: Math.max(toolCallBufferRef.current.length, prev?.total ?? 0)
      }))
    }

    const handleText = (text: any) => {
      if (text !== undefined && text !== null) {
        streamingTextRef.current += String(text)
        setStreamingText(streamingTextRef.current)
      }
    }

    const handleComplete = async () => {
      // Phase 1: Apply all buffered tool calls with basic grid layout
      const bufferedCalls = [...toolCallBufferRef.current]
      if (bufferedCalls.length > 0) {
        applyToolCallBatch(bufferedCalls, startXRef.current)
        toolCallBufferRef.current = []
      }

      const graph = getGraph()

      // Phase 2: AI layout optimization — ask AI to compute optimal positions
      if (graph && bufferedCalls.length > 0) {
        try {
          setProgress('Optimizing layout...')
          const canvasDesc = buildCanvasDescription(bufferedCalls)
          const moves = await window.electron?.ipcRenderer.invoke('ai:optimize-layout', canvasDesc)
          if (Array.isArray(moves) && moves.length > 0) {
            // Apply rotations first, then positions (rotation affects bounding box)
            for (const action of moves) {
              if (action.name === 'rotate_component') {
                const { id, angle } = action.input
                const node = graph.getCellById(id)
                if (node && (node as any).isNode?.() && angle) {
                  (node as any).rotate(angle, { absolute: true })
                }
              }
            }
            for (const action of moves) {
              if (action.name === 'move_component') {
                const { id, x, y } = action.input
                const node = graph.getCellById(id)
                if (node && (node as any).isNode?.()) {
                  (node as any).setPosition(
                    Math.round(x / 10) * 10,
                    Math.round(y / 10) * 10
                  )
                }
              }
            }
          }
        } catch (e) {
          console.warn('[AI] Layout optimization failed, keeping grid layout:', e)
        }
      }

      if (graph) {
        requestAnimationFrame(() => graph.zoomToFit({ padding: 60 }))
      }

      const finalText = streamingTextRef.current
      const content = finalText || 'Schematic generated successfully.'
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content, timestamp: Date.now() }
      ])
      streamingTextRef.current = ''
      setStreamingText('')
      setIsGenerating(false)
      setProgress(null)
    }

    const handleError = (errorData: any) => {
      const errorMessage = errorData?.message || errorData || 'Unknown error occurred'
      setError(String(errorMessage))
      setIsGenerating(false)
      setProgress(null)
    }

    const unsubToolCall = window.electron?.ipcRenderer.on('ai:tool-call', handleToolCall)
    const unsubText = window.electron?.ipcRenderer.on('ai:text', handleText)
    const unsubComplete = window.electron?.ipcRenderer.on('ai:complete', handleComplete)
    const unsubError = window.electron?.ipcRenderer.on('ai:error', handleError)

    return () => {
      unsubToolCall?.()
      unsubText?.()
      unsubComplete?.()
      unsubError?.()
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, timestamp: Date.now() }
    ])
  }

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return

    const userMessage = input.trim()
    setInput('')
    addMessage('user', userMessage)
    setIsGenerating(true)
    setError(null)
    toolCallBufferRef.current = []
    setProgress({ operation: isModifyMode ? 'Modifying schematic...' : 'Generating schematic...', count: 0, total: 0 })

    try {
      if (isModifyMode) {
        // Build context from X6 graph (domain may be empty for drag-and-drop / AI-generated nodes)
        const graphContext = buildContextFromGraph()
        const context = graphContext.components.length > 0
          ? graphContext
          : netlistManager.serialize()
        // Start new components to the right of existing ones
        const graph = getGraph()
        const existingCount = graph ? graph.getNodes().length : 0
        startXRef.current = 300 + existingCount * 200
        await window.electron?.ipcRenderer.invoke('ai:modify', userMessage, context)
      } else {
        startXRef.current = 300
        await window.electron?.ipcRenderer.invoke('ai:generate', userMessage)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process request')
      setIsGenerating(false)
      setProgress(null)
    }
  }

  const handleStop = async () => {
    await window.electron?.ipcRenderer.invoke('ai:abort')
    setIsGenerating(false)
    setProgress(null)
    toolCallBufferRef.current = []
    streamingTextRef.current = ''
    setStreamingText('')
  }

  const handleClear = () => {
    setMessages([])
    setError(null)
    streamingTextRef.current = ''
    setStreamingText('')
  }

  const handleAnalyze = async () => {
    if (isGenerating || isAnalyzing || nodeCount === 0) return
    setIsAnalyzing(true)
    setError(null)
    try {
      const graphContext = buildContextFromGraph()
      const netlist = graphContext.components.length > 0 ? graphContext : netlistManager.serialize()
      const report = await window.electronAPI.ai.analyze(netlist) as AnalysisReport
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'analysis', report, timestamp: Date.now() }
      ])
    } catch (err: any) {
      setError(err.message || '分析失败')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-bg-l1)',
      borderLeft: '1px solid var(--color-border)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid var(--color-border)',
        fontWeight: 500,
        fontSize: 'var(--font-size-lg)'
      }}>
        <span>AI Assistant</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            type="text" size="small"
            icon={isAnalyzing ? <LoadingOutlined /> : <ThunderboltOutlined />}
            disabled={nodeCount === 0 || isGenerating || isAnalyzing}
            onClick={handleAnalyze}
          >
            电路分析
          </Button>
          <Button type="text" size="small" icon={<ClearOutlined />}
            onClick={handleClear} disabled={isGenerating || messages.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        {messages.length === 0 && !isGenerating && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            textAlign: 'center'
          }}>
            <div>
              <p style={{ marginBottom: 8 }}>AI Schematic Assistant</p>
              <p style={{ fontSize: 'var(--font-size-xs)' }}>
                {isModifyMode
                  ? 'Describe modifications to your circuit'
                  : 'Describe your circuit requirements to generate schematics'
                }
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{
            padding: 12,
            borderRadius: 8,
            background: msg.role === 'user' ? 'var(--color-primary-bg)' : 'var(--color-bg-l2)',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            border: msg.role === 'analysis' ? '1px solid #d9d9d9' : 'none'
          }}>
            {msg.role === 'analysis' ? (
              <AnalysisResultBubble report={msg.report} />
            ) : (
              <div style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {streamingText && (
          <div style={{
            padding: 12, borderRadius: 8,
            background: 'var(--color-bg-l2)',
            alignSelf: 'flex-start', maxWidth: '80%'
          }}>
            <div style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap' }}>
              {streamingText}
            </div>
          </div>
        )}

        {isGenerating && progress && (
          <div style={{
            padding: 12, borderRadius: 8,
            background: 'var(--color-bg-l2)',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <Spin size="small" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>{progress.operation}</div>
              {progress.count > 0 && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  {progress.count} components added
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <Alert message="Error" description={error} type="error" closable
            onClose={() => setError(null)}
            action={<Button size="small" onClick={handleSend}>Retry</Button>}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--color-border)'
      }}>
        {isModifyMode && (
          <div style={{ marginBottom: 4 }}>
            <Tag color="blue" style={{ fontSize: 'var(--font-size-xs)' }}>Modify mode</Tag>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.TextArea
            placeholder={isModifyMode ? 'Describe modifications...' : 'Describe your circuit...'}
            autoSize={{ minRows: 1, maxRows: 4 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isGenerating}
            style={{ flex: 1 }}
          />
          {isGenerating ? (
            <Button type="default" icon={<StopOutlined />} onClick={handleStop} danger />
          ) : (
            <Button type="primary" icon={<SendOutlined />}
              onClick={handleSend} disabled={!input.trim()}
            />
          )}
        </div>
      </div>
    </div>
  )
}
