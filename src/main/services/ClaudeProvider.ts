import Anthropic from '@anthropic-ai/sdk'

export interface ToolCall {
  id: string
  name: string
  input: any
}

export interface NetlistContext {
  components: Array<{
    id: string
    type: string
    category: string
    properties: Record<string, any>
  }>
  connections: Array<{
    from: string
    to: string
    net: string
  }>
}

const TOOL_SCHEMAS: Anthropic.Tool[] = [
  {
    name: 'add_component',
    description: 'Add a component to the schematic',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Component reference designator (e.g., R1, C1, U1)'
        },
        type: {
          type: 'string',
          description: 'Component type',
          enum: ['resistor', 'capacitor', 'led', 'transistor', 'ic', 'connector']
        },
        category: {
          type: 'string',
          description: 'Component category'
        },
        properties: {
          type: 'object',
          description: 'Component properties',
          properties: {
            value: { type: 'string' },
            package: { type: 'string' }
          }
        }
      },
      required: ['id', 'type', 'category']
    }
  },
  {
    name: 'connect_pins',
    description: 'Connect two component pins',
    input_schema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Source pin reference (e.g., R1.L, C1.1)'
        },
        to: {
          type: 'string',
          description: 'Target pin reference (e.g., R2.R, C1.2)'
        },
        net: {
          type: 'string',
          description: 'Net name'
        }
      },
      required: ['from', 'to', 'net']
    }
  },
  {
    name: 'add_power_symbol',
    description: 'Add a power symbol (VCC, GND, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Symbol ID'
        },
        symbolType: {
          type: 'string',
          description: 'Power symbol type',
          enum: ['VCC', 'GND', 'VDD', 'VSS']
        },
        net: {
          type: 'string',
          description: 'Net name'
        }
      },
      required: ['id', 'symbolType', 'net']
    }
  },
  {
    name: 'add_net_label',
    description: 'Add a net label',
    input_schema: {
      type: 'object',
      properties: {
        net: {
          type: 'string',
          description: 'Net name'
        },
        label: {
          type: 'string',
          description: 'Label text'
        }
      },
      required: ['net', 'label']
    }
  }
]

export class ClaudeProvider {
  private client: Anthropic | null = null

  constructor(private apiKey: string, private baseURL: string = 'https://api.anthropic.com') {
    console.log('[ClaudeProvider] Constructor called with baseURL:', baseURL)
    if (apiKey) {
      const isOfficialApi = (baseURL || 'https://api.anthropic.com').includes('anthropic.com')
      this.client = new Anthropic({
        apiKey,
        baseURL: baseURL || 'https://api.anthropic.com',
        defaultHeaders: isOfficialApi ? undefined : {
          'User-Agent': 'claude-cli/2.1.71 (external, cli)',
          'x-app': 'cli'
        }
      })
      console.log('[ClaudeProvider] Client initialized, isOfficialApi:', isOfficialApi)
    }
  }

  async *generateSchematic(
    prompt: string,
    signal?: AbortSignal
  ): AsyncGenerator<ToolCall | { type: 'text'; text: string }> {
    if (!this.client) {
      throw new Error('API key not configured')
    }

    try {
      const isOfficialApi = this.baseURL.includes('anthropic.com')
      const modelName = isOfficialApi ? 'claude-3-5-sonnet-20241022' : 'claude-sonnet-4-6'
      console.log('[ClaudeProvider] Generating schematic with model:', modelName, '| tools:', isOfficialApi)

      const stream = await this.client.messages.create(
        {
          model: modelName,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
          ...(isOfficialApi && { tools: TOOL_SCHEMAS }),
          stream: true
        },
        { signal, timeout: 30000 }
      )

      let currentToolUse: { id: string; name: string; input: string } | null = null

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              input: ''
            }
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'tool_use' && currentToolUse) {
            currentToolUse.input += event.delta.partial_json || ''
          } else if (event.delta.type === 'text_delta') {
            yield { type: 'text', text: event.delta.text }
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolUse) {
            try {
              const input = JSON.parse(currentToolUse.input)
              yield {
                id: currentToolUse.id,
                name: currentToolUse.name,
                input
              }
            } catch (e) {
              console.error('Failed to parse tool input:', e)
            }
            currentToolUse = null
          }
        }
      }
    } catch (error) {
      console.error('ClaudeProvider error:', error)
      throw error
    }
  }

  async *modifySchematic(
    instruction: string,
    context: NetlistContext,
    signal?: AbortSignal
  ): AsyncGenerator<ToolCall | { type: 'text'; text: string }> {
    if (!this.client) {
      throw new Error('API key not configured')
    }

    const contextStr = JSON.stringify(context, null, 2)
    const prompt = `Current schematic:\n${contextStr}\n\nModification request: ${instruction}`

    try {
      const isOfficialApi = this.baseURL.includes('anthropic.com')
      const modelName = isOfficialApi ? 'claude-3-5-sonnet-20241022' : 'claude-sonnet-4-6'

      const stream = await this.client.messages.create(
        {
          model: modelName,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
          ...(isOfficialApi && { tools: TOOL_SCHEMAS }),
          stream: true
        },
        { signal, timeout: 30000 }
      )

      let currentToolUse: { id: string; name: string; input: string } | null = null

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              input: ''
            }
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'tool_use' && currentToolUse) {
            currentToolUse.input += event.delta.partial_json || ''
          } else if (event.delta.type === 'text_delta') {
            yield { type: 'text', text: event.delta.text }
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolUse) {
            try {
              const input = JSON.parse(currentToolUse.input)
              yield {
                id: currentToolUse.id,
                name: currentToolUse.name,
                input
              }
            } catch (e) {
              console.error('Failed to parse tool input:', e)
            }
            currentToolUse = null
          }
        }
      }
    } catch (error) {
      console.error('ClaudeProvider error:', error)
      throw error
    }
  }

  updateApiKey(apiKey: string, baseURL?: string): void {
    this.apiKey = apiKey
    if (baseURL) {
      this.baseURL = baseURL
    }
    this.client = new Anthropic({
      apiKey,
      baseURL: this.baseURL || 'https://api.anthropic.com'
    })
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('API key not configured')
    }

    try {
      // 根据 API 端点选择合适的模型名称
      let modelName = 'claude-3-5-sonnet-20241022' // 官方 API 默认

      if (!this.baseURL.includes('anthropic.com')) {
        // 中转服务，使用通用模型名称
        modelName = 'claude-sonnet-4-6'
      }

      console.log('[ClaudeProvider] Testing connection with model:', modelName)

      const response = await this.client.messages.create({
        model: modelName,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi'
          }
        ]
      })

      return response.content.length > 0
    } catch (error) {
      console.error('Connection test error:', error)
      throw error
    }
  }
}
