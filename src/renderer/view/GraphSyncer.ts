import type { Graph } from '@antv/x6'
import type { EventBus } from '../commands/EventBus'
import type { DomainEvent } from '../commands/types'

const POSITION_TOLERANCE = 0.1

export class GraphSyncer {
  private domainToX6: Map<string, string> = new Map()
  private x6ToDomain: Map<string, string> = new Map()
  private unsubscribers: Array<() => void> = []
  private pendingUpdates: Set<() => void> = new Set()
  private rafId: number | null = null

  constructor(
    private readonly graph: Graph,
    private readonly eventBus: EventBus
  ) {
    this.subscribeToEvents()
  }

  private subscribeToEvents(): void {
    this.unsubscribers.push(
      this.eventBus.subscribe('component:added', (event) => this.handleNodeAdded(event)),
      this.eventBus.subscribe('component:removed', (event) => this.handleNodeRemoved(event)),
      this.eventBus.subscribe('component:moved', (event) => this.handleNodeMoved(event)),
      this.eventBus.subscribe('wire:connected', (event) => this.handleEdgeAdded(event)),
      this.eventBus.subscribe('wire:disconnected', (event) => this.handleEdgeRemoved(event)),
      this.eventBus.subscribe('property:updated', (event) => this.handlePropertyUpdated(event))
    )
  }

  private handleNodeAdded(event: DomainEvent): void {
    this.scheduleUpdate(() => {
      const { id, data } = event.data
      const x6Id = this.domainToX6.get(id) ?? id

      if (this.graph.getCellById(x6Id)) return

      const node = this.graph.addNode({
        id: x6Id,
        x: data.position?.x ?? 0,
        y: data.position?.y ?? 0,
        width: 80,
        height: 60,
        shape: 'rect',
        attrs: {
          body: {
            fill: '#ffffff',
            stroke: '#333333'
          },
          label: {
            text: id,
            fill: '#333333'
          }
        },
        data: {
          domainId: id,
          type: data.type,
          category: data.category,
          properties: data.properties
        }
      }, { silent: true })

      this.domainToX6.set(id, x6Id)
      this.x6ToDomain.set(x6Id, id)
    })
  }

  private handleNodeRemoved(event: DomainEvent): void {
    this.scheduleUpdate(() => {
      const { id } = event.data
      const x6Id = this.domainToX6.get(id)
      if (!x6Id) return

      const node = this.graph.getCellById(x6Id)
      if (node) {
        this.graph.removeCell(node, { silent: true })
      }

      this.domainToX6.delete(id)
      this.x6ToDomain.delete(x6Id)
    })
  }

  private handleNodeMoved(event: DomainEvent): void {
    this.scheduleUpdate(() => {
      const { id, to } = event.data
      const x6Id = this.domainToX6.get(id)
      if (!x6Id) return

      const node = this.graph.getCellById(x6Id)
      if (!node) return

      const currentPos = node.position()
      if (this.positionsEqual(currentPos, to)) return

      node.position(to.x, to.y, { silent: true })
    })
  }

  private handleEdgeAdded(event: DomainEvent): void {
    this.scheduleUpdate(() => {
      const { id, from, to } = event.data
      const x6Id = id ?? `edge_${from}_${to}`

      if (this.graph.getCellById(x6Id)) return

      const sourceId = this.extractComponentId(from)
      const targetId = this.extractComponentId(to)
      const sourceX6Id = this.domainToX6.get(sourceId)
      const targetX6Id = this.domainToX6.get(targetId)

      if (!sourceX6Id || !targetX6Id) return

      this.graph.addEdge({
        id: x6Id,
        source: sourceX6Id,
        target: targetX6Id,
        attrs: {
          line: {
            stroke: '#333333',
            strokeWidth: 2
          }
        },
        data: {
          domainId: id,
          from,
          to
        }
      }, { silent: true })

      if (id) {
        this.domainToX6.set(id, x6Id)
        this.x6ToDomain.set(x6Id, id)
      }
    })
  }

  private handleEdgeRemoved(event: DomainEvent): void {
    this.scheduleUpdate(() => {
      const { id } = event.data
      const x6Id = this.domainToX6.get(id) ?? id
      if (!x6Id) return

      const edge = this.graph.getCellById(x6Id)
      if (edge) {
        this.graph.removeCell(edge, { silent: true })
      }

      if (id) {
        this.domainToX6.delete(id)
        this.x6ToDomain.delete(x6Id)
      }
    })
  }

  private handlePropertyUpdated(event: DomainEvent): void {
    this.scheduleUpdate(() => {
      const { id, key, value } = event.data
      const x6Id = this.domainToX6.get(id) ?? id
      const node = this.graph.getCellById(x6Id)
      if (!node) return

      const data = node.getData() || {}
      node.setData({ ...data, [key]: value }, { silent: true })

      if (key === 'refDes') {
        try { node.attr('refDes/text', value ?? '', { silent: true }) } catch { /* non-fatal */ }
      } else if (key === 'label') {
        try { node.attr('valueLabel/text', value ?? '', { silent: true }) } catch { /* non-fatal */ }
      }
    })
  }

  private positionsEqual(pos1: { x: number; y: number }, pos2: { x: number; y: number }): boolean {
    return (
      Math.abs(pos1.x - pos2.x) < POSITION_TOLERANCE &&
      Math.abs(pos1.y - pos2.y) < POSITION_TOLERANCE
    )
  }

  private extractComponentId(pinRef: string): string {
    const dotIndex = pinRef.indexOf('.')
    return dotIndex === -1 ? pinRef : pinRef.slice(0, dotIndex)
  }

  private scheduleUpdate(update: () => void): void {
    this.pendingUpdates.add(update)

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.flushUpdates()
      })
    }
  }

  private flushUpdates(): void {
    for (const update of this.pendingUpdates) {
      update()
    }
    this.pendingUpdates.clear()
    this.rafId = null
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    for (const unsubscribe of this.unsubscribers) {
      unsubscribe()
    }
    this.unsubscribers = []

    this.domainToX6.clear()
    this.x6ToDomain.clear()
    this.pendingUpdates.clear()
  }
}
