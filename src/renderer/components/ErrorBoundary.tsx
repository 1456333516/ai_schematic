import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error.message)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
    console.error('[ErrorBoundary] Full error:', error)
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 32,
          color: '#ff4d4f',
          fontFamily: 'monospace',
          fontSize: 13
        }}>
          <h3 style={{ marginBottom: 8 }}>Render Error</h3>
          <pre style={{
            maxWidth: '80%',
            overflow: 'auto',
            padding: 16,
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
