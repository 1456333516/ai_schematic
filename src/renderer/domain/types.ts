export interface Point {
  x: number
  y: number
}

export interface Pin {
  id: string
  name: string
  type: 'input' | 'output' | 'bidirectional' | 'power' | 'ground'
  position: Point
}

export interface ComponentProperties {
  value?: string
  package?: string
  [key: string]: any
}

export interface Component {
  id: string
  type: string
  category: string
  properties: ComponentProperties
  pins: Pin[]
  position: Point
}

export type PinRef = string

export interface Wire {
  id: string
  from: PinRef
  to: PinRef
  net: string
  points: Point[]
}

export interface Net {
  name: string
  type: 'signal' | 'power' | 'ground'
  pins: PinRef[]
}

export interface Netlist {
  components: Map<string, Component>
  wires: Map<string, Wire>
  nets: Map<string, Net>
}

export interface ComponentData {
  id?: string
  type: string
  category: string
  properties?: ComponentProperties
  pins?: Pin[]
  position?: Point
}
