import { EventBus } from './EventBus'
import type { Command, CommandContext, DomainEvent } from './types'

const UNDO_LIMIT = 100

export class CommandBus {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private readonly context: CommandContext
  private readonly eventBus: EventBus
  private onExecute?: () => void

  constructor(context: CommandContext, eventBus?: EventBus, onExecute?: () => void) {
    this.context = context
    this.eventBus = eventBus ?? new EventBus()
    this.onExecute = onExecute
  }

  execute(cmd: Command): void {
    const events = cmd.execute(this.context)
    this.undoStack.push(cmd)
    if (this.undoStack.length > UNDO_LIMIT) {
      this.undoStack.shift()
    }
    this.redoStack = []
    this.emitEvents(events)
    this.onExecute?.()
  }

  undo(): void {
    const cmd = this.undoStack.pop()
    if (!cmd) return

    const events = cmd.undo(this.context)
    this.redoStack.push(cmd)
    this.emitEvents(events)
    this.onExecute?.()
  }

  redo(): void {
    const cmd = this.redoStack.pop()
    if (!cmd) return

    const events = cmd.execute(this.context)
    this.undoStack.push(cmd)
    if (this.undoStack.length > UNDO_LIMIT) {
      this.undoStack.shift()
    }
    this.emitEvents(events)
    this.onExecute?.()
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  private emitEvents(events: DomainEvent[]): void {
    for (const event of events) {
      const normalizedEvent: DomainEvent =
        typeof event.timestamp === 'number' ? event : { ...event, timestamp: Date.now() }
      this.eventBus.emit(normalizedEvent)
    }
  }
}
