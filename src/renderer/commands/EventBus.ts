import type { DomainEvent } from './types'

type EventHandler = (event: DomainEvent) => void

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map()

  emit(event: DomainEvent): void {
    const typeHandlers = this.handlers.get(event.type)
    if (!typeHandlers) return

    for (const handler of typeHandlers) {
      handler(event)
    }
  }

  subscribe(type: string, handler: EventHandler): () => void {
    let typeHandlers = this.handlers.get(type)
    if (!typeHandlers) {
      typeHandlers = new Set()
      this.handlers.set(type, typeHandlers)
    }
    typeHandlers.add(handler)

    return () => {
      const existing = this.handlers.get(type)
      if (!existing) return
      existing.delete(handler)
      if (existing.size === 0) {
        this.handlers.delete(type)
      }
    }
  }
}
