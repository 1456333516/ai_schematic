import { useState, useMemo } from 'react'
import { Input, Collapse } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { Dnd } from '@antv/x6-plugin-dnd'
import { getGraph } from '../canvas/SchematicCanvas'
import { useCanvasStore } from '@renderer/stores/useCanvasStore'
import { useAppStore } from '@renderer/stores/useAppStore'
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
      { id: 'capacitor', name: '电容', nameEn: 'Capacitor', category: '无源器件', shape: 'schematic-capacitor', refDesPrefix: 'C' },
      { id: 'cap-elec', name: '电解电容', nameEn: 'Electrolytic Cap', category: '无源器件', shape: 'schematic-ic', refDesPrefix: 'C', pinCount: 2 },
      { id: 'inductor', name: '电感', nameEn: 'Inductor', category: '无源器件', shape: 'schematic-inductor', refDesPrefix: 'L' },
      { id: 'ferrite', name: '磁珠', nameEn: 'Ferrite Bead', category: '无源器件', shape: 'schematic-inductor', refDesPrefix: 'FB' },
      { id: 'fuse', name: '保险丝', nameEn: 'Fuse', category: '无源器件', shape: 'schematic-fuse', refDesPrefix: 'F' }
    ]
  },
  {
    category: '二极管',
    items: [
      { id: 'diode', name: '二极管', nameEn: 'Diode', category: '二极管', shape: 'schematic-diode', refDesPrefix: 'D' },
      { id: 'led', name: 'LED', nameEn: 'LED', category: '二极管', shape: 'schematic-led', refDesPrefix: 'LED' },
      { id: 'zener', name: '稳压管', nameEn: 'Zener', category: '二极管', shape: 'schematic-zener', refDesPrefix: 'D' },
      { id: 'schottky', name: '肖特基二极管', nameEn: 'Schottky', category: '二极管', shape: 'schematic-schottky', refDesPrefix: 'D' }
    ]
  },
  {
    category: '三极管',
    items: [
      { id: 'npn', name: 'NPN三极管', nameEn: 'NPN BJT', category: '三极管', shape: 'schematic-npn', refDesPrefix: 'Q' },
      { id: 'pnp', name: 'PNP三极管', nameEn: 'PNP BJT', category: '三极管', shape: 'schematic-pnp', refDesPrefix: 'Q' }
    ]
  },
  {
    category: 'MOS管',
    items: [
      { id: 'nmos', name: 'N-MOS', nameEn: 'N-MOSFET', category: 'MOS管', shape: 'schematic-nmos', refDesPrefix: 'M' },
      { id: 'pmos', name: 'P-MOS', nameEn: 'P-MOSFET', category: 'MOS管', shape: 'schematic-pmos', refDesPrefix: 'M' }
    ]
  },
  {
    category: '运算放大器',
    items: [
      { id: 'opamp', name: '单运放', nameEn: 'Op-Amp', category: '运算放大器', shape: 'schematic-opamp', refDesPrefix: 'U' },
      { id: 'opamp-dual', name: '双运放', nameEn: 'Dual Op-Amp', category: '运算放大器', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 8 },
      { id: 'opamp-quad', name: '四运放', nameEn: 'Quad Op-Amp', category: '运算放大器', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 14 }
    ]
  },
  {
    category: '逻辑门',
    items: [
      { id: 'gate-and', name: 'AND门', nameEn: 'AND Gate', category: '逻辑门', shape: 'schematic-gate-and', refDesPrefix: 'U' },
      { id: 'gate-or', name: 'OR门', nameEn: 'OR Gate', category: '逻辑门', shape: 'schematic-gate-or', refDesPrefix: 'U' },
      { id: 'gate-not', name: 'NOT门', nameEn: 'NOT Gate', category: '逻辑门', shape: 'schematic-gate-not', refDesPrefix: 'U' },
      { id: 'gate-nand', name: 'NAND门', nameEn: 'NAND Gate', category: '逻辑门', shape: 'schematic-gate-nand', refDesPrefix: 'U' },
      { id: 'gate-nor', name: 'NOR门', nameEn: 'NOR Gate', category: '逻辑门', shape: 'schematic-gate-nor', refDesPrefix: 'U' }
    ]
  },
  {
    category: '常用IC',
    items: [
      { id: 'ic8', name: '8引脚IC', nameEn: 'IC-8', category: '常用IC', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 8 },
      { id: 'ic16', name: '16引脚IC', nameEn: 'IC-16', category: '常用IC', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 16 },
      { id: 'ic-555', name: '555定时器', nameEn: '555 Timer', category: '常用IC', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 8 },
      { id: 'ic-ldo', name: 'LDO稳压', nameEn: 'LDO', category: '常用IC', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 3 },
      { id: 'ic-dcdc', name: 'DC-DC', nameEn: 'DC-DC', category: '常用IC', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 8 },
      { id: 'mcu32', name: 'MCU-32', nameEn: 'MCU-32', category: '常用IC', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 32 },
      { id: 'mcu48', name: 'MCU-48', nameEn: 'MCU-48', category: '常用IC', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 48 }
    ]
  },
  {
    category: '连接器',
    items: [
      { id: 'conn2p', name: '2P排针', nameEn: '2P Header', category: '连接器', shape: 'schematic-ic', refDesPrefix: 'J', pinCount: 2 },
      { id: 'conn4p', name: '4P排针', nameEn: '4P Header', category: '连接器', shape: 'schematic-ic', refDesPrefix: 'J', pinCount: 4 },
      { id: 'conn6p', name: '6P排针', nameEn: '6P Header', category: '连接器', shape: 'schematic-ic', refDesPrefix: 'J', pinCount: 6 },
      { id: 'usb-c', name: 'USB-TypeC', nameEn: 'USB-TypeC', category: '连接器', shape: 'schematic-ic', refDesPrefix: 'J', pinCount: 6 },
      { id: 'dc-jack', name: 'DC电源座', nameEn: 'DC Jack', category: '连接器', shape: 'schematic-ic', refDesPrefix: 'J', pinCount: 2 }
    ]
  },
  {
    category: '电源符号',
    items: [
      { id: 'vcc', name: 'VCC', nameEn: 'VCC', category: '电源符号', shape: 'schematic-vcc', refDesPrefix: '#PWR' },
      { id: 'gnd', name: 'GND', nameEn: 'GND', category: '电源符号', shape: 'schematic-gnd', refDesPrefix: '#PWR' },
      { id: 'vdd', name: 'VDD', nameEn: 'VDD', category: '电源符号', shape: 'schematic-vcc', refDesPrefix: '#PWR' },
      { id: 'agnd', name: 'AGND', nameEn: 'AGND', category: '电源符号', shape: 'schematic-gnd', refDesPrefix: '#PWR' },
      { id: 'v33', name: '+3.3V', nameEn: '+3.3V', category: '电源符号', shape: 'schematic-vcc', refDesPrefix: '#PWR' },
      { id: 'v5', name: '+5V', nameEn: '+5V', category: '电源符号', shape: 'schematic-vcc', refDesPrefix: '#PWR' },
      { id: 'v12', name: '+12V', nameEn: '+12V', category: '电源符号', shape: 'schematic-vcc', refDesPrefix: '#PWR' }
    ]
  },
  {
    category: '其他',
    items: [
      { id: 'crystal', name: '晶振', nameEn: 'Crystal', category: '其他', shape: 'schematic-crystal', refDesPrefix: 'Y' },
      { id: 'buzzer', name: '蜂鸣器', nameEn: 'Buzzer', category: '其他', shape: 'schematic-buzzer', refDesPrefix: 'BZ' },
      { id: 'relay', name: '继电器', nameEn: 'Relay', category: '其他', shape: 'schematic-ic', refDesPrefix: 'K', pinCount: 5 },
      { id: 'optocoupler', name: '光耦', nameEn: 'Optocoupler', category: '其他', shape: 'schematic-ic', refDesPrefix: 'U', pinCount: 4 }
    ]
  }
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
    } else if (item.shape === 'schematic-vcc' || item.shape === 'schematic-gnd') {
      nodeConfig = {
        shape: item.shape,
        attrs: { label: { text: item.name } },
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
    } else if (item.shape === 'schematic-vcc' || item.shape === 'schematic-gnd') {
      nodeConfig = {
        shape: item.shape,
        x: (center?.x ?? 2000) - 15,
        y: (center?.y ?? 1500) - 10,
        attrs: { label: { text: item.name } },
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
      useAppStore.getState().markDirty()
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
