import { Graph } from '@antv/x6'
import { logger } from '@shared/utils/logger'

const PORT_ATTRS = {
  circle: {
    r: 4,
    magnet: true,
    stroke: '#5F95FF',
    strokeWidth: 1.5,
    fill: '#fff'
  }
}

const LEFT_RIGHT_PORTS = {
  groups: {
    left: {
      position: 'left',
      attrs: PORT_ATTRS
    },
    right: {
      position: 'right',
      attrs: PORT_ATTRS
    }
  }
}

function registerResistor() {
  Graph.registerNode('schematic-resistor', {
    inherit: 'rect',
    width: 80,
    height: 30,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: {
        fill: 'transparent',
        stroke: '#4B8B3B',
        strokeWidth: 1.5,
        rx: 0,
        ry: 0
      },
      refDes: {
        text: 'R?',
        fill: '#0000FF',
        fontSize: 10,
        textAnchor: 'middle',
        textVerticalAnchor: 'bottom',
        refX: 0.5,
        refY: -4
      },
      valueLabel: {
        text: '',
        fill: '#000000',
        fontSize: 10,
        textAnchor: 'middle',
        textVerticalAnchor: 'top',
        refX: 0.5,
        refY: '100%',
        refDy: 4
      }
    },
    ports: {
      ...LEFT_RIGHT_PORTS,
      items: [
        { group: 'left', id: 'L' },
        { group: 'right', id: 'R' }
      ]
    }
  }, true)
}

function registerCapacitor() {
  Graph.registerNode('schematic-capacitor', {
    inherit: 'rect',
    width: 60,
    height: 30,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'line', selector: 'plate1' },
      { tagName: 'line', selector: 'plate2' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent', width: 60, height: 30 },
      plate1: { x1: 25, y1: 2, x2: 25, y2: 28, stroke: '#4B8B3B', strokeWidth: 2 },
      plate2: { x1: 35, y1: 2, x2: 35, y2: 28, stroke: '#4B8B3B', strokeWidth: 2 },
      refDes: {
        text: 'C?', fill: '#0000FF', fontSize: 10,
        textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4
      },
      valueLabel: {
        text: '', fill: '#000000', fontSize: 10,
        textAnchor: 'middle', textVerticalAnchor: 'top', refX: 0.5, refY: '100%', refDy: 4
      }
    },
    ports: {
      ...LEFT_RIGHT_PORTS,
      items: [
        { group: 'left', id: 'L' },
        { group: 'right', id: 'R' }
      ]
    }
  }, true)
}

function registerDiode() {
  Graph.registerNode('schematic-diode', {
    inherit: 'rect',
    width: 60,
    height: 40,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'polygon', selector: 'triangle' },
      { tagName: 'line', selector: 'bar' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent', width: 60, height: 40 },
      triangle: { points: '18,4 18,36 42,20', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      bar: { x1: 42, y1: 4, x2: 42, y2: 36, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: {
        text: 'D?', fill: '#0000FF', fontSize: 10,
        textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4
      },
      valueLabel: {
        text: '', fill: '#000000', fontSize: 10,
        textAnchor: 'middle', textVerticalAnchor: 'top', refX: 0.5, refY: '100%', refDy: 4
      }
    },
    ports: {
      ...LEFT_RIGHT_PORTS,
      items: [
        { group: 'left', id: 'A', attrs: { text: { text: 'A' } } },
        { group: 'right', id: 'K', attrs: { text: { text: 'K' } } }
      ]
    }
  }, true)
}

function registerLED() {
  Graph.registerNode('schematic-led', {
    inherit: 'rect',
    width: 60,
    height: 40,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'polygon', selector: 'triangle' },
      { tagName: 'line', selector: 'bar' },
      { tagName: 'line', selector: 'arrow1' },
      { tagName: 'line', selector: 'arrow2' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent', width: 60, height: 40 },
      triangle: { points: '18,4 18,36 42,20', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      bar: { x1: 42, y1: 4, x2: 42, y2: 36, stroke: '#4B8B3B', strokeWidth: 1.5 },
      arrow1: { x1: 36, y1: 4, x2: 48, y2: -4, stroke: '#4B8B3B', strokeWidth: 1, markerEnd: 'url(#led-arrow)' },
      arrow2: { x1: 40, y1: 8, x2: 52, y2: 0, stroke: '#4B8B3B', strokeWidth: 1, markerEnd: 'url(#led-arrow)' },
      refDes: {
        text: 'LED?', fill: '#0000FF', fontSize: 10,
        textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4
      },
      valueLabel: {
        text: '', fill: '#000000', fontSize: 10,
        textAnchor: 'middle', textVerticalAnchor: 'top', refX: 0.5, refY: '100%', refDy: 4
      }
    },
    ports: {
      ...LEFT_RIGHT_PORTS,
      items: [
        { group: 'left', id: 'A' },
        { group: 'right', id: 'K' }
      ]
    }
  }, true)
}

function registerIC() {
  Graph.registerNode('schematic-ic', {
    inherit: 'rect',
    width: 120,
    height: 80,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: {
        fill: '#FFFFFF',
        stroke: '#4B8B3B',
        strokeWidth: 1.5
      },
      refDes: {
        text: 'U?', fill: '#0000FF', fontSize: 10,
        textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4
      },
      valueLabel: {
        text: '', fill: '#000000', fontSize: 10,
        textAnchor: 'middle', textVerticalAnchor: 'middle', refX: 0.5, refY: 0.5
      }
    },
    ports: {
      groups: {
        left: { position: 'left', attrs: PORT_ATTRS },
        right: { position: 'right', attrs: PORT_ATTRS }
      }
    }
  }, true)
}

function registerVCC() {
  Graph.registerNode('schematic-vcc', {
    inherit: 'rect',
    width: 30,
    height: 20,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'line', selector: 'stem' },
      { tagName: 'polygon', selector: 'arrow' },
      { tagName: 'text', selector: 'label' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent', width: 30, height: 20 },
      stem: { x1: 15, y1: 20, x2: 15, y2: 8, stroke: '#FF0000', strokeWidth: 1.5 },
      arrow: { points: '10,8 15,0 20,8', fill: '#FF0000', stroke: '#FF0000', strokeWidth: 1 },
      label: {
        text: 'VCC', fill: '#FF0000', fontSize: 9, fontWeight: 'bold',
        textAnchor: 'start', x: 22, y: 6
      }
    },
    ports: {
      groups: {
        bottom: {
          position: 'bottom',
          attrs: PORT_ATTRS
        }
      },
      items: [{ group: 'bottom', id: 'P' }]
    }
  }, true)
}

function registerGND() {
  Graph.registerNode('schematic-gnd', {
    inherit: 'rect',
    width: 30,
    height: 20,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'line', selector: 'stem' },
      { tagName: 'line', selector: 'line1' },
      { tagName: 'line', selector: 'line2' },
      { tagName: 'line', selector: 'line3' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent', width: 30, height: 20 },
      stem: { x1: 15, y1: 0, x2: 15, y2: 8, stroke: '#000', strokeWidth: 1.5 },
      line1: { x1: 5, y1: 8, x2: 25, y2: 8, stroke: '#000', strokeWidth: 1.5 },
      line2: { x1: 8, y1: 12, x2: 22, y2: 12, stroke: '#000', strokeWidth: 1.5 },
      line3: { x1: 11, y1: 16, x2: 19, y2: 16, stroke: '#000', strokeWidth: 1.5 }
    },
    ports: {
      groups: {
        top: {
          position: 'top',
          attrs: PORT_ATTRS
        }
      },
      items: [{ group: 'top', id: 'P' }]
    }
  }, true)
}

function registerWireEdge() {
  Graph.registerEdge('schematic-wire', {
    inherit: 'edge',
    attrs: {
      line: {
        stroke: '#4B8B3B',
        strokeWidth: 1.5,
        targetMarker: null,
        sourceMarker: null
      }
    },
    router: { name: 'manhattan' },
    connector: { name: 'rounded', args: { radius: 2 } }
  }, true)
}

const registrations = [
  { name: 'resistor', fn: registerResistor },
  { name: 'capacitor', fn: registerCapacitor },
  { name: 'diode', fn: registerDiode },
  { name: 'led', fn: registerLED },
  { name: 'ic', fn: registerIC },
  { name: 'vcc', fn: registerVCC },
  { name: 'gnd', fn: registerGND },
  { name: 'wire', fn: registerWireEdge }
]

export function registerAllShapes(): void {
  for (const { name, fn } of registrations) {
    try {
      fn()
    } catch (e) {
      logger.error('Shapes', `Failed to register shape: ${name}`, e)
    }
  }
  logger.debug('Shapes', `Registered ${registrations.length} shapes`)
}

export function createICNode(pinCount: number) {
  const clamped = Math.min(40, Math.max(4, pinCount))
  const height = Math.max(80, clamped * 20)
  const leftCount = Math.ceil(clamped / 2)
  const rightCount = clamped - leftCount
  const leftPorts = Array.from({ length: leftCount }, (_, i) => ({
    group: 'left' as const,
    id: `P${i + 1}`,
    attrs: { text: { text: `P${i + 1}` } }
  }))
  const rightPorts = Array.from({ length: rightCount }, (_, i) => ({
    group: 'right' as const,
    id: `P${leftCount + i + 1}`,
    attrs: { text: { text: `P${leftCount + i + 1}` } }
  }))
  return {
    shape: 'schematic-ic' as const,
    width: 120,
    height,
    ports: { items: [...leftPorts, ...rightPorts] }
  }
}
