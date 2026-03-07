import { useCanvasStore } from '@renderer/stores/useCanvasStore'

export function PropertyPanel() {
  const { selectedNodeIds } = useCanvasStore()

  if (selectedNodeIds.length === 0) return null

  return (
    <div style={{
      padding: '8px 12px',
      background: 'var(--color-bg-l1)',
      borderTop: '1px solid var(--color-border)',
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-text-secondary)'
    }}>
      {selectedNodeIds.length === 1
        ? `Selected: ${selectedNodeIds[0]}`
        : `${selectedNodeIds.length} components selected`}
    </div>
  )
}
