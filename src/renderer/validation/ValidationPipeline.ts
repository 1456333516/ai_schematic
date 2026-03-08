import type { Netlist } from '../domain/types'
import type { ToolCall } from '../../main/services/ClaudeProvider'
import {
  AddComponentSchema,
  ConnectPinsSchema,
  AddPowerSymbolSchema,
  AddNetLabelSchema
} from './schemas'

export type ValidationLevel = 'ERROR' | 'WARNING' | 'INFO'

export interface ValidationIssue {
  level: ValidationLevel
  message: string
  toolCall?: ToolCall
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

export class ValidationPipeline {
  validateSchema(toolCall: ToolCall): ValidationResult {
    const issues: ValidationIssue[] = []

    try {
      switch (toolCall.name) {
        case 'add_component':
          AddComponentSchema.parse(toolCall.input)
          break
        case 'connect_pins':
          ConnectPinsSchema.parse(toolCall.input)
          break
        case 'add_power_symbol':
          AddPowerSymbolSchema.parse(toolCall.input)
          break
        case 'add_net_label':
          AddNetLabelSchema.parse(toolCall.input)
          break
        default:
          issues.push({
            level: 'ERROR',
            message: `Unknown tool: ${toolCall.name}`,
            toolCall
          })
          return { valid: false, issues }
      }
    } catch (error: any) {
      issues.push({
        level: 'ERROR',
        message: `Schema validation failed: ${error.message}`,
        toolCall
      })
      return { valid: false, issues }
    }

    return { valid: true, issues }
  }

  checkReferenceIntegrity(toolCall: ToolCall, netlist: Netlist): ValidationResult {
    const issues: ValidationIssue[] = []

    if (toolCall.name === 'connect_pins') {
      const { from, to } = toolCall.input
      const fromComponentId = this.extractComponentId(from)
      const toComponentId = this.extractComponentId(to)

      if (!netlist.components.has(fromComponentId)) {
        issues.push({
          level: 'ERROR',
          message: `Component ${fromComponentId} does not exist`,
          toolCall
        })
      }

      if (!netlist.components.has(toComponentId)) {
        issues.push({
          level: 'ERROR',
          message: `Component ${toComponentId} does not exist`,
          toolCall
        })
      }
    }

    return { valid: issues.length === 0, issues }
  }

  basicERC(netlist: Netlist): ValidationResult {
    const issues: ValidationIssue[] = []

    for (const [netName, net] of netlist.nets) {
      if (net.pins.length === 1) {
        issues.push({
          level: 'WARNING',
          message: `Floating net: ${netName} has only one connection`
        })
      }

      if (net.type === 'power' && net.pins.length === 0) {
        issues.push({
          level: 'ERROR',
          message: `Unconnected power net: ${netName}`
        })
      }
    }

    const connectedComponents = new Set<string>()
    for (const wire of netlist.wires.values()) {
      connectedComponents.add(this.extractComponentId(wire.from))
      connectedComponents.add(this.extractComponentId(wire.to))
    }

    for (const [componentId, component] of netlist.components) {
      if (!connectedComponents.has(componentId) && component.pins.length > 0) {
        issues.push({
          level: 'WARNING',
          message: `Floating component: ${componentId} has no connections`
        })
      }
    }

    return { valid: issues.filter((i) => i.level === 'ERROR').length === 0, issues }
  }

  private extractComponentId(pinRef: string): string {
    const dotIndex = pinRef.indexOf('.')
    return dotIndex === -1 ? pinRef : pinRef.slice(0, dotIndex)
  }
}

export class RepairOrchestrator {
  autoAddMissingGND(netlist: Netlist): boolean {
    let hasGND = false
    for (const net of netlist.nets.values()) {
      if (net.name === 'GND' || net.type === 'ground') {
        hasGND = true
        break
      }
    }

    if (!hasGND) {
      netlist.nets.set('GND', {
        name: 'GND',
        type: 'ground',
        pins: []
      })
      return true
    }

    return false
  }

  normalizeNetNames(netlist: Netlist): number {
    let count = 0
    const renames = new Map<string, string>()

    for (const [oldName, net] of netlist.nets) {
      const normalized = oldName.toUpperCase().replace(/\s+/g, '_')
      if (normalized !== oldName) {
        renames.set(oldName, normalized)
        count++
      }
    }

    for (const [oldName, newName] of renames) {
      const net = netlist.nets.get(oldName)
      if (net) {
        netlist.nets.delete(oldName)
        netlist.nets.set(newName, { ...net, name: newName })

        for (const wire of netlist.wires.values()) {
          if (wire.net === oldName) {
            wire.net = newName
          }
        }
      }
    }

    return count
  }

  removeDuplicateWires(netlist: Netlist): number {
    const seen = new Set<string>()
    const toRemove: string[] = []

    for (const [wireId, wire] of netlist.wires) {
      const key = `${wire.from}:${wire.to}:${wire.net}`
      const reverseKey = `${wire.to}:${wire.from}:${wire.net}`

      if (seen.has(key) || seen.has(reverseKey)) {
        toRemove.push(wireId)
      } else {
        seen.add(key)
      }
    }

    for (const wireId of toRemove) {
      netlist.wires.delete(wireId)
    }

    return toRemove.length
  }
}
