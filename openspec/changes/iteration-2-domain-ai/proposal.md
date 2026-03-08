# Iteration 2: Domain Core + AI Generation

## Why

Iteration 1 established the Electron shell, UI layout, and X6 canvas with basic component rendering. However, the current architecture lacks a domain layer and AI integration, making it impossible to generate schematics from natural language. This iteration introduces the core domain model, command bus, and Claude AI integration to enable the primary value proposition: transforming user descriptions into professional circuit schematics.

## What Changes

- **NEW**: Domain Core layer with Netlist data model, NetlistManager, and ConnectivityGraph for managing circuit topology independent of view layer
- **NEW**: Command Bus with undo/redo support, implementing command pattern for all schematic modifications
- **NEW**: Event Bus for domain events, enabling reactive synchronization between domain and view layers
- **NEW**: GraphSyncer module with echo cancellation mechanism to prevent circular updates between X6 and Domain Core
- **NEW**: Claude AI integration using Tool Use (function calling) mode for structured schematic generation
- **NEW**: Validation Pipeline with Zod schema validation, reference integrity checks, basic ERC, and RepairOrchestrator
- **NEW**: AI Chat Panel with streaming UI, progress indicators, and error handling
- **NEW**: Settings Dialog for API key management using Electron safeStorage
- **NEW**: Simple grid-based auto-layout algorithm for AI-generated components
- **MODIFIED**: X6 canvas event handlers to dispatch commands instead of direct manipulation
- **MODIFIED**: Component library drag-and-drop to use command pattern
- **BREAKING**: Iteration 1's direct X6 manipulation code will be replaced with command-driven architecture

## Capabilities

### New Capabilities

- `domain-core`: Domain layer managing circuit netlist, connectivity graph, and electrical topology independent of rendering
- `command-bus`: Command pattern implementation with undo/redo, event emission, and operation history
- `ai-generation`: Claude AI integration using Tool Use mode to generate schematics from natural language prompts
- `validation-pipeline`: Multi-stage validation including schema checks, reference integrity, basic ERC, and auto-repair
- `graph-syncer`: Bidirectional synchronization between Domain Core and X6 with echo cancellation to prevent circular updates
- `ai-chat-panel`: Streaming chat interface for AI interaction with progress indicators and error handling
- `settings-management`: Secure API key storage and configuration UI using Electron safeStorage
- `auto-layout`: Grid-based automatic component placement for AI-generated schematics

### Modified Capabilities

- `canvas-interaction`: X6 event handlers now dispatch commands to Command Bus instead of direct graph manipulation (requirement change: all modifications must be reversible)

## Impact

**Affected Code:**
- `src/renderer/components/canvas/SchematicCanvas.tsx`: Event handlers refactored to dispatch commands
- `src/renderer/components/panels/ComponentLibrary.tsx`: Drag-and-drop refactored to use AddComponentCommand
- `src/renderer/stores/`: Zustand stores will coexist with Domain Core (UI state only)

**New Modules:**
- `src/renderer/domain/`: Complete domain layer (Netlist, NetlistManager, ConnectivityGraph)
- `src/renderer/commands/`: Command Bus, Command implementations, Event Bus
- `src/renderer/view/GraphSyncer.ts`: Domain-to-X6 synchronization
- `src/main/services/AIService.ts`: Claude API integration
- `src/main/services/ClaudeProvider.ts`: Tool Use implementation
- `src/renderer/components/panels/AIChatPanel.tsx`: Streaming chat UI (replaces stub)
- `src/renderer/components/dialogs/SettingsDialog.tsx`: API key configuration

**Dependencies:**
- Add `@anthropic-ai/sdk` for Claude API
- Add `zod` for validation schemas
- Existing `@antv/x6` usage patterns change (silent mode, event interception)

**Performance:**
- Domain operations target <16ms per command (60 FPS)
- AI streaming latency target <100ms per tool call
- Support 100+ component schematics without degradation
