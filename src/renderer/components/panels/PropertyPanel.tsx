import { useEffect, useState, useCallback, useRef } from 'react'
import { Form, Input } from 'antd'
import { z } from 'zod'
import { useCanvasStore } from '@renderer/stores/useCanvasStore'
import { useDomain } from '@renderer/contexts/DomainContext'
import { UpdatePropertyCommand } from '@renderer/commands/implementations'
import { getGraph } from '../canvas/SchematicCanvas'

const required = z.string().min(1)
const EDITABLE_KEYS = ['refDes', 'label', 'package', 'tolerance', 'rating', 'notes'] as const

interface NodeFields {
  refDes: string
  label: string
  package: string
  tolerance: string
  rating: string
  notes: string
  x: number
  y: number
  rotation: number
}

function readNodeFields(nodeId: string): NodeFields | null {
  const graph = getGraph()
  if (!graph) return null
  const node = graph.getCellById(nodeId)
  if (!node || !node.isNode()) return null

  const data = (node.getData() as Record<string, any>) ?? {}
  const pos = node.position()
  const ang = (node as any).angle?.() ?? 0

  return {
    refDes: data.refDes ?? data.properties?.refDes ?? '',
    label: data.label ?? data.properties?.label ?? '',
    package: data.package ?? data.properties?.package ?? '',
    tolerance: data.tolerance ?? data.properties?.tolerance ?? '',
    rating: data.rating ?? data.properties?.rating ?? '',
    notes: data.notes ?? data.properties?.notes ?? '',
    x: Math.round(pos.x),
    y: Math.round(pos.y),
    rotation: Math.round(ang)
  }
}

export function PropertyPanel() {
  const { selectedNodeIds } = useCanvasStore()
  const { commandBus, eventBus } = useDomain()
  const [form] = Form.useForm<NodeFields>()
  const [pos, setPos] = useState({ x: 0, y: 0, rotation: 0 })
  const lastDispatchedRef = useRef<Record<string, string>>({})

  const selectedId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null

  // Core commit: dedup → direct X6 update → domain command
  const commitField = useCallback((nodeId: string, key: string, raw: string) => {
    if (lastDispatchedRef.current[key] === raw) return
    if (key === 'refDes' && required.safeParse(raw).success === false) return
    if (key === 'label' && required.safeParse(raw).success === false) return

    const value = raw === '' && !['refDes', 'label'].includes(key) ? undefined : raw
    lastDispatchedRef.current[key] = raw

    const graph = getGraph()
    if (graph) {
      const node = graph.getCellById(nodeId)
      if (node?.isNode()) {
        const data = node.getData() || {}
        node.setData({ ...data, [key]: value }, { silent: true })
        if (key === 'refDes') {
          try { node.attr('refDes/text', value ?? '') } catch { /* non-fatal */ }
        } else if (key === 'label') {
          try { node.attr('valueLabel/text', value ?? '') } catch { /* non-fatal */ }
        }
      }
    }

    commandBus.execute(new UpdatePropertyCommand(nodeId, key, value))
  }, [commandBus])

  // Flush all uncommitted form values for a given node (called on deselect/cleanup)
  const flushPending = useCallback((nodeId: string) => {
    const values = form.getFieldsValue() as Record<string, string>
    for (const key of EDITABLE_KEYS) {
      commitField(nodeId, key, String(values[key] ?? ''))
    }
  }, [form, commitField])

  const refresh = useCallback((nodeId: string) => {
    const fields = readNodeFields(nodeId)
    if (!fields) return
    const { x, y, rotation, ...formFields } = fields
    form.setFieldsValue(formFields)
    lastDispatchedRef.current = { ...formFields } as Record<string, string>
    setPos({ x, y, rotation })
  }, [form])

  // Re-populate form when selection changes; flush pending on deselect
  useEffect(() => {
    if (!selectedId) {
      form.resetFields()
      lastDispatchedRef.current = {}
      return
    }
    refresh(selectedId)
    // Cleanup: fires when selectedId changes or component unmounts.
    // Captures selectedId from closure so we flush the OLD node's values.
    return () => { flushPending(selectedId) }
  }, [selectedId, refresh, flushPending])

  // Subscribe to position/angle changes on selected node
  useEffect(() => {
    if (!selectedId) return
    const graph = getGraph()
    if (!graph) return
    const node = graph.getCellById(selectedId)
    if (!node) return

    const onPos = () => {
      const p = node.position()
      setPos((prev) => ({ ...prev, x: Math.round(p.x), y: Math.round(p.y) }))
    }
    const onAngle = () => {
      const a = (node as any).angle?.() ?? 0
      setPos((prev) => ({ ...prev, rotation: Math.round(a) }))
    }
    node.on('change:position', onPos)
    node.on('change:angle', onAngle)
    return () => {
      node.off('change:position', onPos)
      node.off('change:angle', onAngle)
    }
  }, [selectedId])

  // Refresh form on domain property updates (undo/redo)
  useEffect(() => {
    if (!selectedId) return
    return eventBus.subscribe('property:updated', (event) => {
      if (event.data.id !== selectedId) return
      const keyMap: Record<string, keyof NodeFields> = {
        refDes: 'refDes', label: 'label', package: 'package',
        tolerance: 'tolerance', rating: 'rating', notes: 'notes'
      }
      const field = keyMap[event.data.key]
      if (field) {
        const value = event.data.value ?? ''
        lastDispatchedRef.current[event.data.key] = value
        form.setFieldValue(field, value)
      }
    })
  }, [selectedId, eventBus, form])

  const dispatch = useCallback((key: string, raw: string) => {
    if (!selectedId) return
    commitField(selectedId, key, raw)
  }, [selectedId, commitField])

  const makeBlurHandler = (key: string) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    dispatch(key, e.target.value)
  }

  const makeKeyHandler = (key: string) => (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      dispatch(key, (e.target as HTMLInputElement | HTMLTextAreaElement).value)
    }
  }

  if (selectedNodeIds.length === 0) return null

  if (selectedNodeIds.length > 1) {
    return (
      <div style={{ padding: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        {selectedNodeIds.length} components selected
      </div>
    )
  }

  return (
    <div style={{
      padding: '8px 12px',
      background: 'var(--color-bg-l1)',
      borderTop: '1px solid var(--color-border)',
      overflowY: 'auto',
      maxHeight: 360
    }}>
      <Form form={form} layout="horizontal" size="small"
        labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}
        style={{ fontSize: 'var(--font-size-sm)' }}
      >
        <Form.Item name="refDes" label="RefDes" rules={[{ required: true, message: 'Required' }]}>
          <Input onBlur={makeBlurHandler('refDes')} onKeyDown={makeKeyHandler('refDes')} />
        </Form.Item>

        <Form.Item name="label" label="Value" rules={[{ required: true, message: 'Required' }]}>
          <Input onBlur={makeBlurHandler('label')} onKeyDown={makeKeyHandler('label')} />
        </Form.Item>

        <Form.Item name="package" label="Package">
          <Input onBlur={makeBlurHandler('package')} onKeyDown={makeKeyHandler('package')} />
        </Form.Item>

        <Form.Item name="tolerance" label="Tolerance">
          <Input onBlur={makeBlurHandler('tolerance')} onKeyDown={makeKeyHandler('tolerance')} />
        </Form.Item>

        <Form.Item name="rating" label="Rating">
          <Input onBlur={makeBlurHandler('rating')} onKeyDown={makeKeyHandler('rating')} />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={4}
            onBlur={makeBlurHandler('notes')}
            onKeyDown={makeKeyHandler('notes')}
          />
        </Form.Item>

        <Form.Item label="Position">
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            X: {pos.x}, Y: {pos.y}
          </span>
        </Form.Item>

        <Form.Item label="Rotation">
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {pos.rotation}°
          </span>
        </Form.Item>
      </Form>
    </div>
  )
}
