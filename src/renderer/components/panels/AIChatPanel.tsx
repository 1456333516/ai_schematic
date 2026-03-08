import { useState, useEffect, useRef } from 'react'
import { Input, Button, Spin, Alert } from 'antd'
import {
  SendOutlined,
  ClearOutlined,
  StopOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ProgressInfo {
  operation: string
  count: number
  total: number
}

export function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Ref to synchronously track streaming text, avoiding stale closure in IPC callbacks
  const streamingTextRef = useRef('')

  useEffect(() => {
    console.log('[AIChatPanel] Registering IPC listeners')

    // NOTE: preload strips the IPC event before calling callbacks,
    // so handlers receive (data) not (_event, data)
    const handleToolCall = (toolCall: any) => {
      console.log('[AIChatPanel] ai:tool-call received:', toolCall)
      if (!toolCall || !toolCall.input) {
        console.warn('[AIChatPanel] Invalid tool call data:', toolCall)
        return
      }
      setProgress((prev) => ({
        operation: `Adding ${toolCall.input.id || 'component'}...`,
        count: prev ? prev.count + 1 : 1,
        total: prev ? prev.total : 10
      }))
    }

    const handleText = (text: any) => {
      console.log('[AIChatPanel] ai:text received, type:', typeof text, 'value:', text)
      if (text !== undefined && text !== null) {
        streamingTextRef.current += String(text)
        setStreamingText(streamingTextRef.current)
      }
    }

    const handleComplete = () => {
      console.log('[AIChatPanel] ai:complete received, finalText length:', streamingTextRef.current.length)
      const finalText = streamingTextRef.current
      if (finalText) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'assistant', content: finalText, timestamp: Date.now() }
        ])
        streamingTextRef.current = ''
        setStreamingText('')
      }
      setIsGenerating(false)
      setProgress(null)
    }

    const handleError = (errorData: any) => {
      console.log('[AIChatPanel] ai:error received:', errorData)
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
      console.log('[AIChatPanel] Unregistering IPC listeners')
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
      {
        id: Date.now().toString(),
        role,
        content,
        timestamp: Date.now()
      }
    ])
  }

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return

    const userMessage = input.trim()
    setInput('')
    addMessage('user', userMessage)
    setIsGenerating(true)
    setError(null)
    setProgress({ operation: 'Starting generation...', count: 0, total: 0 })

    try {
      await window.electron?.ipcRenderer.invoke('ai:generate', userMessage)
    } catch (err: any) {
      setError(err.message || 'Failed to generate schematic')
      setIsGenerating(false)
      setProgress(null)
    }
  }

  const handleStop = async () => {
    await window.electron?.ipcRenderer.invoke('ai:abort')
    setIsGenerating(false)
    setProgress(null)
    streamingTextRef.current = ''
    setStreamingText('')
  }

  const handleClear = () => {
    setMessages([])
    setError(null)
    streamingTextRef.current = ''
    setStreamingText('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-bg-l1)',
        borderLeft: '1px solid var(--color-border)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--color-border)',
          fontWeight: 500,
          fontSize: 'var(--font-size-lg)'
        }}
      >
        <span>AI Assistant</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            type="text"
            size="small"
            icon={<ThunderboltOutlined />}
            disabled={isGenerating}
          >
            AI Analysis
          </Button>
          <Button
            type="text"
            size="small"
            icon={<ClearOutlined />}
            onClick={handleClear}
            disabled={isGenerating || messages.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        {messages.length === 0 && !isGenerating && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              textAlign: 'center'
            }}
          >
            <div>
              <p style={{ marginBottom: 8 }}>AI Schematic Assistant</p>
              <p style={{ fontSize: 'var(--font-size-xs)' }}>
                Describe your circuit requirements to generate schematics
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: 12,
              borderRadius: 8,
              background:
                msg.role === 'user' ? 'var(--color-primary-bg)' : 'var(--color-bg-l2)',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%'
            }}
          >
            <div style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap' }}>
              {msg.content}
            </div>
          </div>
        ))}

        {streamingText && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'var(--color-bg-l2)',
              alignSelf: 'flex-start',
              maxWidth: '80%'
            }}
          >
            <div style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap' }}>
              {streamingText}
            </div>
          </div>
        )}

        {isGenerating && progress && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'var(--color-bg-l2)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <Spin size="small" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>{progress.operation}</div>
              {progress.total > 0 && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  Added {progress.count} of {progress.total} components
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
            action={
              <Button size="small" onClick={handleSend}>
                Retry
              </Button>
            }
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          gap: 8
        }}
      >
        <Input.TextArea
          placeholder="Describe your circuit..."
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
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!input.trim()}
          />
        )}
      </div>
    </div>
  )
}
