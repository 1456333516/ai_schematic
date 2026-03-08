import Anthropic from '@anthropic-ai/sdk'
import type { AnalysisReport } from '../../shared/types/project'

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
    description: `Add a new component to the schematic.
Ports available per type:
- resistor → ports: L, R
- capacitor → ports: L, R
- led → ports: A (anode), K (cathode)
- diode → ports: A (anode), K (cathode)
- inductor → ports: L, R
- fuse → ports: L, R
- zener → ports: A (anode), K (cathode)
- schottky → ports: A (anode), K (cathode)
- crystal → ports: P1, P2
- npn → ports: B (base), C (collector), E (emitter)
- pnp → ports: B (base), C (collector), E (emitter)
- nmos → ports: G (gate), D (drain), S (source)
- pmos → ports: G (gate), D (drain), S (source)
- opamp → ports: IN+ (non-inv), IN- (inv), V+ (pos supply), V- (neg supply), OUT
- gate-and / gate-or / gate-nand / gate-nor → ports: A, B, Y
- gate-not → ports: A, Y
- buzzer → ports: P (left/positive), N (right/negative)
- net-port → ports: P (right, the connection point). Use for external signal inputs/outputs (IO pins). Set properties.value to signal name (e.g., "BEEP", "EN", "IO1").
- connector → ports: P1, P2, ... (use properties.pinCount to set exact pin count, default 2)
- ic → ports: P1, P2, ...`,
    input_schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Component reference designator (e.g., R1, C1, U1, LED1)'
        },
        type: {
          type: 'string',
          description: 'Component type. Use "npn"/"pnp" for BJT, "nmos"/"pmos" for MOSFET, "gate-and/or/not/nand/nor" for logic gates.',
          enum: ['resistor', 'capacitor', 'led', 'diode', 'inductor', 'fuse', 'zener', 'schottky', 'npn', 'pnp', 'nmos', 'pmos', 'opamp', 'gate-and', 'gate-or', 'gate-not', 'gate-nand', 'gate-nor', 'crystal', 'buzzer', 'net-port', 'ic', 'connector']
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
    description: `Connect two component pins with a wire.
Port names by component type:
- resistor: L (left), R (right)
- capacitor: L (left), R (right)
- inductor: L (left), R (right)
- fuse: L (left), R (right)
- crystal: P1 (left), P2 (right)
- led: A (anode/left), K (cathode/right)
- diode: A (anode/left), K (cathode/right)
- zener: A (anode/left), K (cathode/right)
- schottky: A (anode/left), K (cathode/right)
- npn: B (base/left), C (collector/top-right), E (emitter/bottom-right)
- pnp: B (base/left), C (collector/top-right), E (emitter/bottom-right)
- nmos: G (gate/left), D (drain/top-right), S (source/bottom-right)
- pmos: G (gate/left), D (drain/top-right), S (source/bottom-right)
- opamp: IN+ (non-inv/left-top), IN- (inv/left-bottom), OUT (right), V+ (top), V- (bottom)
- gate-and / gate-or / gate-nand / gate-nor: A (input1/left-top), B (input2/left-bottom), Y (output/right)
- gate-not: A (input/left), Y (output/right)
- buzzer: P (positive/left), N (negative/right)
- net-port: P (right, connection point)
- vcc: P (bottom)
- gnd: P (top)
- ic / connector: P1, P2, P3, ... (numbered pins)
Example: "R1.R" = resistor R1 right pin, "Q1.B" = NPN Q1 base pin, "BZ1.P" = buzzer positive pin`,
    input_schema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Source pin reference in format ComponentID.PortName (e.g., R1.R, LED1.A, VCC1.P)'
        },
        to: {
          type: 'string',
          description: 'Target pin reference in format ComponentID.PortName (e.g., LED1.K, GND1.P, C1.L)'
        },
        net: {
          type: 'string',
          description: 'Net name for this connection (e.g., VCC, GND, LED_ANODE)'
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
      console.log('[ClaudeProvider] Generating schematic with model:', modelName)

      const stream = await this.client.messages.create(
        {
          model: modelName,
          max_tokens: 4096,
          system: `You are an EDA (Electronic Design Automation) schematic editor AI assistant.
Your ONLY job is to generate electronic circuit schematics by calling the provided tools.
You MUST call tools to add components — never respond with plain text explanations or questions.

Rules:
- Use add_component for every component (resistor, capacitor, led, etc.)
- Use add_power_symbol for VCC and GND symbols
- Use connect_pins to wire components together
- Use standard reference designators: R1, C1, D1, Q1, U1, BZ1, L1, F1
- Use real component values: "10k", "100nF", "5V", "1N4148", "2N2222"
- Always include VCC and GND power symbols in the circuit
- Use net-port (type "net-port") for external signal inputs/outputs (IO pins, control signals, MCU pins). Set id to signal name (e.g., "BEEP", "EN"). Example: add_component with id="BEEP", type="net-port", properties.value="BEEP"

STRICT power symbol rules:
- Use EXACTLY ONE add_power_symbol for VCC (id="VCC1") and EXACTLY ONE for GND (id="GND1") in the entire circuit.
- Connect ALL power connections to the same VCC1 and GND1 using connect_pins. Do NOT create multiple VCC/GND symbols.

Critical wiring rules:
- EVERY pin of EVERY component MUST be connected. No floating pins allowed.
- For transistors (npn/pnp): all 3 pins (B, C, E) must be wired.
- For MOSFETs (nmos/pmos): all 3 pins (G, D, S) must be wired.
- For opamps: at minimum IN+, IN-, OUT must be wired. V+ and V- should connect to power.
- For logic gates: all inputs (A, B) and output (Y) must be wired.
- For diodes across inductive loads (buzzer, relay): connect the flyback diode in reverse-parallel (cathode to positive side).
- Base/gate drive resistors are mandatory for transistor switches.

Common circuit templates (follow these exact topologies):
1. NPN buzzer/relay driver:
   - VCC1.P → BZ1.P, BZ1.N → Q1.C, Q1.E → GND1.P
   - BEEP(net-port).P → R1(1K).L, R1.R → Q1.B
   - R2(10K).L → Q1.B, R2.R → GND1.P (base pull-down)
   - Flyback diode: D1.K → BZ1.P (VCC side), D1.A → BZ1.N (collector side)
2. NPN LED driver:
   - VCC1.P → R1(limit).L, R1.R → LED1.A, LED1.K → Q1.C, Q1.E → GND1.P
   - EN(net-port).P → R2(1K).L, R2.R → Q1.B
3. Simple LED circuit:
   - VCC1.P → R1(limit).L, R1.R → LED1.A, LED1.K → GND1.P`,
          messages: [{ role: 'user', content: prompt }],
          tools: TOOL_SCHEMAS,
          tool_choice: { type: 'any' },
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
          if (event.delta.type === 'input_json_delta' && currentToolUse) {
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

    const existingIds = context.components.map(c => c.id).join(', ') || 'none'
    const contextStr = JSON.stringify(context, null, 2)
    const prompt = `Current schematic on canvas (already placed, do not duplicate):
${contextStr}

Components already on canvas: ${existingIds}

User request: ${instruction}`

    try {
      const isOfficialApi = this.baseURL.includes('anthropic.com')
      const modelName = isOfficialApi ? 'claude-3-5-sonnet-20241022' : 'claude-sonnet-4-6'

      const stream = await this.client.messages.create(
        {
          model: modelName,
          max_tokens: 4096,
          system: `You are an EDA schematic editor AI assistant. You are modifying an EXISTING schematic.

The current schematic is shown in the user message. Understand what is already there, then fulfill the user's request intelligently:
- If the user asks to add something to an existing circuit, build on it — do not duplicate components that already exist.
- If the user asks to add something "in parallel" or "in series", connect the new component to the same nets as the referenced existing component.
- Only add power symbols (VCC, GND) if the user's request explicitly requires them or if the existing circuit is incomplete without them.
- Use good judgment: a request like "add a capacitor in parallel with LED1" only needs add_component + connect_pins, not a full circuit rebuild.
- You MUST call tools to make changes. Do not respond with plain text only.

Critical wiring rules:
- EVERY pin of EVERY new component MUST be connected. No floating pins allowed.
- For transistors (npn/pnp): all 3 pins (B, C, E) must be wired.
- For MOSFETs (nmos/pmos): all 3 pins (G, D, S) must be wired.
- For opamps: at minimum IN+, IN-, OUT must be wired.
- Base/gate drive resistors are mandatory for transistor switches.`,
          messages: [{ role: 'user', content: prompt }],
          tools: TOOL_SCHEMAS,
          tool_choice: { type: 'any' },
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
          if (event.delta.type === 'input_json_delta' && currentToolUse) {
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

  async analyzeSchematic(netlist: NetlistContext): Promise<AnalysisReport> {
    if (!this.client) throw new Error('API key not configured')

    const isOfficialApi = this.baseURL.includes('anthropic.com')
    const modelName = isOfficialApi ? 'claude-3-5-sonnet-20241022' : 'claude-sonnet-4-6'

    const response = await this.client.messages.create({
      model: modelName,
      max_tokens: 2048,
      system: `You are an expert EDA circuit analyzer. Analyze the provided netlist and return ONLY a JSON object in a markdown code block:
\`\`\`json
{
  "errors": [{"severity": "error", "message": "...", "component": "R1"}],
  "warnings": [{"severity": "warning", "message": "..."}],
  "suggestions": [{"severity": "suggestion", "message": "..."}]
}
\`\`\`
All "message" values MUST be written in Chinese (Simplified). Check for: unconnected pins, short circuits, missing power symbols, incorrect polarity, missing decoupling capacitors, and general design issues.`,
      messages: [{ role: 'user', content: `Analyze this schematic netlist:\n${JSON.stringify(netlist, null, 2)}` }]
    })

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    try {
      const match = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = match ? match[1].trim() : rawText
      return JSON.parse(jsonStr) as AnalysisReport
    } catch {
      return { errors: [], warnings: [], suggestions: [{ severity: 'suggestion', message: rawText }] }
    }
  }

  async optimizeLayout(canvasDescription: string, signal?: AbortSignal): Promise<ToolCall[]> {
    if (!this.client) throw new Error('API key not configured')

    const isOfficialApi = this.baseURL.includes('anthropic.com')
    const modelName = isOfficialApi ? 'claude-3-5-sonnet-20241022' : 'claude-sonnet-4-6'

    const layoutTools: Anthropic.Tool[] = [
      {
        name: 'move_component',
        description: 'Move a component to a new position on the canvas.',
        input_schema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Component ID to move' },
            x: { type: 'number', description: 'New X position (top-left corner)' },
            y: { type: 'number', description: 'New Y position (top-left corner)' }
          },
          required: ['id', 'x', 'y']
        }
      },
      {
        name: 'rotate_component',
        description: 'Rotate a component by a given angle. Rotation is applied around the component center. Ports rotate with the component.',
        input_schema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Component ID to rotate' },
            angle: {
              type: 'number',
              description: 'Rotation angle in degrees (clockwise). Use 90 for vertical, 180 for flipped, 270 for vertical-flipped.',
              enum: [0, 90, 180, 270]
            }
          },
          required: ['id', 'angle']
        }
      }
    ]

    const response = await this.client.messages.create(
      {
        model: modelName,
        max_tokens: 4096,
        system: `You are an EDA schematic layout optimizer. Your job is to compute optimal positions and rotations for components.
You MUST call move_component for EVERY component. Also call rotate_component when rotation improves the layout.

Layout conventions (follow strictly):
- VCC/VDD at top center, GND/VSS at bottom center
- Power flows top-to-bottom vertically
- Signal/control inputs enter from the LEFT side
- For transistor switch circuits: load ABOVE transistor, GND BELOW transistor, base/gate drive to the LEFT
- Flyback diodes next to the load they protect, same vertical level
- Net-port (IO labels) at the far left
- Minimum 80px gap between any two component bounding boxes — NO overlaps allowed
- Wires use manhattan routing (orthogonal paths) and MUST NOT pass through component bodies. Leave enough clearance (at least 40px) around components for wire routing paths
- All coordinates must be multiples of 10 (grid snap)
- Keep the circuit compact but readable, like a textbook schematic
- Typical canvas: X range 100–900, Y range 50–700

Rotation guide (use rotate_component):
- Components default to 0° (horizontal: ports on left and right sides)
- Rotate 90° (clockwise) to make a component vertical: left port moves to top, right port to bottom. Use this for components in a vertical signal path (e.g., pull-down resistor between a node and GND below it)
- Rotate 180° to flip: left/right ports swap sides
- Rotate 270° for vertical with opposite orientation
- DO NOT rotate VCC, GND, or net-port symbols
- Common rotations: pull-down/pull-up resistors → 90°, flyback diodes across vertical loads → 90°

Port position reference at 0° (relative to component top-left):
- Resistor/Inductor/Fuse (80x30): L at (0,15), R at (80,15)
- Capacitor (60x30): L at (0,15), R at (60,15)
- Diode/LED/Zener/Schottky (60x40): A at (0,20), K at (60,20)
- NPN/PNP (80x60): B at (0,30), C at (80,5), E at (80,55)
- NMOS/PMOS (80x60): G at (0,30), D at (80,5), S at (80,55)
- OpAmp (80x60): IN+ at (0,20), IN- at (0,40), OUT at (80,30), V+ at (40,0), V- at (40,60)
- Buzzer (70x50): P at (0,25), N at (70,25)
- Net-port (70x24): P at (70,12)
- VCC (30x20): P at (15,20)
- GND (30x20): P at (15,0)
- Logic gates (70x50): A at (0,15), B at (0,35), Y at (70,25)

When rotated 90° CW, port positions transform: (px, py) → (height-py, px). Width and height swap.
Example: Resistor(80x30) rotated 90° becomes 30x80, L moves from (0,15) to (15,0)=top, R moves from (80,15) to (15,80)=bottom.

Positioning strategy: align connected ports so wires are short, straight, and do not cross other components.`,
        messages: [{ role: 'user', content: canvasDescription }],
        tools: layoutTools,
        tool_choice: { type: 'any' }
      },
      { signal, timeout: 30000 }
    )

    return response.content
      .filter((block): block is Anthropic.ContentBlock & { type: 'tool_use' } => block.type === 'tool_use')
      .map(block => ({ id: block.id, name: block.name, input: block.input as any }))
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
