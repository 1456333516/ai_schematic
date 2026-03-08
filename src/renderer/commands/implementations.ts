import type { Component, ComponentData, Netlist, Pin, PinRef, Point, Wire } from '../domain/types'
import type { Command, CommandContext, DomainEvent } from './types'

interface NetlistAccessor {
  netlist: Netlist
}

function createEvent(type: string, data: any): DomainEvent {
  return { type, data, timestamp: Date.now() }
}

function clonePoint(point: Point): Point {
  return { ...point }
}

function clonePin(pin: Pin): Pin {
  return { ...pin, position: clonePoint(pin.position) }
}

function cloneWire(wire: Wire): Wire {
  return { ...wire, points: wire.points.map(clonePoint) }
}

function normalizeComponentData(data: ComponentData): ComponentData {
  return {
    id: data.id,
    type: data.type,
    category: data.category,
    properties: { ...(data.properties ?? {}) },
    pins: (data.pins ?? []).map(clonePin),
    position: data.position ? clonePoint(data.position) : undefined
  }
}

function componentToData(component: Component): ComponentData {
  return {
    id: component.id,
    type: component.type,
    category: component.category,
    properties: { ...component.properties },
    pins: component.pins.map(clonePin),
    position: clonePoint(component.position)
  }
}

function getNetlist(context: CommandContext): Netlist {
  return (context.netlistManager as unknown as NetlistAccessor).netlist
}

function isPinOnComponent(pinRef: PinRef, componentId: string): boolean {
  return pinRef === componentId || pinRef.startsWith(`${componentId}.`)
}

function findNewWireId(netlist: Netlist, before: Set<string>): string | undefined {
  for (const wireId of netlist.wires.keys()) {
    if (!before.has(wireId)) return wireId
  }
  return undefined
}

function generateComponentId(context: CommandContext): string {
  let counter = 1
  let candidate = `component_${counter}`
  while (context.netlistManager.getComponent(candidate)) {
    candidate = `component_${++counter}`
  }
  return candidate
}

export class AddComponentCommand implements Command {
  readonly type = 'ADD_COMPONENT'
  readonly description: string
  readonly timestamp = Date.now()
  readonly sheetId: string

  private readonly data: ComponentData
  private componentId?: string

  constructor(data: ComponentData, sheetId = 'default', description?: string) {
    this.data = normalizeComponentData(data)
    this.sheetId = sheetId
    this.description = description ?? `Add component ${data.id ?? '(auto)'}`
  }

  execute(context: CommandContext): DomainEvent[] {
    const id = this.componentId ?? this.data.id ?? generateComponentId(context)
    const payload = normalizeComponentData({ ...this.data, id })

    context.netlistManager.addComponent(payload)
    this.componentId = id

    return [createEvent('component:added', { id, data: payload })]
  }

  undo(context: CommandContext): DomainEvent[] {
    if (!this.componentId || !context.netlistManager.getComponent(this.componentId)) {
      return []
    }

    context.netlistManager.removeComponent(this.componentId)
    return [createEvent('component:removed', { id: this.componentId })]
  }
}

export class RemoveComponentCommand implements Command {
  readonly type = 'REMOVE_COMPONENT'
  readonly description: string
  readonly timestamp = Date.now()
  readonly sheetId: string

  private removedComponent?: ComponentData
  private removedWires: Wire[] = []

  constructor(
    private readonly componentId: string,
    sheetId = 'default',
    description?: string
  ) {
    this.sheetId = sheetId
    this.description = description ?? `Remove component ${componentId}`
  }

  execute(context: CommandContext): DomainEvent[] {
    const component = context.netlistManager.getComponent(this.componentId)
    if (!component) return []

    const netlist = getNetlist(context)
    this.removedComponent = componentToData(component)
    this.removedWires = Array.from(netlist.wires.values())
      .filter(
        (wire) =>
          isPinOnComponent(wire.from, this.componentId) ||
          isPinOnComponent(wire.to, this.componentId)
      )
      .map(cloneWire)

    context.netlistManager.removeComponent(this.componentId)
    return [createEvent('component:removed', { id: this.componentId })]
  }

  undo(context: CommandContext): DomainEvent[] {
    if (!this.removedComponent) return []

    context.netlistManager.addComponent(normalizeComponentData(this.removedComponent))

    const events: DomainEvent[] = [
      createEvent('component:added', { id: this.removedComponent.id, data: this.removedComponent })
    ]

    for (const wire of this.removedWires) {
      const netlist = getNetlist(context)
      const before = new Set(netlist.wires.keys())
      context.netlistManager.connectPins(wire.from, wire.to)
      const restoredWireId = findNewWireId(netlist, before)
      events.push(
        createEvent('wire:connected', {
          id: restoredWireId,
          from: wire.from,
          to: wire.to,
          net: wire.net
        })
      )
    }

    return events
  }
}

export class MoveComponentCommand implements Command {
  readonly type = 'MOVE_COMPONENT'
  readonly description: string
  readonly timestamp = Date.now()
  readonly sheetId: string

  private previousPosition?: Point

  constructor(
    private readonly componentId: string,
    private readonly position: Point,
    sheetId = 'default',
    description?: string
  ) {
    this.sheetId = sheetId
    this.description = description ?? `Move component ${componentId}`
  }

  execute(context: CommandContext): DomainEvent[] {
    const component = context.netlistManager.getComponent(this.componentId)
    if (!component) return []

    this.previousPosition = clonePoint(component.position)
    context.netlistManager.moveComponent(this.componentId, this.position)

    return [
      createEvent('component:moved', {
        id: this.componentId,
        from: this.previousPosition,
        to: this.position
      })
    ]
  }

  undo(context: CommandContext): DomainEvent[] {
    if (!this.previousPosition) return []

    const component = context.netlistManager.getComponent(this.componentId)
    if (!component) return []

    const currentPosition = clonePoint(component.position)
    context.netlistManager.moveComponent(this.componentId, this.previousPosition)

    return [
      createEvent('component:moved', {
        id: this.componentId,
        from: currentPosition,
        to: this.previousPosition
      })
    ]
  }
}

export class ConnectPinsCommand implements Command {
  readonly type = 'CONNECT_PINS'
  readonly description: string
  readonly timestamp = Date.now()
  readonly sheetId: string

  private createdWireId?: string

  constructor(
    private readonly from: PinRef,
    private readonly to: PinRef,
    sheetId = 'default',
    description?: string
  ) {
    this.sheetId = sheetId
    this.description = description ?? `Connect ${from} -> ${to}`
  }

  execute(context: CommandContext): DomainEvent[] {
    const netlist = getNetlist(context)
    const before = new Set(netlist.wires.keys())

    context.netlistManager.connectPins(this.from, this.to)
    this.createdWireId = findNewWireId(netlist, before)

    return [createEvent('wire:connected', { id: this.createdWireId, from: this.from, to: this.to })]
  }

  undo(context: CommandContext): DomainEvent[] {
    if (!this.createdWireId || !context.netlistManager.getWire(this.createdWireId)) {
      return []
    }

    context.netlistManager.disconnectWire(this.createdWireId)
    return [createEvent('wire:disconnected', { id: this.createdWireId })]
  }
}

export class DisconnectWireCommand implements Command {
  readonly type = 'DISCONNECT_WIRE'
  readonly description: string
  readonly timestamp = Date.now()
  readonly sheetId: string

  private removedWire?: Wire

  constructor(private readonly wireId: string, sheetId = 'default', description?: string) {
    this.sheetId = sheetId
    this.description = description ?? `Disconnect wire ${wireId}`
  }

  execute(context: CommandContext): DomainEvent[] {
    const wire = context.netlistManager.getWire(this.wireId)
    if (!wire) return []

    this.removedWire = cloneWire(wire)
    context.netlistManager.disconnectWire(this.wireId)
    return [
      createEvent('wire:disconnected', { id: this.wireId, from: wire.from, to: wire.to, net: wire.net })
    ]
  }

  undo(context: CommandContext): DomainEvent[] {
    if (!this.removedWire) return []

    const netlist = getNetlist(context)
    const before = new Set(netlist.wires.keys())
    context.netlistManager.connectPins(this.removedWire.from, this.removedWire.to)
    const restoredWireId = findNewWireId(netlist, before)

    return [
      createEvent('wire:connected', {
        id: restoredWireId,
        from: this.removedWire.from,
        to: this.removedWire.to,
        net: this.removedWire.net
      })
    ]
  }
}

export class UpdatePropertyCommand implements Command {
  readonly type = 'UPDATE_PROPERTY'
  readonly description: string
  readonly timestamp = Date.now()
  readonly sheetId: string

  private previousValue: any
  private hadPreviousValue = false

  constructor(
    private readonly componentId: string,
    private readonly key: string,
    private readonly value: any,
    sheetId = 'default',
    description?: string
  ) {
    this.sheetId = sheetId
    this.description = description ?? `Update property ${componentId}.${key}`
  }

  execute(context: CommandContext): DomainEvent[] {
    const component = context.netlistManager.getComponent(this.componentId)
    if (!component) return []

    this.hadPreviousValue = Object.prototype.hasOwnProperty.call(component.properties, this.key)
    this.previousValue = component.properties[this.key]

    context.netlistManager.updateComponentProperty(this.componentId, this.key, this.value)
    return [
      createEvent('property:updated', {
        id: this.componentId,
        key: this.key,
        value: this.value,
        previousValue: this.previousValue
      })
    ]
  }

  undo(context: CommandContext): DomainEvent[] {
    const component = context.netlistManager.getComponent(this.componentId)
    if (!component) return []

    const restoreValue = this.hadPreviousValue ? this.previousValue : undefined
    context.netlistManager.updateComponentProperty(this.componentId, this.key, restoreValue)
    return [
      createEvent('property:updated', {
        id: this.componentId,
        key: this.key,
        value: restoreValue,
        previousValue: this.value
      })
    ]
  }
}

export class BatchCommand implements Command {
  readonly type = 'BATCH'
  readonly description: string
  readonly timestamp = Date.now()
  readonly sheetId: string

  constructor(
    private readonly commands: Command[],
    description = 'Batch command',
    sheetId?: string
  ) {
    this.description = description
    this.sheetId = sheetId ?? this.commands[0]?.sheetId ?? 'default'
  }

  execute(context: CommandContext): DomainEvent[] {
    const events: DomainEvent[] = []
    for (const command of this.commands) {
      events.push(...command.execute(context))
    }
    return events
  }

  undo(context: CommandContext): DomainEvent[] {
    const events: DomainEvent[] = []
    for (let index = this.commands.length - 1; index >= 0; index--) {
      events.push(...this.commands[index].undo(context))
    }
    return events
  }
}
