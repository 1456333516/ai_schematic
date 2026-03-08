import { useState, useEffect } from 'react'
import { Modal, Input, Button, message, Space } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined, CheckCircleOutlined } from '@ant-design/icons'

interface SettingsDialogProps {
  visible: boolean
  onClose: () => void
}

export function SettingsDialog({ visible, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [apiEndpoint, setApiEndpoint] = useState('https://api.anthropic.com')

  useEffect(() => {
    if (visible) {
      loadApiKey()
    }
  }, [visible])

  const loadApiKey = async () => {
    try {
      console.log('[SettingsDialog] Loading API key...')
      const result = await window.electron?.ipcRenderer.invoke('settings:load-api-key')
      console.log('[SettingsDialog] Load result:', result)
      if (result?.apiKey) {
        console.log('[SettingsDialog] Setting API key, length:', result.apiKey.length)
        setApiKey(result.apiKey)
      } else {
        console.log('[SettingsDialog] No API key in result')
      }
      if (result?.apiEndpoint) {
        console.log('[SettingsDialog] Setting API endpoint:', result.apiEndpoint)
        setApiEndpoint(result.apiEndpoint)
      }
    } catch (error) {
      console.error('[SettingsDialog] Failed to load API key:', error)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      message.error('Please enter an API key')
      return
    }

    if (!apiKey.startsWith('sk-')) {
      message.error('Invalid API key format. Must start with "sk-"')
      return
    }

    if (apiEndpoint.trim() && !apiEndpoint.startsWith('http')) {
      message.error('API endpoint must start with http:// or https://')
      return
    }

    setSaving(true)
    try {
      console.log('[SettingsDialog] Saving API key, length:', apiKey.length)
      console.log('[SettingsDialog] Saving API endpoint:', apiEndpoint)
      await window.electron?.ipcRenderer.invoke('settings:save-api-key', apiKey)
      await window.electron?.ipcRenderer.invoke('settings:save-api-endpoint', apiEndpoint)
      console.log('[SettingsDialog] Save successful')
      message.success('Settings saved successfully')
      onClose()
    } catch (error: any) {
      console.error('[SettingsDialog] Save failed:', error)
      message.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      message.error('Please enter an API key')
      return
    }

    if (!apiKey.startsWith('sk-')) {
      message.error('Invalid API key format. Must start with "sk-"')
      return
    }

    setTesting(true)
    try {
      await window.electron?.ipcRenderer.invoke('settings:test-connection', apiKey)
      message.success('Connection successful!')
    } catch (error: any) {
      message.error(error.message || 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal
      title="Settings"
      open={visible}
      onCancel={onClose}
      destroyOnHidden={false}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>
          Save
        </Button>
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <h3 style={{ marginBottom: 8 }}>Claude API Key</h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Enter your Claude API key (supports official API and proxy services)
          </p>
          <Input.Password
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            visibilityToggle={{
              visible: showApiKey,
              onVisibleChange: setShowApiKey
            }}
            iconRender={(visible) =>
              visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
            }
          />
          <Button
            type="link"
            size="small"
            icon={<CheckCircleOutlined />}
            loading={testing}
            onClick={handleTestConnection}
            style={{ marginTop: 8 }}
          >
            Test Connection
          </Button>
        </div>

        <div>
          <h3 style={{ marginBottom: 8 }}>API Endpoint (Optional)</h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Default: https://api.anthropic.com (Change if using a proxy or custom endpoint)
          </p>
          <Input
            placeholder="https://api.anthropic.com"
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
          />
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            Leave empty to use default endpoint
          </p>
        </div>

        <div>
          <h3 style={{ marginBottom: 8 }}>Grid Settings</h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Grid size and snap settings (Coming soon)
          </p>
        </div>

        <div>
          <h3 style={{ marginBottom: 8 }}>Auto-save</h3>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Auto-save interval settings (Coming soon)
          </p>
        </div>
      </Space>
    </Modal>
  )
}
