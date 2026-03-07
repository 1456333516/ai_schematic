import { Input, Button } from 'antd'
import { SendOutlined, ClearOutlined, ThunderboltOutlined } from '@ant-design/icons'

export function AIChatPanel() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-bg-l1)',
      borderLeft: '1px solid var(--color-border)'
    }}>
      {/* Header */}
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
          <Button type="text" size="small" icon={<ThunderboltOutlined />} disabled>
            AI Analysis
          </Button>
          <Button type="text" size="small" icon={<ClearOutlined />} disabled>
            Clear
          </Button>
        </div>
      </div>

      {/* Conversation area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
        padding: 24
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 8 }}>AI Schematic Assistant</p>
          <p style={{ fontSize: 'var(--font-size-xs)' }}>
            Describe your circuit requirements to generate schematics
          </p>
        </div>
      </div>

      {/* Input area */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        gap: 8
      }}>
        <Input.TextArea
          placeholder="Describe your circuit..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled
          style={{ flex: 1 }}
        />
        <Button type="primary" icon={<SendOutlined />} disabled />
      </div>
    </div>
  )
}
