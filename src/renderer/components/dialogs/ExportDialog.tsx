import { useState, useEffect } from 'react'
import { Modal, Radio, Tabs, Table, Button, message } from 'antd'
import { getGraph } from '../canvas/SchematicCanvas'
import { useDomain } from '@renderer/contexts/DomainContext'
import type { BOMRow, NetlistDSL } from '@shared/types/project'

interface Props {
  visible: boolean
  mode: 'png' | 'pdf' | 'bom'
  destPath: string
  onClose: () => void
}

async function renderGraphToPNG(scale: number): Promise<string> {
  const graph = getGraph()
  if (!graph) throw new Error('Canvas not ready')

  const bbox = graph.getContentBBox()
  const padding = 20
  const w = Math.max(1, Math.ceil((bbox.width + padding * 2) * scale))
  const h = Math.max(1, Math.ceil((bbox.height + padding * 2) * scale))

  const svgEl = graph.container?.querySelector('svg')
  if (!svgEl) throw new Error('SVG element not found')

  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('.x6-graph-svg-stage-overlay, [class*="selection"], [class*="snapline"]')
    .forEach((el) => el.remove())
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  clone.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`)

  const svgString = new XMLSerializer().serializeToString(clone)
  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  const img = new Image()
  img.src = svgDataUrl
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej })
  ctx.drawImage(img, 0, 0, w, h)

  return canvas.toDataURL('image/png')
}

function aggregateBOM(netlist: NetlistDSL): BOMRow[] {
  const groups = new Map<string, { items: typeof netlist.components; refDes: string[] }>()
  for (const comp of netlist.components) {
    const key = `${comp.type}|${comp.properties?.label ?? ''}|${comp.properties?.value ?? ''}|${comp.properties?.package ?? ''}`
    if (!groups.has(key)) {
      groups.set(key, { items: [comp], refDes: [comp.id] })
    } else {
      const g = groups.get(key)!
      g.items.push(comp)
      g.refDes.push(comp.id)
    }
  }

  let idx = 1
  const rows: BOMRow[] = []
  for (const [, g] of groups) {
    const first = g.items[0]
    rows.push({
      index: idx++,
      refDes: g.refDes.join(', '),
      name: first.type,
      value: first.properties?.value ?? first.properties?.label ?? '',
      package: first.properties?.package ?? '',
      quantity: g.items.length,
      description: ''
    })
  }
  return rows
}

export function ExportDialog({ visible, mode, destPath, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<string>(mode)
  const [scale, setScale] = useState(2)
  const [landscape, setLandscape] = useState(false)
  const [bomRows, setBomRows] = useState<BOMRow[]>([])
  const [bomLoaded, setBomLoaded] = useState(false)
  const { netlistManager } = useDomain()

  useEffect(() => {
    if (visible) {
      setActiveTab(mode)
      setBomLoaded(false)
    }
  }, [visible, mode])

  const loadBOM = () => {
    if (!bomLoaded) {
      const graph = getGraph()
      const components: NetlistDSL['components'] = graph
        ? graph.getNodes()
            .filter((node) => {
              const shape = node.shape as string
              return shape !== 'schematic-vcc' && shape !== 'schematic-gnd'
            })
            .map((node) => {
              const d = (node.getData() ?? {}) as Record<string, any>
              return {
                id: d.refDes || node.id,
                type: d.category || 'component',
                category: d.category || 'component',
                properties: {
                  label: d.label ?? '',
                  value: d.label ?? '',
                  package: d.package ?? ''
                }
              }
            })
        : netlistManager.serialize().components
      setBomRows(aggregateBOM({ components, connections: [] }))
      setBomLoaded(true)
    }
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    if (key === 'bom') loadBOM()
  }

  useEffect(() => {
    if (visible && mode === 'bom') loadBOM()
  }, [visible, mode])

  const handlePNGExport = async () => {
    try {
      const pngDataUrl = await renderGraphToPNG(scale)
      const result = await window.electronAPI.export.png(pngDataUrl, destPath)
      if (result?.success === false) throw new Error(result.error)
      message.success('导出成功')
      onClose()
    } catch (err: any) {
      message.error(`导出失败: ${err.message}`)
    }
  }

  const handlePDFExport = async () => {
    try {
      const pngDataUrl = await renderGraphToPNG(2)
      const result = await window.electronAPI.export.pdf(pngDataUrl, destPath, landscape)
      if (result?.success === false) throw new Error(result.error)
      message.success('导出成功')
      onClose()
    } catch (err: any) {
      message.error(`导出失败: ${err.message}`)
    }
  }

  const handleBOMExport = async () => {
    try {
      const dlg = await window.electronAPI.system.showSaveDialog({
        defaultPath: 'BOM.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      })
      if (dlg.canceled || !dlg.filePath) return
      const result = await window.electronAPI.export.bom(bomRows, dlg.filePath)
      if (result?.success === false) throw new Error(result.error)
      message.success('BOM 导出成功')
    } catch (err: any) {
      message.error(`BOM 导出失败: ${err.message}`)
    }
  }

  const bomColumns = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 60 },
    { title: '位号', dataIndex: 'refDes', key: 'refDes', width: 120 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 100 },
    { title: '值', dataIndex: 'value', key: 'value', width: 80 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 60 }
  ]

  const tabItems = [
    {
      key: 'png',
      label: 'PNG',
      children: (
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Scale</div>
          <Radio.Group value={scale} onChange={(e) => setScale(e.target.value)}>
            <Radio.Button value={1}>1×</Radio.Button>
            <Radio.Button value={2}>2×</Radio.Button>
            <Radio.Button value={4}>4×</Radio.Button>
          </Radio.Group>
        </div>
      )
    },
    {
      key: 'pdf',
      label: 'PDF',
      children: (
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Orientation (A4)</div>
          <Radio.Group value={landscape} onChange={(e) => setLandscape(e.target.value)}>
            <Radio.Button value={false}>Portrait</Radio.Button>
            <Radio.Button value={true}>Landscape</Radio.Button>
          </Radio.Group>
        </div>
      )
    },
    {
      key: 'bom',
      label: 'BOM',
      children: (
        <div>
          <Table
            dataSource={bomRows}
            columns={bomColumns}
            rowKey="index"
            size="small"
            pagination={false}
            scroll={{ y: 240 }}
            style={{ marginBottom: 12 }}
          />
          <Button type="primary" onClick={handleBOMExport} disabled={bomRows.length === 0}>
            Export BOM (.xlsx)
          </Button>
        </div>
      )
    }
  ]

  const handleOk = async () => {
    if (activeTab === 'png') await handlePNGExport()
    else if (activeTab === 'pdf') await handlePDFExport()
  }

  return (
    <Modal
      title="Export"
      open={visible}
      onOk={activeTab === 'bom' ? undefined : handleOk}
      onCancel={onClose}
      okText="Export"
      footer={activeTab === 'bom' ? null : undefined}
      destroyOnHidden
    >
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
      />
    </Modal>
  )
}
