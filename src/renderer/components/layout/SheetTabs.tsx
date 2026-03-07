export function SheetTabs() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '100%',
      padding: '0 8px',
      gap: 4,
      background: 'var(--color-bg-l0)',
      borderTop: '1px solid var(--color-border)',
      fontSize: 'var(--font-size-xs)'
    }}>
      <span style={{
        padding: '2px 12px',
        background: 'var(--color-bg-l1)',
        border: '1px solid var(--color-border)',
        borderBottom: 'none',
        borderRadius: '4px 4px 0 0',
        color: 'var(--color-primary)',
        fontWeight: 500
      }}>
        Sheet 1
      </span>
      <span style={{
        padding: '2px 8px',
        color: 'var(--color-text-secondary)',
        cursor: 'not-allowed',
        opacity: 0.5
      }}>
        +
      </span>
    </div>
  )
}
