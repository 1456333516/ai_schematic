import type { Netlist } from './types'

export class ConnectivityGraph {
  private adjacency: Map<string, Set<string>> = new Map()
  private netPins: Map<string, Set<string>> = new Map()

  buildFromNetlist(netlist: Netlist): void {
    this.adjacency.clear()
    this.netPins.clear()

    for (const componentId of netlist.components.keys()) {
      this.addNode(componentId)
    }

    for (const net of netlist.nets.values()) {
      const pins = new Set(net.pins)
      this.netPins.set(net.name, pins)

      const components = Array.from(
        new Set(Array.from(pins).map((pinRef) => this.extractComponentId(pinRef)))
      )

      for (let i = 0; i < components.length; i++) {
        for (let j = i + 1; j < components.length; j++) {
          this.addEdge(components[i], components[j])
        }
      }
    }

    for (const wire of netlist.wires.values()) {
      this.addEdge(this.extractComponentId(wire.from), this.extractComponentId(wire.to))
    }
  }

  getConnectedComponents(id: string): string[] {
    if (!this.adjacency.has(id)) return []

    const visited = new Set<string>([id])
    const queue: string[] = [id]
    const connected: string[] = []

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const neighbor of this.adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          connected.push(neighbor)
          queue.push(neighbor)
        }
      }
    }

    return connected
  }

  findPath(from: string, to: string): string[] {
    if (!this.adjacency.has(from) || !this.adjacency.has(to)) return []
    if (from === to) return [from]

    const queue: string[] = [from]
    const visited = new Set<string>([from])
    const previous = new Map<string, string>()

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const neighbor of this.adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          previous.set(neighbor, current)
          if (neighbor === to) {
            return this.reconstructPath(previous, from, to)
          }
          queue.push(neighbor)
        }
      }
    }

    return []
  }

  detectFloatingNets(): string[] {
    return Array.from(this.netPins.entries())
      .filter(([, pins]) => pins.size === 1)
      .map(([name]) => name)
  }

  addNode(id: string): void {
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, new Set())
    }
  }

  removeNode(id: string): void {
    const neighbors = this.adjacency.get(id)
    if (!neighbors) return
    for (const neighbor of neighbors) {
      this.adjacency.get(neighbor)?.delete(id)
    }
    this.adjacency.delete(id)
  }

  addEdge(from: string, to: string): void {
    if (from === to) return
    this.addNode(from)
    this.addNode(to)
    this.adjacency.get(from)!.add(to)
    this.adjacency.get(to)!.add(from)
  }

  removeEdge(from: string, to: string): void {
    this.adjacency.get(from)?.delete(to)
    this.adjacency.get(to)?.delete(from)
  }

  private extractComponentId(pinRef: string): string {
    const dotIndex = pinRef.indexOf('.')
    return dotIndex === -1 ? pinRef : pinRef.slice(0, dotIndex)
  }

  private reconstructPath(previous: Map<string, string>, from: string, to: string): string[] {
    const path: string[] = [to]
    let current = to
    while (current !== from) {
      const parent = previous.get(current)
      if (!parent) return []
      path.push(parent)
      current = parent
    }
    return path.reverse()
  }
}
