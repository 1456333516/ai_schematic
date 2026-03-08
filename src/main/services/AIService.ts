import { ipcMain, safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { ClaudeProvider, type ToolCall, type NetlistContext } from './ClaudeProvider'

const API_KEY_PATH = path.join(app.getPath('userData'), 'api-key.enc')
const API_ENDPOINT_PATH = path.join(app.getPath('userData'), 'api-endpoint.txt')

export class AIService {
  private provider: ClaudeProvider | null = null
  private apiEndpoint: string = 'https://api.anthropic.com'
  private currentAbortController: AbortController | null = null

  constructor() {
    this.loadApiEndpoint()  // 先加载端点
    this.loadApiKey()       // 再加载 API key 并创建 provider
    this.setupIpcHandlers()
  }

  private loadApiKey(): void {
    try {
      console.log('[AIService] Loading API key from:', API_KEY_PATH)
      console.log('[AIService] File exists:', fs.existsSync(API_KEY_PATH))
      if (fs.existsSync(API_KEY_PATH)) {
        const encrypted = fs.readFileSync(API_KEY_PATH)
        const apiKey = safeStorage.decryptString(encrypted)
        console.log('[AIService] API key loaded successfully, length:', apiKey.length)
        this.provider = new ClaudeProvider(apiKey, this.apiEndpoint)
      } else {
        console.log('[AIService] No API key file found')
      }
    } catch (error) {
      console.error('[AIService] Failed to load API key:', error)
    }
  }

  private loadApiEndpoint(): void {
    try {
      console.log('[AIService] Loading API endpoint from:', API_ENDPOINT_PATH)
      console.log('[AIService] Endpoint file exists:', fs.existsSync(API_ENDPOINT_PATH))
      if (fs.existsSync(API_ENDPOINT_PATH)) {
        const endpoint = fs.readFileSync(API_ENDPOINT_PATH, 'utf-8').trim()
        if (endpoint) {
          this.apiEndpoint = endpoint
          console.log('[AIService] API endpoint loaded:', this.apiEndpoint)
        } else {
          console.log('[AIService] Endpoint file is empty, using default')
        }
      } else {
        console.log('[AIService] No endpoint file found, using default:', this.apiEndpoint)
      }
    } catch (error) {
      console.error('[AIService] Failed to load API endpoint:', error)
    }
  }

  private saveApiKey(apiKey: string): void {
    try {
      console.log('[AIService] Saving API key to:', API_KEY_PATH)
      const encrypted = safeStorage.encryptString(apiKey)
      fs.writeFileSync(API_KEY_PATH, encrypted)
      console.log('[AIService] API key saved successfully')
      this.provider = new ClaudeProvider(apiKey, this.apiEndpoint)
    } catch (error) {
      console.error('[AIService] Failed to save API key:', error)
      throw error
    }
  }

  private saveApiEndpoint(endpoint: string): void {
    try {
      const normalizedEndpoint = endpoint.trim() || 'https://api.anthropic.com'
      fs.writeFileSync(API_ENDPOINT_PATH, normalizedEndpoint, 'utf-8')
      this.apiEndpoint = normalizedEndpoint

      if (this.provider) {
        const apiKey = this.loadApiKeySync()
        if (apiKey) {
          this.provider = new ClaudeProvider(apiKey, this.apiEndpoint)
        }
      }
    } catch (error) {
      console.error('Failed to save API endpoint:', error)
      throw error
    }
  }

  private loadApiKeySync(): string | null {
    try {
      if (fs.existsSync(API_KEY_PATH)) {
        const encrypted = fs.readFileSync(API_KEY_PATH)
        return safeStorage.decryptString(encrypted)
      }
      return null
    } catch (error) {
      console.error('Failed to load API key:', error)
      return null
    }
  }

  private setupIpcHandlers(): void {
    console.log('[AIService] Setting up IPC handlers...')

    ipcMain.handle('ai:abort', () => {
      if (this.currentAbortController) {
        console.log('[AIService] Aborting current generation')
        this.currentAbortController.abort()
        this.currentAbortController = null
      }
    })

    ipcMain.handle('ai:generate', async (event, prompt: string) => {
      console.log('[AIService] IPC: ai:generate called, prompt:', prompt.substring(0, 50) + '...')
      if (!this.provider) {
        event.sender.send('ai:error', {
          type: 'api-key-missing',
          message: 'API key not configured'
        })
        return
      }

      this.currentAbortController = new AbortController()
      const { signal } = this.currentAbortController

      try {
        let itemCount = 0
        for await (const item of this.provider.generateSchematic(prompt, signal)) {
          itemCount++
          console.log(`[AIService] Item ${itemCount} received from provider`)
          if ('type' in item && item.type === 'text') {
            console.log('[AIService] Sending ai:text event:', item.text)
            event.sender.send('ai:text', item.text)
          } else {
            console.log('[AIService] Sending ai:tool-call event:', (item as ToolCall).name)
            event.sender.send('ai:tool-call', item as ToolCall)
          }
        }
        console.log(`[AIService] Generation complete. Total items: ${itemCount}`)
        event.sender.send('ai:complete')
      } catch (error: any) {
        if (error.name === 'AbortError' || signal.aborted) {
          console.log('[AIService] Generation aborted by user')
          return
        }
        console.error('[AIService] Generation error:', error)
        const errorType = this.getErrorType(error)
        event.sender.send('ai:error', {
          type: errorType,
          message: error.message || 'Unknown error'
        })
      } finally {
        this.currentAbortController = null
      }
    })

    ipcMain.handle('ai:modify', async (event, instruction: string, context: NetlistContext) => {
      if (!this.provider) {
        event.sender.send('ai:error', {
          type: 'api-key-missing',
          message: 'API key not configured'
        })
        return
      }

      this.currentAbortController = new AbortController()
      const { signal } = this.currentAbortController

      try {
        for await (const item of this.provider.modifySchematic(instruction, context, signal)) {
          if ('type' in item && item.type === 'text') {
            event.sender.send('ai:text', item.text)
          } else {
            event.sender.send('ai:tool-call', item as ToolCall)
          }
        }
        event.sender.send('ai:complete')
      } catch (error: any) {
        if (error.name === 'AbortError' || signal.aborted) {
          console.log('[AIService] Modify aborted by user')
          return
        }
        const errorType = this.getErrorType(error)
        event.sender.send('ai:error', {
          type: errorType,
          message: error.message || 'Unknown error'
        })
      } finally {
        this.currentAbortController = null
      }
    })

    ipcMain.handle('settings:save-api-key', async (_event, apiKey: string) => {
      console.log('[AIService] IPC: save-api-key called, key length:', apiKey.length)
      if (!this.validateApiKey(apiKey)) {
        throw new Error('Invalid API key format')
      }
      this.saveApiKey(apiKey)
      return { success: true }
    })

    ipcMain.handle('settings:load-api-key', async () => {
      try {
        console.log('[AIService] IPC: Loading API key from:', API_KEY_PATH)
        console.log('[AIService] IPC: File exists:', fs.existsSync(API_KEY_PATH))

        let apiKey = null
        let apiEndpoint = 'https://api.anthropic.com'

        if (fs.existsSync(API_KEY_PATH)) {
          const encrypted = fs.readFileSync(API_KEY_PATH)
          apiKey = safeStorage.decryptString(encrypted)
          console.log('[AIService] IPC: API key loaded, length:', apiKey.length)
        } else {
          console.log('[AIService] IPC: No API key file found')
        }

        if (fs.existsSync(API_ENDPOINT_PATH)) {
          const endpoint = fs.readFileSync(API_ENDPOINT_PATH, 'utf-8').trim()
          if (endpoint) {
            apiEndpoint = endpoint
          }
          console.log('[AIService] IPC: API endpoint loaded:', apiEndpoint)
        }

        return { apiKey, apiEndpoint }
      } catch (error) {
        console.error('[AIService] IPC: Failed to load settings:', error)
        return { apiKey: null, apiEndpoint: 'https://api.anthropic.com' }
      }
    })

    ipcMain.handle('settings:save-api-endpoint', async (_event, endpoint: string) => {
      console.log('[AIService] IPC: save-api-endpoint called, endpoint:', endpoint)
      this.saveApiEndpoint(endpoint)
      return { success: true }
    })

    ipcMain.handle('ai:analyze', async (_event, netlist: NetlistContext) => {
      if (!this.provider) {
        throw new Error('API key not configured')
      }
      return this.provider.analyzeSchematic(netlist)
    })

    ipcMain.handle('ai:optimize-layout', async (_event, canvasDescription: string) => {
      if (!this.provider) {
        throw new Error('API key not configured')
      }
      try {
        return await this.provider.optimizeLayout(canvasDescription)
      } catch (error: any) {
        console.error('[AIService] Layout optimization error:', error)
        return [] // fail gracefully — keep initial layout
      }
    })

    ipcMain.handle('settings:test-connection', async (_event, apiKey: string) => {
      if (!apiKey || !this.validateApiKey(apiKey)) {
        throw new Error('Invalid API key format')
      }

      try {
        const testProvider = new ClaudeProvider(apiKey, this.apiEndpoint)
        await testProvider.testConnection()
        return { success: true }
      } catch (error: any) {
        console.error('Test connection error:', error)

        if (error.status === 401) {
          throw new Error('Invalid API key')
        }
        if (error.status === 403) {
          throw new Error(error.message || 'Access forbidden (403) - request may be blocked by relay')
        }
        if (error.status === 429) {
          throw new Error('Rate limit exceeded')
        }
        if (error.status === 400) {
          throw new Error('Bad request - check API endpoint')
        }
        if (error.status === 404) {
          throw new Error('API endpoint not found - check endpoint URL')
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          throw new Error('Connection timeout')
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to API endpoint')
        }

        // 返回原始错误信息
        const errorMessage = error.message || 'Connection test failed'
        throw new Error(errorMessage)
      }
    })

    console.log('[AIService] IPC handlers setup complete')
  }

  private validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-')
  }

  private getErrorType(error: any): string {
    if (error.status === 401 || error.status === 403) {
      return 'api-key-invalid'
    }
    if (error.status === 429) {
      return 'rate-limit'
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return 'timeout'
    }
    return 'unknown'
  }
}

