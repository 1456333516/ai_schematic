import { useState, useMemo } from 'react'
import { Input, Collapse } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { Dnd } from '@antv/x6-plugin-dnd'
import { getGraph } from '../canvas/SchematicCanvas'
import { useCanvasStore } from '@renderer/stores/useCanvasStore'
import { createICNode } from '../shapes/registerShapes'
import { logger } from '@shared/utils/logger'

interface LibraryItem {
  id: string
  name: string
  nameEn: string
  category: string
  shape: string
  refDesPrefix: string
  pinCount?: number
}

const LIBRARY_DATA: { category: string; items: LibraryItem[] }[] = [
  {
    category: '无源器件',
    items: [
      { id: 'resistor', name: '电阻', nameEn: 'Resistor', category: '无源器件', shape: 'schematic-resistor', refDesPrefix: 'R' },
      { id: 'capacitor', name: '电容', nameEn: 'Capacitor', category: '无源器件', shape: 'schematic-capacitor', refDesPrefix: 'C' }
    ]
  },
  {
    category: '二极管',
    items: [
      { id: 'diode', name: '二极管', nameEn: 'Diode', category: '二极管', shape: 'schematic-diode', refDesPrefix: 'D' },
      { id: 'led', name: 'LED', nameEn: 'LED', category: '二极管', shape: 'schematic-led', refDesPrefix: 'LED' }
    ]
  },
  { category: '三极管', items: [] },
  { category: 'MOS管', items: [] },
  { category: '运算放大器', items: [] },
  { category: '逻辑门', items: [] },
  {
    category: '常用IC',
    items: [
      { id: 'ic8', name: '8引脚IC', nameEn: 'IC-8', category: '常用IC', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 8 },
      { id: 'ic16', name: '16引脚IC', nameEn: 'IC-16', category: '常用IC', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 16 }
    ]
  },
  { category: '连接器', items: [] },
  {
    category: '电源符号',
    items: [
      { id: 'vcc', name: 'VCC', nameEn: 'VCC', category: '电源符号', shape: 'schematic-vcc', refDesPrefix: '#PWR' },
      { id: 'gnd', name: 'GND', nameEn: 'GND', category: '电源符号', shape: 'schematic-gnd', refDesPrefix: '#PWR' }
    ]
  },
  { category: '其他', items: [] }
]

let dndInstance: Dnd | null = null

function getDnd(): Dnd | null {
  const graph = getGraph()
  if (!graph) return null
  if (!dndInstance) {
    dndInstance = new Dnd({ target: graph, dndContainer: undefined })
  }
  return dndInstance
}

export function ComponentLibrary() {
  const [search, setSearch] = useState('')
  const getNextRefDes = useCanvasStore((s) => s.getNextRefDes)

  logger.debug('ComponentLibrary', 'Render')

  const filtered = useMemo(() => {
    if (!search.trim()) return LIBRARY_DATA
    const q = search.toLowerCase()
    return LIBRARY_DATA.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => item.name.toLowerCase().includes(q) || item.nameEn.toLowerCase().includes(q)
      )
    })).filter((cat) => cat.items.length > 0)
  }, [search])

  const startDrag = (item: LibraryItem, e: React.MouseEvent) => {
    logger.debug('ComponentLibrary', 'startDrag', { id: item.id, shape: item.shape })
    const graph = getGraph()
    const dnd = getDnd()
    if (!graph || !dnd) {
      logger.warn('ComponentLibrary', 'startDrag: no graph or dnd', { graph: !!graph, dnd: !!dnd })
      return
    }

    let nodeConfig: Record<string, unknown>
    if (item.shape === 'schematic-ic') {
      const ic = createICNode(item.pinCount ?? 8)
      nodeConfig = {
        ...ic,
        data: { label: item.name, refDesPrefix: item.refDesPrefix, category: item.category }
      }
    } else {
      nodeConfig = {
        shape: item.shape,
        data: { label: item.name, refDesPrefix: item.refDesPrefix, category: item.category }
      }
    }

    try {
      const node = graph.createNode(nodeConfig)
      dnd.start(node, e.nativeEvent)
    } catch (err) {
      logger.warn('DnD', 'Failed to start drag', err)
    }
  }

  const addToCenter = (item: LibraryItem) => {
    const graph = getGraph()
    if (!graph) return

    const refDes = getNextRefDes(item.refDesPrefix)
    const center = graph.getContentArea().center

    let nodeConfig: Record<string, unknown>
    if (item.shape === 'schematic-ic') {
      const ic = createICNode(item.pinCount ?? 8)
      nodeConfig = {
        ...ic,
        x: (center?.x ?? 2000) - 60,
        y: (center?.y ?? 1500) - ic.height / 2,
        attrs: { refDes: { text: refDes }, valueLabel: { text: item.name } },
        data: { label: item.name, refDesPrefix: item.refDesPrefix, refDes, category: item.category }
      }
    } else {
      nodeConfig = {
        shape: item.shape,
        x: (center?.x ?? 2000) - 40,
        y: (center?.y ?? 1500) - 20,
        attrs: { refDes: { text: refDes } },
        data: { label: item.name, refDesPrefix: item.refDesPrefix, refDes, category: item.category }
      }
    }

    try {
      graph.addNode(nodeConfig)
    } catch (err) {
      logger.warn('DnD', 'Failed to add node', err)
    }
  }

  const collapseItems = filtered
    .filter((cat) => cat.items.length > 0)
    .map((cat) => ({
      key: cat.category,
      label: <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{cat.category}</span>,
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {cat.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                height: 36,
                cursor: 'pointer',
                borderRadius: 4,
                fontSize: 'var(--font-size-sm)',
                transition: 'background 100ms'
              }}
              onMouseDown={(e) => startDrag(item, e)}
              onDoubleClick={() => addToCenter(item)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f0f5ff' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
            >
              <span style={{ flex: 1 }}>{item.name}</span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                {item.nameEn}
              </span>
            </div>
          ))}
        </div>
      )
    }))

  const emptyCategories = LIBRARY_DATA.filter((cat) => cat.items.length === 0)
  const emptyItems = emptyCategories.map((cat) => ({
    key: cat.category,
    label: <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: '#999' }}>{cat.category}</span>,
    children: (
      <div style={{ padding: '8px', color: '#999', fontSize: 'var(--font-size-xs)', textAlign: 'center' as const }}>
        Coming soon
      </div>
    )
  }))

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-bg-l1)',
      borderRight: '1px solid var(--color-border)'
    }}>
      <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>
        <Input
          placeholder="Search components..."
          prefix={<SearchOutlined />}
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 4px' }}>
        <Collapse
          ghost
          size="small"
          defaultActiveKey={LIBRARY_DATA.filter((c) => c.items.length > 0).map((c) => c.category)}
          items={[...collapseItems, ...emptyItems]}
        />
      </div>
    </div>
  )
}
