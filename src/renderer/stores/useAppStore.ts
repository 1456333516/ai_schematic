import { create } from 'zustand'

export interface AppState {
  currentView: 'welcome' | 'editor'
  componentLibraryVisible: boolean
  aiChatPanelVisible: boolean
  propertyPanelVisible: boolean
  componentLibraryWidth: number
  aiChatPanelWidth: number
  projectName: string | null
  projectPath: string | null

  setCurrentView: (view: AppState['currentView']) => void
  toggleComponentLibrary: () => void
  toggleAIChatPanel: () => void
  setPropertyPanelVisible: (visible: boolean) => void
  setPanelWidth: (panel: 'componentLibrary' | 'aiChat', width: number) => void
  setProject: (name: string, path: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'welcome',
  componentLibraryVisible: true,
  aiChatPanelVisible: true,
  propertyPanelVisible: false,
  componentLibraryWidth: 240,
  aiChatPanelWidth: 360,
  projectName: null,
  projectPath: null,

  setCurrentView: (view) => set({ currentView: view }),
  toggleComponentLibrary: () =>
    set((s) => ({ componentLibraryVisible: !s.componentLibraryVisible })),
  toggleAIChatPanel: () =>
    set((s) => ({ aiChatPanelVisible: !s.aiChatPanelVisible })),
  setPropertyPanelVisible: (visible) => set({ propertyPanelVisible: visible }),
  setPanelWidth: (panel, width) =>
    set(panel === 'componentLibrary'
      ? { componentLibraryWidth: Math.min(360, Math.max(180, width)) }
      : { aiChatPanelWidth: Math.min(520, Math.max(280, width)) }
    ),
  setProject: (name, path) =>
    set({ projectName: name, projectPath: path, currentView: 'editor' })
}))
