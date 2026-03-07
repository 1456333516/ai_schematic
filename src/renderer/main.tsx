import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { logger } from '@shared/utils/logger'

logger.info('Renderer', 'Bootstrapping React app...')

const root = document.getElementById('root')
logger.debug('Renderer', 'Root element', { found: !!root, id: root?.id })

ReactDOM.createRoot(root!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

logger.info('Renderer', 'React render() called')
