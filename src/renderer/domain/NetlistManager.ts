import type {
  Component,
  ComponentData,
  Net,
  Netlist,
  PinRef,
  Point,
  Wire
} from './types'

export class NetlistManager {
  private netlist: Netlist

  constructor(netlist?: Netlist) {
    this.netlist = netlist ?? {
      components: new Map(),
      wires: new Map(),
      nets: new Map()
    }
  }

  addComponent(data: ComponentData): void {
    const id = data.id ?? this.generateId('component', this.netlist.components)
    if (this.netlist.components.has(id)) {
      throw new Error(`Component ${id} already exists`)
    }

    const component: Component = {
      id,
      type: data.type,
      category: data.category,
      properties: { ...(data.properties ?? {}) },
      pins: (data.pins ?? []).map((pin) => ({ ...pin, position: { ...pin.position } })),
      position: data.position ? { ...data.position } : { x: 0, y: 0 }
    }

    this.netlist.components.set(id, component)
  }

  removeComponent(id: string): void {
    if (!this.netlist.components.has(id)) return

    const wiresToRemove = Array.from(this.netlist.wires.values())
      .filter((wire) => this.isPinOnComponent(wire.from, id) || this.isPinOnComponent(wire.to, id))
      .map((wire) => wire.id)

    wiresToRemove.forEach((wireId) => this.disconnectWire(wireId))
    this.netlist.components.delete(id)

    for (const [netName, net] of this.netlist.nets) {
      net.pins = net.pins.filter((pin) => !this.isPinOnComponent(pin, id))
      if (net.pins.length === 0) {
        this.netlist.nets.delete(netName)
      }
    }
  }

  moveComponent(id: string, position: Point): void {
    const component = this.netlist.components.get(id)
    if (component) {
      component.position = { ...position }
    }
  }

  connectPins(from: PinRef, to: PinRef): void {
    const fromNet = this.findNetByPin(from)
    const toNet = this.findNetByPin(to)

    let net: Net
    if (fromNet && toNet && fromNet.name !== toNet.name) {
      net = this.mergeNets(fromNet, toNet)
    } else if (fromNet || toNet) {
      net = (fromNet ?? toNet)!
    } else {
      const name = this.generateId('net', this.netlist.nets)
      net = { name, type: 'signal', pins: [] }
      this.netlist.nets.set(name, net)
    }

    if (!net.pins.includes(from)) net.pins.push(from)
    if (!net.pins.includes(to)) net.pins.push(to)

    const wire: Wire = {
      id: this.generateId('wire', this.netlist.wires),
      from,
      to,
      net: net.name,
      points: []
    }
    this.netlist.wires.set(wire.id, wire)
  }

  disconnectWire(id: string): void {
    const wire = this.netlist.wires.get(id)
    if (!wire) return

    this.netlist.wires.delete(id)

    const net = this.netlist.nets.get(wire.net)
    if (!net) return

    const connectedPins = new Set<PinRef>()
    for (const w of this.netlist.wires.values()) {
      if (w.net === net.name) {
        connectedPins.add(w.from)
        connectedPins.add(w.to)
      }
    }

    if (connectedPins.size === 0) {
      this.netlist.nets.delete(net.name)
    } else {
      net.pins = Array.from(connectedPins)
    }
  }

  updateComponentProperty(id: string, key: string, value: any): void {
    const component = this.netlist.components.get(id)
    if (component) {
      component.properties = { ...component.properties, [key]: value }
    }
  }

  getComponent(id: string): Component | undefined {
    return this.netlist.components.get(id)
  }

  getWire(id: string): Wire | undefined {
    return this.netlist.wires.get(id)
  }

  getNet(name: string): Net | undefined {
    return this.netlist.nets.get(name)
  }

  private generateId<T>(prefix: string, map: Map<string, T>): string {
    let counter = map.size + 1
    let id = `${prefix}_${counter}`
    while (map.has(id)) {
      id = `${prefix}_${++counter}`
    }
    return id
  }

  private findNetByPin(pin: PinRef): Net | undefined {
    return Array.from(this.netlist.nets.values()).find((net) => net.pins.includes(pin))
  }

  private mergeNets(primary: Net, secondary: Net): Net {
    primary.pins = Array.from(new Set([...primary.pins, ...secondary.pins]))
    for (const wire of this.netlist.wires.values()) {
      if (wire.net === secondary.name) {
        wire.net = primary.name
      }
    }
    this.netlist.nets.delete(secondary.name)
    return primary
  }

  private isPinOnComponent(pinRef: PinRef, componentId: string): boolean {
    return pinRef === componentId || pinRef.startsWith(`${componentId}.`)
  }
}
