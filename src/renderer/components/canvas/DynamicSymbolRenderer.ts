import { createICNode } from '../shapes/registerShapes'

export interface NodeConfig {
  shape: string
  width: number
  height: number
  ports: { items: Array<{ group: string; id: string; attrs: object }> }
}

export function createDynamicNode(pinCount: number, label: string): NodeConfig & { attrs: object; data: object } {
  const ic = createICNode(pinCount)
  return {
    ...ic,
    attrs: { valueLabel: { text: label } },
    data: { label, category: 'dynamic' }
  }
}
