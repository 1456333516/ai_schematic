import { create } from 'zustand'

export interface CanvasState {
  zoom: number
  cursorX: number
  cursorY: number
  gridVisible: boolean
  activeTool: 'select' | 'pan' | 'boxSelect'
  selectedNodeIds: string[]
  nodeCount: number
  refDesCounters: Record<string, number>

  setZoom: (zoom: number) => void
  setCursor: (x: number, y: number) => void
  toggleGrid: () => void
  setActiveTool: (tool: CanvasState['activeTool']) => void
  setSelectedNodes: (ids: string[]) => void
  setNodeCount: (count: number) => void
  incrementNodeCount: () => void
  decrementNodeCount: () => void
  getNextRefDes: (prefix: string) => string
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  zoom: 1,
  cursorX: 0,
  cursorY: 0,
  gridVisible: true,
  activeTool: 'select',
  selectedNodeIds: [],
  nodeCount: 0,
  refDesCounters: {},

  setZoom: (zoom) => set({ zoom }),
  setCursor: (x, y) => set({ cursorX: x, cursorY: y }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),
  setNodeCount: (count) => set({ nodeCount: count }),
  incrementNodeCount: () => set((s) => ({ nodeCount: s.nodeCount + 1 })),
  decrementNodeCount: () => set((s) => ({ nodeCount: Math.max(0, s.nodeCount - 1) })),
  getNextRefDes: (prefix) => {
    const counters = { ...get().refDesCounters }
    const next = (counters[prefix] ?? 0) + 1
    counters[prefix] = next
    set({ refDesCounters: counters })
    return `${prefix}${next}`
  }
}))
