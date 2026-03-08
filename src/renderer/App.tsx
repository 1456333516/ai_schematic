import { ConfigProvider, theme } from 'antd'
import { AppLayout } from './components/layout/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DomainProvider } from './contexts/DomainContext'

export default function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677FF',
            borderRadius: 4,
            fontSize: 13
          },
          algorithm: theme.defaultAlgorithm
        }}
      >
        <DomainProvider>
          <AppLayout />
        </DomainProvider>
      </ConfigProvider>
    </ErrorBoundary>
  )
}
