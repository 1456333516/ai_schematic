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
    router: {
      name: 'manhattan',
      args: {
        padding: { left: 30, top: 30, right: 30, bottom: 30 },
        step: 10,
        excludeTerminals: ['source', 'target']
      }
    },
    connector: { name: 'rounded', args: { radius: 4 } }
  }, true)
}

const TERM_PORT_ATTRS = {
  circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1.5, fill: '#fff' }
}

function registerInductor() {
  Graph.registerNode('schematic-inductor', {
    inherit: 'rect',
    width: 80, height: 30,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'path', selector: 'coil' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      coil: { d: 'M 0,15 L 10,15 A 10,10 0 0 0 30,15 A 10,10 0 0 0 50,15 A 10,10 0 0 0 70,15 L 80,15', fill: 'none', stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'L?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 },
      valueLabel: { text: '', fill: '#000000', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'top', refX: 0.5, refY: '100%', refDy: 4 }
    },
    ports: { ...LEFT_RIGHT_PORTS, items: [{ group: 'left', id: 'L' }, { group: 'right', id: 'R' }] }
  }, true)
}

function registerFuse() {
  Graph.registerNode('schematic-fuse', {
    inherit: 'rect',
    width: 80, height: 30,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'rect', selector: 'fuse' },
      { tagName: 'line', selector: 'lead1' },
      { tagName: 'line', selector: 'lead2' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      fuse: { x: 20, y: 8, width: 40, height: 14, fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead1: { x1: 0, y1: 15, x2: 20, y2: 15, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead2: { x1: 60, y1: 15, x2: 80, y2: 15, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'F?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 },
      valueLabel: { text: '', fill: '#000000', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'top', refX: 0.5, refY: '100%', refDy: 4 }
    },
    ports: { ...LEFT_RIGHT_PORTS, items: [{ group: 'left', id: 'L' }, { group: 'right', id: 'R' }] }
  }, true)
}

function registerZener() {
  Graph.registerNode('schematic-zener', {
    inherit: 'rect',
    width: 60, height: 40,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'polygon', selector: 'triangle' },
      { tagName: 'line', selector: 'bar' },
      { tagName: 'line', selector: 'zener1' },
      { tagName: 'line', selector: 'zener2' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      triangle: { points: '18,4 18,36 42,20', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      bar: { x1: 42, y1: 4, x2: 42, y2: 36, stroke: '#4B8B3B', strokeWidth: 1.5 },
      zener1: { x1: 42, y1: 4, x2: 36, y2: 0, stroke: '#4B8B3B', strokeWidth: 1.5 },
      zener2: { x1: 42, y1: 36, x2: 48, y2: 40, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'Z?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 },
      valueLabel: { text: '', fill: '#000000', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'top', refX: 0.5, refY: '100%', refDy: 4 }
    },
    ports: { ...LEFT_RIGHT_PORTS, items: [{ group: 'left', id: 'A' }, { group: 'right', id: 'K' }] }
  }, true)
}

function registerSchottky() {
  Graph.registerNode('schematic-schottky', {
    inherit: 'rect',
    width: 60, height: 40,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'polygon', selector: 'triangle' },
      { tagName: 'line', selector: 'bar' },
      { tagName: 'line', selector: 's1a' },
      { tagName: 'line', selector: 's1b' },
      { tagName: 'line', selector: 's2a' },
      { tagName: 'line', selector: 's2b' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      triangle: { points: '18,4 18,36 42,20', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      bar: { x1: 42, y1: 8, x2: 42, y2: 32, stroke: '#4B8B3B', strokeWidth: 1.5 },
      s1a: { x1: 42, y1: 8, x2: 38, y2: 8, stroke: '#4B8B3B', strokeWidth: 1.5 },
      s1b: { x1: 38, y1: 8, x2: 38, y2: 4, stroke: '#4B8B3B', strokeWidth: 1.5 },
      s2a: { x1: 42, y1: 32, x2: 46, y2: 32, stroke: '#4B8B3B', strokeWidth: 1.5 },
      s2b: { x1: 46, y1: 32, x2: 46, y2: 36, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'D?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 },
      valueLabel: { text: '', fill: '#000000', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'top', refX: 0.5, refY: '100%', refDy: 4 }
    },
    ports: { ...LEFT_RIGHT_PORTS, items: [{ group: 'left', id: 'A' }, { group: 'right', id: 'K' }] }
  }, true)
}

function registerNPN() {
  Graph.registerNode('schematic-npn', {
    inherit: 'rect',
    width: 80, height: 60,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'line', selector: 'body_line' },
      { tagName: 'line', selector: 'base_line' },
      { tagName: 'line', selector: 'collector' },
      { tagName: 'line', selector: 'emitter' },
      { tagName: 'polygon', selector: 'arrow' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      body_line: { x1: 40, y1: 15, x2: 40, y2: 45, stroke: '#4B8B3B', strokeWidth: 1.5 },
      base_line: { x1: 0, y1: 30, x2: 40, y2: 30, stroke: '#4B8B3B', strokeWidth: 1.5 },
      collector: { x1: 40, y1: 18, x2: 80, y2: 5, stroke: '#4B8B3B', strokeWidth: 1.5 },
      emitter: { x1: 40, y1: 42, x2: 80, y2: 55, stroke: '#4B8B3B', strokeWidth: 1.5 },
      arrow: { points: '76,54 68,51 72,59', fill: '#4B8B3B', stroke: '#4B8B3B', strokeWidth: 1 },
      refDes: { text: 'Q?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        b: { position: 'left', attrs: TERM_PORT_ATTRS },
        c: { position: { name: 'absolute', args: { x: 80, y: 5 } }, attrs: TERM_PORT_ATTRS },
        e: { position: { name: 'absolute', args: { x: 80, y: 55 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'b', id: 'B' }, { group: 'c', id: 'C' }, { group: 'e', id: 'E' }]
    }
  }, true)
}

function registerPNP() {
  Graph.registerNode('schematic-pnp', {
    inherit: 'rect',
    width: 80, height: 60,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'line', selector: 'body_line' },
      { tagName: 'line', selector: 'base_line' },
      { tagName: 'line', selector: 'collector' },
      { tagName: 'line', selector: 'emitter' },
      { tagName: 'polygon', selector: 'arrow' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      body_line: { x1: 40, y1: 15, x2: 40, y2: 45, stroke: '#4B8B3B', strokeWidth: 1.5 },
      base_line: { x1: 0, y1: 30, x2: 40, y2: 30, stroke: '#4B8B3B', strokeWidth: 1.5 },
      collector: { x1: 40, y1: 18, x2: 80, y2: 5, stroke: '#4B8B3B', strokeWidth: 1.5 },
      emitter: { x1: 40, y1: 42, x2: 80, y2: 55, stroke: '#4B8B3B', strokeWidth: 1.5 },
      arrow: { points: '44,43 50,40 50,46', fill: '#4B8B3B', stroke: '#4B8B3B', strokeWidth: 1 },
      refDes: { text: 'Q?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        b: { position: 'left', attrs: TERM_PORT_ATTRS },
        c: { position: { name: 'absolute', args: { x: 80, y: 5 } }, attrs: TERM_PORT_ATTRS },
        e: { position: { name: 'absolute', args: { x: 80, y: 55 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'b', id: 'B' }, { group: 'c', id: 'C' }, { group: 'e', id: 'E' }]
    }
  }, true)
}

function registerNMOS() {
  Graph.registerNode('schematic-nmos', {
    inherit: 'rect',
    width: 80, height: 60,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'line', selector: 'gate_lead' },
      { tagName: 'line', selector: 'gate_bar' },
      { tagName: 'line', selector: 'ch_top' },
      { tagName: 'line', selector: 'ch_bot' },
      { tagName: 'line', selector: 'drain_arm' },
      { tagName: 'line', selector: 'source_arm' },
      { tagName: 'line', selector: 'drain_horiz' },
      { tagName: 'line', selector: 'source_horiz' },
      { tagName: 'polygon', selector: 'arrow' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      gate_lead: { x1: 0, y1: 30, x2: 28, y2: 30, stroke: '#4B8B3B', strokeWidth: 1.5 },
      gate_bar: { x1: 28, y1: 12, x2: 28, y2: 48, stroke: '#4B8B3B', strokeWidth: 2 },
      ch_top: { x1: 34, y1: 12, x2: 34, y2: 30, stroke: '#4B8B3B', strokeWidth: 1.5 },
      ch_bot: { x1: 34, y1: 30, x2: 34, y2: 48, stroke: '#4B8B3B', strokeWidth: 1.5 },
      drain_horiz: { x1: 34, y1: 12, x2: 48, y2: 12, stroke: '#4B8B3B', strokeWidth: 1.5 },
      source_horiz: { x1: 34, y1: 48, x2: 48, y2: 48, stroke: '#4B8B3B', strokeWidth: 1.5 },
      drain_arm: { x1: 48, y1: 12, x2: 80, y2: 5, stroke: '#4B8B3B', strokeWidth: 1.5 },
      source_arm: { x1: 48, y1: 48, x2: 80, y2: 55, stroke: '#4B8B3B', strokeWidth: 1.5 },
      arrow: { points: '28,30 34,26 34,34', fill: '#4B8B3B', stroke: '#4B8B3B', strokeWidth: 1 },
      refDes: { text: 'M?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        g: { position: 'left', attrs: TERM_PORT_ATTRS },
        d: { position: { name: 'absolute', args: { x: 80, y: 5 } }, attrs: TERM_PORT_ATTRS },
        s: { position: { name: 'absolute', args: { x: 80, y: 55 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'g', id: 'G' }, { group: 'd', id: 'D' }, { group: 's', id: 'S' }]
    }
  }, true)
}

function registerPMOS() {
  Graph.registerNode('schematic-pmos', {
    inherit: 'rect',
    width: 80, height: 60,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'line', selector: 'gate_lead' },
      { tagName: 'line', selector: 'gate_bar' },
      { tagName: 'line', selector: 'ch_top' },
      { tagName: 'line', selector: 'ch_bot' },
      { tagName: 'line', selector: 'drain_arm' },
      { tagName: 'line', selector: 'source_arm' },
      { tagName: 'line', selector: 'drain_horiz' },
      { tagName: 'line', selector: 'source_horiz' },
      { tagName: 'polygon', selector: 'arrow' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      gate_lead: { x1: 0, y1: 30, x2: 28, y2: 30, stroke: '#4B8B3B', strokeWidth: 1.5 },
      gate_bar: { x1: 28, y1: 12, x2: 28, y2: 48, stroke: '#4B8B3B', strokeWidth: 2 },
      ch_top: { x1: 34, y1: 12, x2: 34, y2: 30, stroke: '#4B8B3B', strokeWidth: 1.5 },
      ch_bot: { x1: 34, y1: 30, x2: 34, y2: 48, stroke: '#4B8B3B', strokeWidth: 1.5 },
      drain_horiz: { x1: 34, y1: 12, x2: 48, y2: 12, stroke: '#4B8B3B', strokeWidth: 1.5 },
      source_horiz: { x1: 34, y1: 48, x2: 48, y2: 48, stroke: '#4B8B3B', strokeWidth: 1.5 },
      drain_arm: { x1: 48, y1: 12, x2: 80, y2: 5, stroke: '#4B8B3B', strokeWidth: 1.5 },
      source_arm: { x1: 48, y1: 48, x2: 80, y2: 55, stroke: '#4B8B3B', strokeWidth: 1.5 },
      arrow: { points: '34,30 28,26 28,34', fill: '#4B8B3B', stroke: '#4B8B3B', strokeWidth: 1 },
      refDes: { text: 'M?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        g: { position: 'left', attrs: TERM_PORT_ATTRS },
        d: { position: { name: 'absolute', args: { x: 80, y: 5 } }, attrs: TERM_PORT_ATTRS },
        s: { position: { name: 'absolute', args: { x: 80, y: 55 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'g', id: 'G' }, { group: 'd', id: 'D' }, { group: 's', id: 'S' }]
    }
  }, true)
}

function registerOpAmp() {
  Graph.registerNode('schematic-opamp', {
    inherit: 'rect',
    width: 80, height: 60,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'polygon', selector: 'triangle' },
      { tagName: 'text', selector: 'plus' },
      { tagName: 'text', selector: 'minus' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      triangle: { points: '10,5 10,55 70,30', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      plus: { text: '+', fill: '#000', fontSize: 10, x: 14, y: 23 },
      minus: { text: '−', fill: '#000', fontSize: 12, x: 14, y: 42 },
      refDes: { text: 'U?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        inp: { position: { name: 'absolute', args: { x: 0, y: 20 } }, attrs: TERM_PORT_ATTRS },
        inn: { position: { name: 'absolute', args: { x: 0, y: 40 } }, attrs: TERM_PORT_ATTRS },
        vp: { position: { name: 'absolute', args: { x: 40, y: 0 } }, attrs: TERM_PORT_ATTRS },
        vn: { position: { name: 'absolute', args: { x: 40, y: 60 } }, attrs: TERM_PORT_ATTRS },
        out: { position: { name: 'absolute', args: { x: 80, y: 30 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [
        { group: 'inp', id: 'IN+' },
        { group: 'inn', id: 'IN-' },
        { group: 'vp', id: 'V+' },
        { group: 'vn', id: 'V-' },
        { group: 'out', id: 'OUT' }
      ]
    }
  }, true)
}

function registerGateAnd() {
  Graph.registerNode('schematic-gate-and', {
    inherit: 'rect',
    width: 70, height: 50,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'path', selector: 'gate' },
      { tagName: 'line', selector: 'lead_a' },
      { tagName: 'line', selector: 'lead_b' },
      { tagName: 'line', selector: 'lead_y' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      gate: { d: 'M 15,5 L 15,45 C 55,45 55,5 15,5 Z', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_a: { x1: 0, y1: 15, x2: 15, y2: 15, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_b: { x1: 0, y1: 35, x2: 15, y2: 35, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_y: { x1: 55, y1: 25, x2: 70, y2: 25, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'U?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        a: { position: { name: 'absolute', args: { x: 0, y: 15 } }, attrs: TERM_PORT_ATTRS },
        b: { position: { name: 'absolute', args: { x: 0, y: 35 } }, attrs: TERM_PORT_ATTRS },
        y: { position: { name: 'absolute', args: { x: 70, y: 25 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'a', id: 'A' }, { group: 'b', id: 'B' }, { group: 'y', id: 'Y' }]
    }
  }, true)
}

function registerGateOr() {
  Graph.registerNode('schematic-gate-or', {
    inherit: 'rect',
    width: 70, height: 50,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'path', selector: 'gate' },
      { tagName: 'line', selector: 'lead_a' },
      { tagName: 'line', selector: 'lead_b' },
      { tagName: 'line', selector: 'lead_y' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      gate: { d: 'M 12,5 Q 22,25 12,45 Q 40,50 62,25 Q 40,0 12,5 Z', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_a: { x1: 0, y1: 15, x2: 14, y2: 15, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_b: { x1: 0, y1: 35, x2: 14, y2: 35, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_y: { x1: 62, y1: 25, x2: 70, y2: 25, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'U?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        a: { position: { name: 'absolute', args: { x: 0, y: 15 } }, attrs: TERM_PORT_ATTRS },
        b: { position: { name: 'absolute', args: { x: 0, y: 35 } }, attrs: TERM_PORT_ATTRS },
        y: { position: { name: 'absolute', args: { x: 70, y: 25 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'a', id: 'A' }, { group: 'b', id: 'B' }, { group: 'y', id: 'Y' }]
    }
  }, true)
}

function registerGateNot() {
  Graph.registerNode('schematic-gate-not', {
    inherit: 'rect',
    width: 60, height: 50,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'polygon', selector: 'triangle' },
      { tagName: 'circle', selector: 'bubble' },
      { tagName: 'line', selector: 'lead_a' },
      { tagName: 'line', selector: 'lead_y' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      triangle: { points: '10,5 10,45 48,25', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      bubble: { cx: 52, cy: 25, r: 4, fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_a: { x1: 0, y1: 25, x2: 10, y2: 25, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_y: { x1: 56, y1: 25, x2: 60, y2: 25, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'U?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        a: { position: { name: 'absolute', args: { x: 0, y: 25 } }, attrs: TERM_PORT_ATTRS },
        y: { position: { name: 'absolute', args: { x: 60, y: 25 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'a', id: 'A' }, { group: 'y', id: 'Y' }]
    }
  }, true)
}

function registerGateNand() {
  Graph.registerNode('schematic-gate-nand', {
    inherit: 'rect',
    width: 74, height: 50,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'path', selector: 'gate' },
      { tagName: 'circle', selector: 'bubble' },
      { tagName: 'line', selector: 'lead_a' },
      { tagName: 'line', selector: 'lead_b' },
      { tagName: 'line', selector: 'lead_y' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      gate: { d: 'M 15,5 L 15,45 C 55,45 55,5 15,5 Z', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      bubble: { cx: 59, cy: 25, r: 4, fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_a: { x1: 0, y1: 15, x2: 15, y2: 15, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_b: { x1: 0, y1: 35, x2: 15, y2: 35, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_y: { x1: 63, y1: 25, x2: 74, y2: 25, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'U?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        a: { position: { name: 'absolute', args: { x: 0, y: 15 } }, attrs: TERM_PORT_ATTRS },
        b: { position: { name: 'absolute', args: { x: 0, y: 35 } }, attrs: TERM_PORT_ATTRS },
        y: { position: { name: 'absolute', args: { x: 74, y: 25 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'a', id: 'A' }, { group: 'b', id: 'B' }, { group: 'y', id: 'Y' }]
    }
  }, true)
}

function registerGateNor() {
  Graph.registerNode('schematic-gate-nor', {
    inherit: 'rect',
    width: 74, height: 50,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'path', selector: 'gate' },
      { tagName: 'circle', selector: 'bubble' },
      { tagName: 'line', selector: 'lead_a' },
      { tagName: 'line', selector: 'lead_b' },
      { tagName: 'line', selector: 'lead_y' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      gate: { d: 'M 12,5 Q 22,25 12,45 Q 40,50 62,25 Q 40,0 12,5 Z', fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      bubble: { cx: 66, cy: 25, r: 4, fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_a: { x1: 0, y1: 15, x2: 14, y2: 15, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_b: { x1: 0, y1: 35, x2: 14, y2: 35, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_y: { x1: 70, y1: 25, x2: 74, y2: 25, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'U?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        a: { position: { name: 'absolute', args: { x: 0, y: 15 } }, attrs: TERM_PORT_ATTRS },
        b: { position: { name: 'absolute', args: { x: 0, y: 35 } }, attrs: TERM_PORT_ATTRS },
        y: { position: { name: 'absolute', args: { x: 74, y: 25 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'a', id: 'A' }, { group: 'b', id: 'B' }, { group: 'y', id: 'Y' }]
    }
  }, true)
}

function registerCrystal() {
  Graph.registerNode('schematic-crystal', {
    inherit: 'rect',
    width: 80, height: 40,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'line', selector: 'lead1' },
      { tagName: 'line', selector: 'plate1' },
      { tagName: 'rect', selector: 'crystal' },
      { tagName: 'line', selector: 'plate2' },
      { tagName: 'line', selector: 'lead2' },
      { tagName: 'text', selector: 'refDes' },
      { tagName: 'text', selector: 'valueLabel' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      lead1: { x1: 0, y1: 20, x2: 20, y2: 20, stroke: '#4B8B3B', strokeWidth: 1.5 },
      plate1: { x1: 20, y1: 8, x2: 20, y2: 32, stroke: '#4B8B3B', strokeWidth: 2 },
      crystal: { x: 24, y: 8, width: 32, height: 24, fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      plate2: { x1: 56, y1: 8, x2: 56, y2: 32, stroke: '#4B8B3B', strokeWidth: 2 },
      lead2: { x1: 56, y1: 20, x2: 80, y2: 20, stroke: '#4B8B3B', strokeWidth: 1.5 },
      refDes: { text: 'Y?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 },
      valueLabel: { text: '', fill: '#000000', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'top', refX: 0.5, refY: '100%', refDy: 4 }
    },
    ports: { ...LEFT_RIGHT_PORTS, items: [{ group: 'left', id: 'P1' }, { group: 'right', id: 'P2' }] }
  }, true)
}

function registerBuzzer() {
  Graph.registerNode('schematic-buzzer', {
    inherit: 'rect',
    width: 70, height: 50,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'circle', selector: 'ring' },
      { tagName: 'line', selector: 'lead_p' },
      { tagName: 'line', selector: 'lead_n' },
      { tagName: 'text', selector: 'plus' },
      { tagName: 'text', selector: 'minus' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      ring: { cx: 35, cy: 25, r: 22, fill: 'transparent', stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_p: { x1: 0, y1: 25, x2: 13, y2: 25, stroke: '#4B8B3B', strokeWidth: 1.5 },
      lead_n: { x1: 57, y1: 25, x2: 70, y2: 25, stroke: '#4B8B3B', strokeWidth: 1.5 },
      plus:  { text: '+', fill: '#000', fontSize: 11, fontWeight: 'bold', x: 16, y: 22 },
      minus: { text: '−', fill: '#000', fontSize: 13, x: 47, y: 22 },
      refDes: { text: 'BZ?', fill: '#0000FF', fontSize: 10, textAnchor: 'middle', textVerticalAnchor: 'bottom', refX: 0.5, refY: -4 }
    },
    ports: {
      groups: {
        p: { position: { name: 'absolute', args: { x: 0, y: 25 } }, attrs: TERM_PORT_ATTRS },
        n: { position: { name: 'absolute', args: { x: 70, y: 25 } }, attrs: TERM_PORT_ATTRS }
      },
      items: [{ group: 'p', id: 'P' }, { group: 'n', id: 'N' }]
    }
  }, true)
}

function registerNetPort() {
  Graph.registerNode('schematic-net-port', {
    inherit: 'rect',
    width: 70,
    height: 24,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'polygon', selector: 'flag' },
      { tagName: 'text', selector: 'refDes' }
    ],
    attrs: {
      body: { fill: 'transparent', stroke: 'transparent' },
      flag: {
        points: '0,2 52,2 68,12 52,22 0,22',
        fill: '#FFF8E1',
        stroke: '#B71C1C',
        strokeWidth: 1.5
      },
      refDes: {
        text: 'IO', fill: '#B71C1C', fontSize: 10, fontWeight: 'bold',
        textAnchor: 'middle', textVerticalAnchor: 'middle',
        x: 30, y: 12
      }
    },
    ports: {
      groups: {
        right: {
          position: { name: 'absolute', args: { x: 70, y: 12 } },
          attrs: TERM_PORT_ATTRS
        }
      },
      items: [{ group: 'right', id: 'P' }]
    }
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
  { name: 'wire', fn: registerWireEdge },
  { name: 'inductor', fn: registerInductor },
  { name: 'fuse', fn: registerFuse },
  { name: 'zener', fn: registerZener },
  { name: 'schottky', fn: registerSchottky },
  { name: 'npn', fn: registerNPN },
  { name: 'pnp', fn: registerPNP },
  { name: 'nmos', fn: registerNMOS },
  { name: 'pmos', fn: registerPMOS },
  { name: 'opamp', fn: registerOpAmp },
  { name: 'gate-and', fn: registerGateAnd },
  { name: 'gate-or', fn: registerGateOr },
  { name: 'gate-not', fn: registerGateNot },
  { name: 'gate-nand', fn: registerGateNand },
  { name: 'gate-nor', fn: registerGateNor },
  { name: 'crystal', fn: registerCrystal },
  { name: 'buzzer', fn: registerBuzzer },
  { name: 'net-port', fn: registerNetPort }
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
