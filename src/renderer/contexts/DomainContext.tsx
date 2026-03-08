import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Graph } from '@antv/x6'
import { NetlistManager } from '../domain/NetlistManager'
import { CommandBus } from '../commands/CommandBus'
import { EventBus } from '../commands/EventBus'
import { GraphSyncer } from '../view/GraphSyncer'
import { GridLayoutEngine } from '../domain/GridLayoutEngine'
import type { CommandContext } from '../commands/types'

interface DomainContextValue {
  netlistManager: NetlistManager
  commandBus: CommandBus
  eventBus: EventBus
  gridLayoutEngine: GridLayoutEngine
  graphSyncer: GraphSyncer | null
  initializeGraphSyncer: (graph: Graph) => void
}

const DomainContext = createContext<DomainContextValue | null>(null)

export function useDomain() {
  const context = useContext(DomainContext)
  if (!context) {
    throw new Error('useDomain must be used within DomainProvider')
  }
  return context
}

interface DomainProviderProps {
  children: ReactNode
}

export function DomainProvider({ children }: DomainProviderProps) {
  const [netlistManager] = useState(() => new NetlistManager())
  const [eventBus] = useState(() => new EventBus())
  const [gridLayoutEngine] = useState(() => new GridLayoutEngine())
  const [commandBus] = useState(() => {
    const context: CommandContext = { netlistManager }
    return new CommandBus(context, eventBus)
  })
  const [graphSyncer, setGraphSyncer] = useState<GraphSyncer | null>(null)

  const initializeGraphSyncer = (graph: Graph) => {
    if (graphSyncer) {
      graphSyncer.dispose()
    }
    const syncer = new GraphSyncer(graph, eventBus)
    setGraphSyncer(syncer)
  }

  useEffect(() => {
    return () => {
      if (graphSyncer) {
        graphSyncer.dispose()
      }
    }
  }, [graphSyncer])

  const value: DomainContextValue = {
    netlistManager,
    commandBus,
    eventBus,
    gridLayoutEngine,
    graphSyncer,
    initializeGraphSyncer
  }

  return <DomainContext.Provider value={value}>{children}</DomainContext.Provider>
}
