import { useCanvasStore } from '@renderer/stores/useCanvasStore'

export function StatusBar() {
  const { cursorX, cursorY, zoom, gridVisible, nodeCount } = useCanvasStore()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '100%',
      padding: '0 12px',
      gap: 16,
      background: 'var(--color-bg-l1)',
      borderTop: '1px solid var(--color-border)',
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-secondary)',
      userSelect: 'none'
    }}>
      <span>X: {cursorX.toFixed(0)}</span>
      <span>Y: {cursorY.toFixed(0)}</span>
      <span>{(zoom * 100).toFixed(0)}%</span>
      <span>Grid: {gridVisible ? 'ON' : 'OFF'}</span>
      {nodeCount > 200 && (
        <span style={{ color: 'var(--color-warning)' }}>⚠ {nodeCount} components</span>
      )}
      <span style={{ marginLeft: 'auto', color: '#999' }}>● Offline</span>
    </div>
  )
}
