import type { NetlistManager } from '../domain/NetlistManager'

export interface DomainEvent {
  type: string
  data: any
  timestamp: number
}

export interface CommandContext {
  netlistManager: NetlistManager
}

export interface Command {
  type: string
  description: string
  timestamp: number
  sheetId: string
  execute(context: CommandContext): DomainEvent[]
  undo(context: CommandContext): DomainEvent[]
}
