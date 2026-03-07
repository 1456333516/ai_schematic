# AI Schematic Generator - 技术与架构设计文档

| 字段 | 内容 |
|------|------|
| 文档版本 | v1.1 |
| 创建日期 | 2026-03-07 |
| 修订日期 | 2026-03-07 |
| 关联文档 | [PRD](./PRD.md) |
| 文档状态 | 审核修订版 |

---

## 1. 架构总览

### 1.1 架构分层

系统采用 **四层分离架构**，核心原则是 **领域驱动 + 视图解耦**：

```
┌────────────────────────────────────────────────────────────┐
│                    Platform Layer                          │
│                   (Electron Shell)                         │
├────────────────────────────────────────────────────────────┤
│                   Service Layer                            │
│         (Main Process: File/AI/Export/Version)             │
├────────────────────────────────────────────────────────────┤
│                    Domain Layer                            │
│     (Renderer: Domain Core / Command Bus / Validation)     │
├────────────────────────────────────────────────────────────┤
│                     View Layer                             │
│          (Renderer: React + AntV X6 + Ant Design)          │
└────────────────────────────────────────────────────────────┘
```

**分层职责**：

| 层 | 进程 | 职责 | 约束 |
|----|------|------|------|
| Platform | Main | 应用生命周期、窗口管理、原生能力 | 不包含业务逻辑 |
| Service | Main | 文件 I/O、AI API 调用、导出、密钥管理 | 通过 IPC 暴露，不直接操作 UI |
| Domain | Renderer | 电路数据模型、电气规则、命令调度 | 不依赖具体渲染引擎 |
| View | Renderer | 画布渲染、UI 交互、状态呈现 | 只读 Domain，修改必须通过 Command Bus |

### 1.2 技术栈

| 层次 | 技术 | 版本基线 |
|------|------|---------|
| 桌面框架 | Electron | ≥ 33.x |
| 前端框架 | React | ≥ 18.x |
| 类型系统 | TypeScript | ≥ 5.x |
| 图编辑引擎 | AntV X6 | ≥ 2.x |
| X6 React 支持 | @antv/x6-react-shape | ≥ 2.x |
| 状态管理 | Zustand | ≥ 4.x |
| AI SDK | @anthropic-ai/sdk | latest |
| UI 组件库 | Ant Design | ≥ 5.x |
| 导出 Excel | ExcelJS | ≥ 4.x |
| Schema 校验 | Zod | ≥ 3.x |
| 构建工具 | Vite + electron-vite | latest |

---

## 2. Electron 进程架构

### 2.1 进程模型

```
┌─────────────────────────────────────────────┐
│              Main Process                   │
│  ┌───────────────────────────────────────┐  │
│  │         IPC Handler Registry          │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────┐  │  │
│  │  │  File   │ │    AI    │ │Export │  │  │
│  │  │ Service │ │ Service  │ │Service│  │  │
│  │  └─────────┘ └──────────┘ └───────┘  │  │
│  │  ┌─────────┐ ┌──────────┐            │  │
│  │  │ Version │ │ Library  │            │  │
│  │  │ Service │ │ Service  │            │  │
│  │  └─────────┘ └──────────┘            │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│              Preload Script                 │
│         (contextBridge API 暴露)             │
├─────────────────────────────────────────────┤
│            Renderer Process                 │
│  ┌───────────────────────────────────────┐  │
│  │  window.electronAPI (类型安全调用)      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 2.2 IPC 通信设计

**Preload 脚本 — 安全暴露 API**：

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // FileService
  file: {
    createProject: (name: string, path: string) =>
      ipcRenderer.invoke('file:create-project', name, path),
    openProject: (path: string) =>
      ipcRenderer.invoke('file:open-project', path),
    saveProject: (data: ProjectData) =>
      ipcRenderer.invoke('file:save-project', data),
    getRecentProjects: () =>
      ipcRenderer.invoke('file:recent-projects'),
  },

  // AIService — 请求级流通道（基于 requestId 隔离）
  ai: {
    generate: (prompt: string, context: SchematicContext) =>
      ipcRenderer.invoke('ai:generate', prompt, context),
    modify: (instruction: string, state: SchematicDSL) =>
      ipcRenderer.invoke('ai:modify', instruction, state),
    analyze: (schematic: SchematicDSL) =>
      ipcRenderer.invoke('ai:analyze', schematic),

    // 流式响应 — 返回 scoped unsubscribe 函数，避免误删其他模块监听器
    onStreamStart: (callback: (requestId: string) => void): (() => void) => {
      const handler = (_e: any, requestId: string) => callback(requestId);
      ipcRenderer.on('ai:stream-start', handler);
      return () => ipcRenderer.removeListener('ai:stream-start', handler);
    },
    onStreamChunk: (requestId: string, callback: (chunk: DSLChunk) => void): (() => void) => {
      const channel = `ai:stream-chunk:${requestId}`;
      const handler = (_e: any, chunk: DSLChunk) => callback(chunk);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },
    onStreamEnd: (requestId: string, callback: () => void): (() => void) => {
      const channel = `ai:stream-end:${requestId}`;
      const handler = () => callback();
      ipcRenderer.once(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },
    onStreamError: (requestId: string, callback: (error: string) => void): (() => void) => {
      const channel = `ai:stream-error:${requestId}`;
      const handler = (_e: any, error: string) => callback(error);
      ipcRenderer.once(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },
    cancelStream: (requestId: string) =>
      ipcRenderer.send('ai:cancel-stream', requestId),
  },

  // ExportService
  export: {
    toPNG: (data: ExportPayload, options: PNGOptions) =>
      ipcRenderer.invoke('export:png', data, options),
    toPDF: (data: ExportPayload, options: PDFOptions) =>
      ipcRenderer.invoke('export:pdf', data, options),
    toBOM: (components: ComponentData[]) =>
      ipcRenderer.invoke('export:bom', components),
  },

  // VersionService
  version: {
    getHistory: (projectPath: string) =>
      ipcRenderer.invoke('version:history', projectPath),
    createSnapshot: (projectPath: string, data: ProjectData) =>
      ipcRenderer.invoke('version:snapshot', projectPath, data),
    rollback: (projectPath: string, versionId: string) =>
      ipcRenderer.invoke('version:rollback', projectPath, versionId),
    diff: (projectPath: string, v1: string, v2: string) =>
      ipcRenderer.invoke('version:diff', projectPath, v1, v2),
  },

  // 系统
  system: {
    showSaveDialog: (options: SaveDialogOptions) =>
      ipcRenderer.invoke('system:save-dialog', options),
    showOpenDialog: (options: OpenDialogOptions) =>
      ipcRenderer.invoke('system:open-dialog', options),
  },
} as const;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
```

**类型安全声明（Renderer 侧）**：

```typescript
// src/types/electron.d.ts
import type { ElectronAPI } from '../preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

### 2.3 Main Process 服务注册

```typescript
// main/index.ts
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { z } from 'zod';
import { FileService } from './services/FileService';
import { AIService } from './services/AIService';
import { ExportService } from './services/ExportService';
import { VersionService } from './services/VersionService';

// IPC 输入校验辅助 — 所有 handler 入口使用 Zod 校验
function validatedHandler<T>(schema: z.ZodType<T>, handler: (data: T) => Promise<any>) {
  return async (_e: any, ...args: any[]) => {
    const result = schema.safeParse(args.length === 1 ? args[0] : args);
    if (!result.success) {
      throw new Error(`IPC validation failed: ${result.error.message}`);
    }
    return handler(result.data);
  };
}

function registerIpcHandlers(win: BrowserWindow) {
  const fileService = new FileService();
  const aiService = new AIService(win);
  const exportService = new ExportService();
  const versionService = new VersionService();

  // FileService handlers（含输入校验）
  ipcMain.handle('file:create-project', (_e, name, path) =>
    fileService.createProject(
      z.string().min(1).parse(name),
      z.string().min(1).parse(path)
    ));
  ipcMain.handle('file:open-project', (_e, path) =>
    fileService.openProject(z.string().min(1).parse(path)));
  ipcMain.handle('file:save-project', (_e, data) =>
    fileService.saveProject(data));
  ipcMain.handle('file:recent-projects', () =>
    fileService.getRecentProjects());

  // AIService handlers — requestId 路由
  ipcMain.handle('ai:generate', (_e, prompt, context) =>
    aiService.generate(
      z.string().min(1).parse(prompt),
      context
    ));
  ipcMain.handle('ai:modify', (_e, instruction, state) =>
    aiService.modify(
      z.string().min(1).parse(instruction),
      state
    ));
  ipcMain.handle('ai:analyze', (_e, schematic) =>
    aiService.analyze(schematic));
  ipcMain.on('ai:cancel-stream', (_e, requestId) =>
    aiService.cancelStream(z.string().uuid().parse(requestId)));

  // ExportService handlers
  ipcMain.handle('export:png', (_e, data, options) =>
    exportService.toPNG(data, options));
  ipcMain.handle('export:pdf', (_e, data, options) =>
    exportService.toPDF(data, options));
  ipcMain.handle('export:bom', (_e, components) =>
    exportService.toBOM(components));

  // VersionService handlers
  ipcMain.handle('version:history', (_e, path) =>
    versionService.getHistory(z.string().min(1).parse(path)));
  ipcMain.handle('version:snapshot', (_e, path, data) =>
    versionService.createSnapshot(z.string().min(1).parse(path), data));
  ipcMain.handle('version:rollback', (_e, path, vid) =>
    versionService.rollback(
      z.string().min(1).parse(path),
      z.string().min(1).parse(vid)
    ));
  ipcMain.handle('version:diff', (_e, path, v1, v2) =>
    versionService.diff(
      z.string().min(1).parse(path),
      z.string().min(1).parse(v1),
      z.string().min(1).parse(v2)
    ));

  // 系统对话框 handlers
  ipcMain.handle('system:save-dialog', async (_e, options) => {
    return dialog.showSaveDialog(win, options);
  });
  ipcMain.handle('system:open-dialog', async (_e, options) => {
    return dialog.showOpenDialog(win, options);
  });
}
```

---

## 3. AI 集成架构

### 3.1 AI Provider 适配器

采用 **适配器模式**，统一不同大模型的调用接口：

```typescript
// shared/types/ai.ts

// AI 输出的中间 DSL 类型
interface SchematicDSL {
  components: DSLComponent[];
  connections: DSLConnection[];
  netLabels: DSLNetLabel[];
  powerSymbols: DSLPowerSymbol[];
  layout?: DSLLayout;
}

interface DSLChunk {
  type: 'partial' | 'complete' | 'text' | 'error';
  data: Partial<SchematicDSL> | string;
  progress?: number;
}

interface AnalysisReport {
  issues: AnalysisIssue[];
  summary: string;
}

interface AnalysisIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'connectivity' | 'parameter' | 'drc' | 'optimization';
  componentIds?: string[];
  message: string;
  suggestion?: string;
}

// Provider 接口 — 所有 AI 模型必须实现
interface AIProvider {
  readonly id: string;
  readonly name: string;

  generate(
    requestId: string,
    prompt: string,
    context: SchematicContext,
    onChunk: (chunk: DSLChunk) => void,
    signal?: AbortSignal
  ): Promise<SchematicDSL>;

  modify(
    requestId: string,
    instruction: string,
    currentState: SchematicDSL,
    onChunk: (chunk: DSLChunk) => void,
    signal?: AbortSignal
  ): Promise<SchematicDSL>;

  analyze(
    schematic: SchematicDSL,
    signal?: AbortSignal
  ): Promise<AnalysisReport>;

  cancel(requestId: string): void;
}
```

### 3.2 Claude Provider 实现

基于 Anthropic SDK，使用 **流式 Tool Use** 让模型以结构化格式输出电路描述，实时反馈生成进度：

```typescript
// main/services/ai/ClaudeProvider.ts
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, SchematicDSL, DSLChunk } from '../../shared/types/ai';
import { SchematicDSLSchema } from '../../shared/validation/schemas';

// Tool 定义（同前，省略 SCHEMATIC_TOOLS 结构）

const SYSTEM_PROMPT = `You are a professional electronic circuit design engineer.
When the user describes a circuit, you MUST call the generate_schematic tool to output a structured schematic.
Rules:
- Use standard reference designators (R for resistor, C for capacitor, U for IC, etc.)
- Include all necessary decoupling capacitors and protection circuits
- Specify accurate pin names matching real component datasheets
- Use appropriate component values based on the circuit requirements
- Follow LCEDA (嘉立创 EDA) conventions`;

export class ClaudeProvider implements AIProvider {
  readonly id = 'claude';
  readonly name = 'Claude';

  private client: Anthropic;
  private activeRequests = new Map<string, AbortController>();

  constructor(apiKey: string, private model: string = 'claude-sonnet-4-5-20250929') {
    this.client = new Anthropic({ apiKey });
  }

  async generate(
    requestId: string,
    prompt: string,
    context: SchematicContext,
    onChunk: (chunk: DSLChunk) => void,
    signal?: AbortSignal
  ): Promise<SchematicDSL> {
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);
    const mergedSignal = signal || abortController.signal;

    try {
      const messages: Anthropic.MessageParam[] = [];

      if (context?.existingSchematic) {
        messages.push({
          role: 'user',
          content: `Current schematic state:\n${JSON.stringify(context.existingSchematic, null, 2)}`
        });
        messages.push({
          role: 'assistant',
          content: 'I understand the current schematic. What changes would you like?'
        });
      }

      messages.push({ role: 'user', content: prompt });

      onChunk({ type: 'text', data: 'Analyzing circuit requirements...' });

      // 使用流式 API — 实时反馈生成进度
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages,
        tools: SCHEMATIC_TOOLS,
        tool_choice: { type: 'tool', name: 'generate_schematic' }, // 强制调用 tool
      }, { signal: mergedSignal });

      let toolInputJson = '';

      // 监听流式事件
      stream.on('text', (text) => {
        onChunk({ type: 'text', data: text });
      });

      stream.on('inputJson', (_delta, snapshot) => {
        toolInputJson = snapshot;
        // 每次 inputJson 更新时通知前端进度
        onChunk({ type: 'partial', data: `Generating schematic... (${toolInputJson.length} chars)` });
      });

      const finalMessage = await stream.finalMessage();

      // 提取 tool_use block
      const toolUseBlock = finalMessage.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (!toolUseBlock || toolUseBlock.name !== 'generate_schematic') {
        throw new AIOutputError('AI did not produce structured schematic output');
      }

      // Zod 校验 tool 输出 — 不信任裸类型断言
      const parseResult = SchematicDSLSchema.safeParse(toolUseBlock.input);
      if (!parseResult.success) {
        throw new AIOutputError(
          `AI output validation failed: ${parseResult.error.issues.map(i => i.message).join('; ')}`
        );
      }

      const dsl = parseResult.data as SchematicDSL;
      onChunk({ type: 'complete', data: dsl, progress: 100 });
      return dsl;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  async modify(
    requestId: string,
    instruction: string,
    currentState: SchematicDSL,
    onChunk: (chunk: DSLChunk) => void,
    signal?: AbortSignal
  ): Promise<SchematicDSL> {
    return this.generate(
      requestId,
      `Modify the existing schematic: ${instruction}`,
      { existingSchematic: currentState },
      onChunk,
      signal
    );
  }

  async analyze(
    schematic: SchematicDSL,
    signal?: AbortSignal
  ): Promise<AnalysisReport> {
    // 分析也使用 Tool Use 获取结构化输出
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: `You are an expert circuit reviewer. Analyze the given schematic and call the analyze_schematic tool with your findings.`,
      messages: [{
        role: 'user',
        content: `Analyze this schematic:\n${JSON.stringify(schematic, null, 2)}`
      }],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: 'analyze_schematic' },
    }, { signal });

    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );
    if (!toolBlock) throw new AIOutputError('Analysis did not return structured output');

    const result = AnalysisReportSchema.safeParse(toolBlock.input);
    if (!result.success) throw new AIOutputError('Analysis output validation failed');
    return result.data;
  }

  // 按 requestId 取消特定请求
  cancel(requestId: string): void {
    this.activeRequests.get(requestId)?.abort();
    this.activeRequests.delete(requestId);
  }

  cancelAll(): void {
    this.activeRequests.forEach(ctrl => ctrl.abort());
    this.activeRequests.clear();
  }
}

// 自定义错误类型
class AIOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIOutputError';
  }
}
```

### 3.3 AIService（Main Process 调度层）

```typescript
// main/services/AIService.ts
import { BrowserWindow } from 'electron';
import { randomUUID } from 'crypto';
import { ClaudeProvider } from './ai/ClaudeProvider';
import { SecureStorage } from './SecureStorage';
import type { AIProvider } from '../../shared/types/ai';

export class AIService {
  private provider: AIProvider;
  private win: BrowserWindow;

  constructor(win: BrowserWindow) {
    this.win = win;
    const apiKey = SecureStorage.loadApiKey();
    if (!apiKey) throw new Error('API Key not configured');
    this.provider = new ClaudeProvider(apiKey);
  }

  async generate(prompt: string, context: SchematicContext): Promise<SchematicDSL> {
    const requestId = randomUUID();
    this.win.webContents.send('ai:stream-start', requestId);

    try {
      const result = await this.provider.generate(requestId, prompt, context, (chunk) => {
        this.win.webContents.send(`ai:stream-chunk:${requestId}`, chunk);
      });
      this.win.webContents.send(`ai:stream-end:${requestId}`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.win.webContents.send(`ai:stream-error:${requestId}`, message);
      throw err;
    }
  }

  async modify(instruction: string, state: SchematicDSL): Promise<SchematicDSL> {
    const requestId = randomUUID();
    this.win.webContents.send('ai:stream-start', requestId);

    try {
      const result = await this.provider.modify(requestId, instruction, state, (chunk) => {
        this.win.webContents.send(`ai:stream-chunk:${requestId}`, chunk);
      });
      this.win.webContents.send(`ai:stream-end:${requestId}`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.win.webContents.send(`ai:stream-error:${requestId}`, message);
      throw err;
    }
  }

  async analyze(schematic: SchematicDSL): Promise<AnalysisReport> {
    return this.provider.analyze(schematic);
  }

  // 按 requestId 取消特定请求
  cancelStream(requestId: string): void {
    this.provider.cancel(requestId);
  }

  switchProvider(providerId: string, apiKey: string): void {
    switch (providerId) {
      case 'claude':
        this.provider = new ClaudeProvider(apiKey);
        break;
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }
}
```

### 3.4 AI 数据流全链路

```
┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────────┐
│  用户输入  │───▶│  AIService   │───▶│ ClaudeProvider │───▶│ Anthropic   │
│ (Renderer)│    │ (Main/IPC)   │    │ (Tool Use)     │    │   API       │
└──────────┘    └──────┬───────┘    └────────┬───────┘    └──────┬──────┘
                       │                     │                    │
                       │ IPC: ai:stream-chunk│ tool_use block     │ SSE stream
                       │◀────────────────────│◀───────────────────│
                       ▼                     ▼                    │
              ┌────────────────┐    ┌────────────────┐           │
              │ Renderer       │    │ SchematicDSL   │           │
              │ onStreamChunk  │    │ (JSON 结构)     │           │
              └───────┬────────┘    └────────────────┘           │
                      │                                          │
                      ▼                                          │
              ┌────────────────┐                                 │
              │  Validation    │  Schema 校验 + ERC              │
              │  Pipeline      │  校验失败 → 修复循环 ───────────▶│
              └───────┬────────┘                                 │
                      │ 校验通过                                  │
                      ▼
              ┌────────────────┐
              │  Domain Core   │  更新网表数据模型
              └───────┬────────┘
                      │ 状态变更通知
                      ▼
              ┌────────────────┐
              │  AntV X6       │  渲染到画布
              │  View Layer    │
              └────────────────┘
```

---

## 4. Domain Core（领域核心层）

Domain Core 是系统的**电气真相源**，独立于 UI 框架。

### 4.1 网表数据模型

```typescript
// domain/models/Netlist.ts

interface Netlist {
  components: Map<string, SchematicComponent>;
  nets: Map<string, Net>;
  sheets: Map<string, Sheet>;
}

interface SchematicComponent {
  id: string;                          // 位号 R1, C1, U1
  libraryRef: string;                  // 元器件库引用
  category: ComponentCategory;
  position: Point;
  rotation: Rotation;                  // 0 | 90 | 180 | 270
  mirror: boolean;
  properties: ComponentProperties;
  pins: Map<string, Pin>;
  sheetId: string;
}

interface Pin {
  id: string;
  name: string;
  type: PinType;                       // input | output | bidirectional | power | passive
  position: Point;                     // 相对于元器件原点
  connectedNet: string | null;
  electrical: PinElectrical;           // 电气属性
}

interface PinElectrical {
  direction: 'in' | 'out' | 'inout' | 'passive' | 'power';
  voltage?: string;
  current?: string;
}

interface Net {
  id: string;
  name: string;
  type: 'signal' | 'power' | 'ground';
  pins: PinRef[];                      // 连接到此网络的所有引脚
  wires: Wire[];                       // 物理连线
  label?: NetLabel;
}

interface Wire {
  id: string;
  points: Point[];                     // 折线路径
  netId: string;
  sheetId: string;
}

interface Sheet {
  id: string;
  name: string;
  order: number;
  size: { width: number; height: number };
}

type ComponentCategory =
  | 'resistor' | 'capacitor' | 'inductor'
  | 'diode' | 'led' | 'transistor_npn' | 'transistor_pnp'
  | 'mosfet_n' | 'mosfet_p' | 'opamp'
  | 'ic' | 'connector' | 'fuse' | 'crystal' | 'relay';

type Rotation = 0 | 90 | 180 | 270;

interface Point { x: number; y: number; }

interface PinRef {
  componentId: string;
  pinId: string;
}
```

### 4.2 NetlistManager

管理网表的增删改查和连通性分析：

```typescript
// domain/NetlistManager.ts

export class NetlistManager {
  private netlist: Netlist;
  private connectivityGraph: ConnectivityGraph;

  constructor() {
    this.netlist = { components: new Map(), nets: new Map(), sheets: new Map() };
    this.connectivityGraph = new ConnectivityGraph();
  }

  // 从 DSL 构建网表
  loadFromDSL(dsl: SchematicDSL): void {
    this.clear();
    for (const comp of dsl.components) {
      this.addComponent(comp);
    }
    for (const conn of dsl.connections) {
      this.addConnection(conn);
    }
    this.connectivityGraph.rebuild(this.netlist);
  }

  // 序列化为 JSON（用于持久化和 AI 上下文）
  serialize(): SchematicDSL {
    return {
      components: Array.from(this.netlist.components.values()).map(toComponentDSL),
      connections: this.extractConnections(),
      netLabels: this.extractNetLabels(),
      powerSymbols: this.extractPowerSymbols(),
    };
  }

  // 连通性查询
  getConnectedPins(pinRef: PinRef): PinRef[] {
    return this.connectivityGraph.getConnectedPins(pinRef);
  }

  getNet(pinRef: PinRef): Net | undefined {
    const comp = this.netlist.components.get(pinRef.componentId);
    const pin = comp?.pins.get(pinRef.pinId);
    return pin?.connectedNet ? this.netlist.nets.get(pin.connectedNet) : undefined;
  }

  // 浮空引脚检测
  getFloatingPins(): PinRef[] {
    const floating: PinRef[] = [];
    for (const [compId, comp] of this.netlist.components) {
      for (const [pinId, pin] of comp.pins) {
        if (!pin.connectedNet && pin.type !== 'passive') {
          floating.push({ componentId: compId, pinId });
        }
      }
    }
    return floating;
  }

  // 短路检测
  getShortCircuits(): ShortCircuit[] {
    return this.connectivityGraph.detectShortCircuits();
  }
}
```

### 4.3 ConnectivityGraph

基于邻接表的电气连通性图：

```typescript
// domain/ConnectivityGraph.ts

export class ConnectivityGraph {
  private adjacency: Map<string, Set<string>> = new Map();

  // pinKey 格式: "componentId.pinId"
  private pinKey(ref: PinRef): string {
    return `${ref.componentId}.${ref.pinId}`;
  }

  rebuild(netlist: Netlist): void {
    this.adjacency.clear();
    for (const [, net] of netlist.nets) {
      const pins = net.pins.map(p => this.pinKey(p));
      // 同一 net 内所有引脚互相连通
      for (let i = 0; i < pins.length; i++) {
        if (!this.adjacency.has(pins[i])) {
          this.adjacency.set(pins[i], new Set());
        }
        for (let j = i + 1; j < pins.length; j++) {
          if (!this.adjacency.has(pins[j])) {
            this.adjacency.set(pins[j], new Set());
          }
          this.adjacency.get(pins[i])!.add(pins[j]);
          this.adjacency.get(pins[j])!.add(pins[i]);
        }
      }
    }
  }

  getConnectedPins(ref: PinRef): PinRef[] {
    const key = this.pinKey(ref);
    const connected = this.adjacency.get(key);
    if (!connected) return [];
    return Array.from(connected).map(k => {
      const [componentId, pinId] = k.split('.');
      return { componentId, pinId };
    });
  }

  detectShortCircuits(): ShortCircuit[] {
    // 检测电源和地连接到同一网络
    const shorts: ShortCircuit[] = [];
    // ... 实现省略，核心逻辑是检查同一 net 中是否有不应连通的电源/地引脚
    return shorts;
  }
}
```

---

## 5. Command Bus（命令总线）

所有画布操作通过 Command Bus 调度，实现 undo/redo 和操作日志。

### 5.1 Command 接口与 DomainEvent

Command **仅操作 Domain 层**，不直接引用任何 View 层对象。状态变更通过 DomainEvent 通知 View 层同步。

```typescript
// domain/commands/Command.ts

interface Command {
  readonly type: string;
  readonly description: string;       // 语义化描述，用于版本历史
  readonly timestamp: number;
  readonly sheetId: string;           // 所属 Sheet（支持多 Sheet undo）

  execute(context: CommandContext): DomainEvent[];
  undo(context: CommandContext): DomainEvent[];
}

// 命令上下文 — 仅包含 Domain 层对象，不包含 View 层
interface CommandContext {
  netlistManager: NetlistManager;
}

// 领域事件 — Domain 层输出，View 层订阅
type DomainEvent =
  | { type: 'node:added'; data: ComponentData }
  | { type: 'node:removed'; id: string }
  | { type: 'node:moved'; id: string; position: Point }
  | { type: 'node:updated'; id: string; key: string; value: string }
  | { type: 'edge:added'; data: ConnectionData }
  | { type: 'edge:removed'; id: string }
  | { type: 'label:added'; data: NetLabelData }
  | { type: 'label:removed'; id: string }
  | { type: 'full:rebuild' };         // 全量重建信号（AI 生成等场景）

// 事件总线 — Domain 层发射，View 层监听
class DomainEventBus {
  private listeners: ((event: DomainEvent) => void)[] = [];

  emit(event: DomainEvent): void {
    this.listeners.forEach(l => l(event));
  }

  emitBatch(events: DomainEvent[]): void {
    events.forEach(e => this.emit(e));
  }

  subscribe(listener: (event: DomainEvent) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }
}

// 命令元数据，用于语义化 diff
interface CommandMeta {
  category: 'component' | 'wire' | 'parameter' | 'layout' | 'label';
  targetIds: string[];
}
```

### 5.2 具体命令实现

```typescript
// domain/commands/AddComponentCommand.ts

export class AddComponentCommand implements Command {
  readonly type = 'ADD_COMPONENT';
  readonly timestamp = Date.now();
  readonly description: string;
  readonly sheetId: string;

  constructor(private data: ComponentData, sheetId: string) {
    this.description = `Add ${data.category} ${data.id}`;
    this.sheetId = sheetId;
  }

  execute(ctx: CommandContext): DomainEvent[] {
    ctx.netlistManager.addComponent(this.data);
    return [{ type: 'node:added', data: this.data }];
  }

  undo(ctx: CommandContext): DomainEvent[] {
    ctx.netlistManager.removeComponent(this.data.id);
    return [{ type: 'node:removed', id: this.data.id }];
  }
}

// domain/commands/MoveComponentCommand.ts
export class MoveComponentCommand implements Command {
  readonly type = 'MOVE_COMPONENT';
  readonly timestamp = Date.now();
  readonly description: string;
  readonly sheetId: string;

  private oldPosition: Point;

  constructor(
    private componentId: string,
    private newPosition: Point,
    oldPosition: Point,
    sheetId: string
  ) {
    this.oldPosition = { ...oldPosition };
    this.description = `Move ${componentId}`;
    this.sheetId = sheetId;
  }

  execute(ctx: CommandContext): DomainEvent[] {
    ctx.netlistManager.moveComponent(this.componentId, this.newPosition);
    return [{ type: 'node:moved', id: this.componentId, position: this.newPosition }];
  }

  undo(ctx: CommandContext): DomainEvent[] {
    ctx.netlistManager.moveComponent(this.componentId, this.oldPosition);
    return [{ type: 'node:moved', id: this.componentId, position: this.oldPosition }];
  }
}

// domain/commands/ModifyParameterCommand.ts
export class ModifyParameterCommand implements Command {
  readonly type = 'MODIFY_PARAMETER';
  readonly timestamp = Date.now();
  readonly description: string;
  readonly sheetId: string;

  constructor(
    private componentId: string,
    private key: string,
    private newValue: string,
    private oldValue: string,
    sheetId: string
  ) {
    this.description = `Change ${componentId}.${key}: ${oldValue} → ${newValue}`;
    this.sheetId = sheetId;
  }

  execute(ctx: CommandContext): DomainEvent[] {
    ctx.netlistManager.setComponentProperty(this.componentId, this.key, this.newValue);
    return [{ type: 'node:updated', id: this.componentId, key: this.key, value: this.newValue }];
  }

  undo(ctx: CommandContext): DomainEvent[] {
    ctx.netlistManager.setComponentProperty(this.componentId, this.key, this.oldValue);
    return [{ type: 'node:updated', id: this.componentId, key: this.key, value: this.oldValue }];
  }
}
```

### 5.3 CommandBus 实现

```typescript
// domain/CommandBus.ts

export class CommandBus {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private context: CommandContext;
  private eventBus: DomainEventBus;
  private listeners: ((cmd: Command, action: 'execute' | 'undo' | 'redo') => void)[] = [];

  constructor(context: CommandContext, eventBus: DomainEventBus) {
    this.context = context;
    this.eventBus = eventBus;
  }

  execute(command: Command): void {
    const events = command.execute(this.context);
    this.undoStack.push(command);
    this.redoStack = [];
    this.eventBus.emitBatch(events);
    this.notify(command, 'execute');
  }

  undo(): Command | undefined {
    const cmd = this.undoStack.pop();
    if (!cmd) return undefined;
    const events = cmd.undo(this.context);
    this.redoStack.push(cmd);
    this.eventBus.emitBatch(events);
    this.notify(cmd, 'undo');
    return cmd;
  }

  redo(): Command | undefined {
    const cmd = this.redoStack.pop();
    if (!cmd) return undefined;
    const events = cmd.execute(this.context);
    this.undoStack.push(cmd);
    this.eventBus.emitBatch(events);
    this.notify(cmd, 'redo');
    return cmd;
  }

  // RAII 风格批量操作 — 确保 endBatch 必定被调用
  withBatch<T>(description: string, fn: () => T): T {
    const collected: Command[] = [];
    const originalExecute = this.execute.bind(this);

    // 临时替换 execute，收集命令但不入栈
    this.execute = (cmd: Command) => {
      const events = cmd.execute(this.context);
      collected.push(cmd);
      this.eventBus.emitBatch(events);
    };

    try {
      const result = fn();
      // 还原 execute 并将批量命令作为单条入栈
      this.execute = originalExecute;
      if (collected.length > 0) {
        const batch = new BatchCommand(collected, description);
        this.undoStack.push(batch);
        this.redoStack = [];
        this.notify(batch, 'execute');
      }
      return result;
    } catch (err) {
      // 失败时回滚所有已执行的命令
      this.execute = originalExecute;
      [...collected].reverse().forEach(cmd => {
        const events = cmd.undo(this.context);
        this.eventBus.emitBatch(events);
      });
      throw err;
    }
  }

  // 获取操作历史（用于版本管理）
  getHistory(): Command[] {
    return [...this.undoStack];
  }

  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  onCommand(listener: (cmd: Command, action: 'execute' | 'undo' | 'redo') => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify(cmd: Command, action: 'execute' | 'undo' | 'redo') {
    this.listeners.forEach(l => l(cmd, action));
  }
}

// 批量命令
class BatchCommand implements Command {
  readonly type = 'BATCH';
  readonly timestamp = Date.now();
  readonly sheetId: string;

  constructor(
    private commands: Command[],
    readonly description: string
  ) {
    this.sheetId = commands[0]?.sheetId || '';
  }

  execute(ctx: CommandContext): DomainEvent[] {
    return this.commands.flatMap(cmd => cmd.execute(ctx));
  }

  undo(ctx: CommandContext): DomainEvent[] {
    // 反序撤销
    return [...this.commands].reverse().flatMap(cmd => cmd.undo(ctx));
  }
}
```

---

## 6. AntV X6 视图层

### 6.1 自定义元器件节点

利用 X6 的 `register` + React 组件实现元器件渲染：

```typescript
// view/shapes/registerShapes.ts
import { register } from '@antv/x6-react-shape';
import { Graph } from '@antv/x6';
import { ResistorNode } from './components/ResistorNode';
import { CapacitorNode } from './components/CapacitorNode';
import { ICNode } from './components/ICNode';

// 所有元器件共享的端口配置基础
const BASE_PORT_GROUP = {
  attrs: {
    circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' }
  },
  position: { name: 'absolute' },
};

// 注册电阻节点
register({
  shape: 'schematic-resistor',
  width: 80,
  height: 30,
  component: ResistorNode,
  ports: {
    groups: {
      pin: { ...BASE_PORT_GROUP },
    },
    items: [
      { id: 'pin1', group: 'pin', args: { x: 0, y: 15 } },
      { id: 'pin2', group: 'pin', args: { x: 80, y: 15 } },
    ],
  },
});

// 注册 IC 节点（动态引脚数）
register({
  shape: 'schematic-ic',
  width: 120,
  height: 80,   // 运行时根据引脚数调整
  component: ICNode,
  ports: {
    groups: {
      left:   { ...BASE_PORT_GROUP, position: { name: 'left' } },
      right:  { ...BASE_PORT_GROUP, position: { name: 'right' } },
      top:    { ...BASE_PORT_GROUP, position: { name: 'top' } },
      bottom: { ...BASE_PORT_GROUP, position: { name: 'bottom' } },
    },
  },
});

// 注册连线样式
Graph.registerEdge('schematic-wire', {
  inherit: 'edge',
  attrs: {
    line: {
      stroke: '#4B8B3B',
      strokeWidth: 1.5,
      targetMarker: null,
      sourceMarker: null,
    },
  },
  router: { name: 'manhattan' },
  connector: { name: 'rounded', args: { radius: 2 } },
}, true);
```

### 6.2 React 元器件组件（嘉立创 EDA 风格）

```tsx
// view/shapes/components/ResistorNode.tsx
import { FC } from 'react';

interface ResistorNodeProps {
  node?: any;  // X6 Node instance
}

export const ResistorNode: FC<ResistorNodeProps> = ({ node }) => {
  const data = node?.getData() || {};
  const { value = '', id = 'R?' } = data;

  // 嘉立创 EDA 标准电阻符号：矩形块
  return (
    <svg width="80" height="30" viewBox="0 0 80 30">
      {/* 引线 */}
      <line x1="0" y1="15" x2="15" y2="15" stroke="#4B8B3B" strokeWidth="1.5" />
      <line x1="65" y1="15" x2="80" y2="15" stroke="#4B8B3B" strokeWidth="1.5" />
      {/* 电阻体 */}
      <rect x="15" y="5" width="50" height="20" fill="none" stroke="#4B8B3B" strokeWidth="1.5" />
      {/* 位号 */}
      <text x="40" y="-2" textAnchor="middle" fontSize="10" fill="#0000FF">{id}</text>
      {/* 阻值 */}
      <text x="40" y="42" textAnchor="middle" fontSize="10" fill="#000">{value}</text>
    </svg>
  );
};
```

### 6.3 Graph 初始化与配置

```typescript
// view/canvas/SchematicGraph.ts
import { Graph, History } from '@antv/x6';
import { Selection } from '@antv/x6-plugin-selection';
import { Snapline } from '@antv/x6-plugin-snapline';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Clipboard } from '@antv/x6-plugin-clipboard';
import { MiniMap } from '@antv/x6-plugin-minimap';

export function createSchematicGraph(container: HTMLElement): Graph {
  const graph = new Graph({
    container,
    width: 4000,
    height: 3000,
    grid: {
      visible: true,
      size: 10,
      type: 'dot',
      args: { color: '#ddd', thickness: 1 },
    },
    background: { color: '#FFFFFF' },
    mousewheel: { enabled: true, modifiers: 'ctrl', minScale: 0.2, maxScale: 4 },
    panning: { enabled: true },
    connecting: {
      router: { name: 'manhattan' },
      connector: { name: 'rounded', args: { radius: 2 } },
      snap: { radius: 20 },
      allowBlank: false,
      allowLoop: false,
      allowMulti: false,
      highlight: true,
      validateConnection({ sourceCell, targetCell, sourceMagnet, targetMagnet }) {
        if (!sourceMagnet || !targetMagnet) return false;
        // 引脚电气兼容性检查：不允许 output↔output 直连
        const sourceData = sourceCell?.getData();
        const targetData = targetCell?.getData();
        if (sourceData?.pinType === 'output' && targetData?.pinType === 'output') return false;
        return true;
      },
    },
    highlighting: {
      magnetAdsorbed: {
        name: 'stroke',
        args: { attrs: { fill: '#5F95FF', stroke: '#5F95FF' } },
      },
    },
  });

  // 插件注册（注意：不使用 X6 History 插件，undo/redo 由 CommandBus 统一管理）
  graph.use(new Selection({
    enabled: true,
    multiple: true,
    rubberband: true,
    movable: true,
    showNodeSelectionBox: true,
  }));
  graph.use(new Snapline({ enabled: true }));
  graph.use(new Keyboard({ enabled: true }));
  graph.use(new Clipboard({ enabled: true }));
  graph.use(new MiniMap({
    container: document.getElementById('minimap')!,
    width: 200,
    height: 160,
  }));

  return graph;
}
```

### 6.4 GraphSyncer（订阅 DomainEvent 驱动同步）

View 层通过订阅 DomainEvent 被动更新 X6，实现 Domain↔View 完全解耦：

```typescript
// view/canvas/GraphSyncer.ts
import { Graph, Node, Edge } from '@antv/x6';
import type { DomainEvent, DomainEventBus } from '../../domain/commands/Command';
import type { NetlistManager } from '../../domain/NetlistManager';

export class GraphSyncer {
  private unsubscribe: (() => void) | null = null;

  constructor(
    private graph: Graph,
    private netlistManager: NetlistManager,
    eventBus: DomainEventBus
  ) {
    // 订阅 Domain 事件 — View 层被动响应
    this.unsubscribe = eventBus.subscribe((event) => this.handleEvent(event));
  }

  dispose(): void {
    this.unsubscribe?.();
  }

  private handleEvent(event: DomainEvent): void {
    switch (event.type) {
      case 'node:added':
        this.addNode(event.data);
        break;
      case 'node:removed':
        this.removeNode(event.id);
        break;
      case 'node:moved':
        this.moveNode(event.id, event.position);
        break;
      case 'node:updated':
        this.updateNodeData(event.id, event.key, event.value);
        break;
      case 'edge:added':
        this.addEdge(event.data);
        break;
      case 'edge:removed':
        this.removeEdge(event.id);
        break;
      case 'full:rebuild':
        this.incrementalSync();
        break;
    }
  }

  // 增量同步 — 基于 key 对账，避免 clearCells 导致的闪烁和历史丢失
  private incrementalSync(): void {
    const dsl = this.netlistManager.serialize();
    const existingNodeIds = new Set(this.graph.getNodes().map(n => n.id));
    const targetNodeIds = new Set(dsl.components.map(c => c.id));

    // 添加新增节点
    for (const comp of dsl.components) {
      if (!existingNodeIds.has(comp.id)) {
        this.addNode(comp);
      } else {
        // 更新已有节点的数据
        const node = this.graph.getCellById(comp.id) as Node;
        if (node) {
          node.setData({
            id: comp.id,
            value: comp.properties?.value || '',
            type: comp.type,
            category: comp.category,
          });
          if (comp.position) {
            node.setPosition(comp.position.x, comp.position.y);
          }
        }
      }
    }

    // 删除多余节点
    for (const id of existingNodeIds) {
      if (!targetNodeIds.has(id)) {
        this.removeNode(id);
      }
    }

    // 同步边（类似逻辑）
    this.syncEdges(dsl.connections);
  }

  addNode(comp: ComponentData): Node {
    const shapeMap: Record<string, string> = {
      resistor: 'schematic-resistor',
      capacitor: 'schematic-capacitor',
      ic: 'schematic-ic',
      // ...
    };

    const shape = shapeMap[comp.category] || 'schematic-generic';
    const node = this.graph.addNode({
      id: comp.id,
      shape,
      x: comp.position?.x || 100,
      y: comp.position?.y || 100,
      data: {
        id: comp.id,
        value: comp.properties?.value || '',
        type: comp.type,
        category: comp.category,
      },
    });

    // 动态配置引脚端口（IC 等多引脚器件）
    if (comp.pins && comp.pins.length > 2) {
      this.configureDynamicPorts(node, comp.pins);
    }

    return node;
  }

  removeNode(id: string): void {
    const node = this.graph.getCellById(id);
    if (node) this.graph.removeCell(node);
  }

  moveNode(id: string, position: Point): void {
    const node = this.graph.getCellById(id) as Node;
    node?.setPosition(position.x, position.y);
  }

  updateNodeData(id: string, key: string, value: string): void {
    const node = this.graph.getCellById(id) as Node;
    if (node) {
      const data = node.getData() || {};
      node.setData({ ...data, [key]: value });
    }
  }

  addEdge(conn: ConnectionData): Edge {
    return this.graph.addEdge({
      shape: 'schematic-wire',
      source: { cell: conn.from.split('.')[0], port: conn.from.split('.')[1] },
      target: { cell: conn.to.split('.')[0], port: conn.to.split('.')[1] },
      data: { net: conn.net },
    });
  }

  private configureDynamicPorts(node: Node, pins: PinData[]): void {
    const leftPins = pins.filter(p => p.side === 'left' || p.type === 'input');
    const rightPins = pins.filter(p => p.side === 'right' || p.type === 'output');

    const ports = [
      ...leftPins.map((p, i) => ({
        id: p.id, group: 'left',
        args: { y: (i + 1) * (node.getSize().height / (leftPins.length + 1)) }
      })),
      ...rightPins.map((p, i) => ({
        id: p.id, group: 'right',
        args: { y: (i + 1) * (node.getSize().height / (rightPins.length + 1)) }
      })),
    ];

    node.addPorts(ports);
  }
}
```

---

## 7. Validation Pipeline（校验管线）

### 7.1 校验链

```typescript
// domain/validation/ValidationPipeline.ts
import { z } from 'zod';

// DSL Schema 定义（Zod）
const DSLComponentSchema = z.object({
  id: z.string().regex(/^[A-Z]+\d+$/),  // R1, C1, U1 格式
  type: z.string().min(1),
  category: z.enum([
    'resistor','capacitor','inductor','diode','led',
    'transistor_npn','transistor_pnp','mosfet_n','mosfet_p',
    'opamp','ic','connector','fuse','crystal','relay'
  ]),
  properties: z.record(z.string()).optional(),
  pins: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['input','output','bidirectional','power','passive']),
  })).min(1),
});

const SchematicDSLSchema = z.object({
  components: z.array(DSLComponentSchema),  // 允许空 Sheet
  connections: z.array(z.object({
    from: z.string().regex(/^[A-Z]+\d+\.\w+$/),  // U1.VIN 格式
    to: z.string().regex(/^[A-Z]+\d+\.\w+$/),
    net: z.string(),
  })),
  netLabels: z.array(z.object({
    name: z.string(),
    type: z.enum(['signal', 'power', 'ground']),
  })).optional(),
  powerSymbols: z.array(z.object({
    name: z.string(),
    type: z.enum(['power', 'ground']),
    net: z.string(),
  })).optional(),
});

export type ValidationResult =
  | { valid: true; dsl: SchematicDSL }
  | { valid: false; errors: ValidationError[]; repairable: boolean };

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'warning';
}

export class ValidationPipeline {
  validate(rawDSL: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    // 阶段 1: Schema 结构校验
    const parseResult = SchematicDSLSchema.safeParse(rawDSL);
    if (!parseResult.success) {
      return {
        valid: false,
        errors: parseResult.error.issues.map(issue => ({
          code: 'SCHEMA_ERROR',
          message: issue.message,
          path: issue.path.join('.'),
          severity: 'error',
        })),
        repairable: true,
      };
    }

    const dsl = parseResult.data as SchematicDSL;

    // 阶段 2: 引用完整性校验
    errors.push(...this.validateReferences(dsl));

    // 阶段 3: 电气规则检查（ERC）
    errors.push(...this.validateERC(dsl));

    // 阶段 4: 位号唯一性检查
    errors.push(...this.validateUniqueIds(dsl));

    const hasErrors = errors.some(e => e.severity === 'error');
    if (hasErrors) {
      return { valid: false, errors, repairable: errors.every(e => e.code !== 'CRITICAL') };
    }

    return { valid: true, dsl };
  }

  private validateReferences(dsl: SchematicDSL): ValidationError[] {
    const errors: ValidationError[] = [];
    const componentIds = new Set(dsl.components.map(c => c.id));
    const pinMap = new Map<string, Set<string>>();

    for (const comp of dsl.components) {
      pinMap.set(comp.id, new Set(comp.pins.map(p => p.id)));
    }

    for (const conn of dsl.connections) {
      for (const ref of [conn.from, conn.to]) {
        const [compId, pinId] = ref.split('.');
        if (!componentIds.has(compId)) {
          errors.push({
            code: 'REF_COMPONENT_NOT_FOUND',
            message: `Component "${compId}" referenced in connection not found`,
            path: ref,
            severity: 'error',
          });
        } else if (pinId && !pinMap.get(compId)?.has(pinId)) {
          errors.push({
            code: 'REF_PIN_NOT_FOUND',
            message: `Pin "${pinId}" not found on component "${compId}"`,
            path: ref,
            severity: 'error',
          });
        }
      }
    }
    return errors;
  }

  private validateERC(dsl: SchematicDSL): ValidationError[] {
    const errors: ValidationError[] = [];

    // 构建 net → pins 映射
    const netPins = new Map<string, { ref: string; type: string }[]>();
    for (const conn of dsl.connections) {
      if (!netPins.has(conn.net)) netPins.set(conn.net, []);
      const fromPin = this.findPin(dsl, conn.from);
      const toPin = this.findPin(dsl, conn.to);
      if (fromPin) netPins.get(conn.net)!.push({ ref: conn.from, type: fromPin.type });
      if (toPin) netPins.get(conn.net)!.push({ ref: conn.to, type: toPin.type });
    }

    // ERC-1: 输出-输出冲突
    for (const [netName, pins] of netPins) {
      const outputs = pins.filter(p => p.type === 'output');
      if (outputs.length > 1) {
        errors.push({
          code: 'ERC_OUTPUT_CONFLICT',
          message: `Multiple outputs on net "${netName}": ${outputs.map(o => o.ref).join(', ')}`,
          severity: 'error',
        });
      }
    }

    // ERC-2: 浮空输入引脚（input 引脚未连接到任何 net）
    for (const comp of dsl.components) {
      for (const pin of comp.pins) {
        if (pin.type === 'input') {
          const pinRef = `${comp.id}.${pin.id}`;
          const isConnected = dsl.connections.some(c => c.from === pinRef || c.to === pinRef);
          if (!isConnected) {
            errors.push({
              code: 'ERC_FLOATING_INPUT',
              message: `Floating input pin: ${pinRef} (${pin.name})`,
              severity: 'error',
            });
          }
        }
      }
    }

    // ERC-3: 未驱动网络（net 上没有任何 output/power 类型引脚）
    for (const [netName, pins] of netPins) {
      const drivers = pins.filter(p => p.type === 'output' || p.type === 'power');
      if (drivers.length === 0) {
        errors.push({
          code: 'ERC_UNDRIVEN_NET',
          message: `Net "${netName}" has no driver (no output or power pin)`,
          severity: 'warning',
        });
      }
    }

    // ERC-4: 电源引脚合理性（power 类型引脚必须连接到 power/ground 类型的 net）
    const powerNets = new Set(
      (dsl.powerSymbols || []).map(ps => ps.net)
    );
    for (const comp of dsl.components) {
      for (const pin of comp.pins) {
        if (pin.type === 'power') {
          const pinRef = `${comp.id}.${pin.id}`;
          const conn = dsl.connections.find(c => c.from === pinRef || c.to === pinRef);
          if (conn && !powerNets.has(conn.net)) {
            errors.push({
              code: 'ERC_POWER_PIN_NOT_ON_POWER_NET',
              message: `Power pin ${pinRef} connected to non-power net "${conn.net}"`,
              severity: 'warning',
            });
          }
        }
      }
    }

    return errors;
  }

  private validateUniqueIds(dsl: SchematicDSL): ValidationError[] {
    const errors: ValidationError[] = [];
    const ids = new Set<string>();
    for (const comp of dsl.components) {
      if (ids.has(comp.id)) {
        errors.push({
          code: 'DUPLICATE_ID',
          message: `Duplicate component ID: ${comp.id}`,
          severity: 'error',
        });
      }
      ids.add(comp.id);
    }
    return errors;
  }

  private findPin(dsl: SchematicDSL, ref: string) {
    const [compId, pinId] = ref.split('.');
    const comp = dsl.components.find(c => c.id === compId);
    return comp?.pins.find(p => p.id === pinId);
  }
}

// AI 输出修复循环 — 校验失败时自动重试
export class RepairOrchestrator {
  constructor(
    private pipeline: ValidationPipeline,
    private maxRetries: number = 2
  ) {}

  async validateWithRepair(
    rawDSL: unknown,
    repairFn: (errors: ValidationError[]) => Promise<unknown>
  ): Promise<ValidationResult> {
    let current = rawDSL;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const result = this.pipeline.validate(current);

      if (result.valid) return result;

      // 不可修复的错误直接返回
      if (!result.repairable || attempt === this.maxRetries) return result;

      // 将结构化错误反馈给 AI 重新生成
      current = await repairFn(result.errors);
    }

    return this.pipeline.validate(current);
  }
}
```

---

## 8. 元器件库设计

### 8.1 符号定义格式

元器件符号采用 **JSON 数据驱动**，渲染逻辑与符号定义分离：

```typescript
// shared/types/library.ts

interface ComponentSymbol {
  id: string;                           // 库内唯一 ID
  name: string;                         // 显示名称
  category: ComponentCategory;
  description: string;

  // 几何定义
  geometry: {
    width: number;
    height: number;
    // SVG path 或预定义的图形原语
    body: SVGPrimitive[];
  };

  // 引脚定义
  pins: SymbolPin[];

  // 默认属性模板
  defaultProperties: Record<string, string>;
}

interface SymbolPin {
  id: string;
  name: string;
  type: PinType;
  side: 'left' | 'right' | 'top' | 'bottom';
  offset: number;                       // 相对该侧的偏移比例 (0-1)
  length: number;                       // 引脚线长度
}

// SVG 图形原语
type SVGPrimitive =
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'polyline'; points: number[] }
  | { type: 'path'; d: string }
  | { type: 'text'; x: number; y: number; text: string; anchor: string };
```

### 8.2 内置元器件定义示例

```json
{
  "id": "resistor_standard",
  "name": "Resistor",
  "category": "resistor",
  "description": "Standard resistor (LCEDA style)",
  "geometry": {
    "width": 80,
    "height": 30,
    "body": [
      { "type": "line", "x1": 0, "y1": 15, "x2": 15, "y2": 15 },
      { "type": "rect", "x": 15, "y": 5, "width": 50, "height": 20 },
      { "type": "line", "x1": 65, "y1": 15, "x2": 80, "y2": 15 }
    ]
  },
  "pins": [
    { "id": "1", "name": "1", "type": "passive", "side": "left", "offset": 0.5, "length": 15 },
    { "id": "2", "name": "2", "type": "passive", "side": "right", "offset": 0.5, "length": 15 }
  ],
  "defaultProperties": {
    "value": "10K",
    "package": "0402",
    "tolerance": "1%"
  }
}
```

### 8.3 动态符号渲染引擎

对于不在内置库中的元器件，根据 AI 提供的引脚配置动态生成通用符号：

```typescript
// domain/library/DynamicSymbolRenderer.ts

export class DynamicSymbolRenderer {
  generateSymbol(config: {
    id: string;
    name: string;
    category: ComponentCategory;
    pins: { id: string; name: string; type: PinType; side?: string }[];
  }): ComponentSymbol {
    const leftPins = config.pins.filter(p => p.side === 'left' || p.type === 'input' || p.type === 'power');
    const rightPins = config.pins.filter(p => p.side === 'right' || p.type === 'output');
    const remainingPins = config.pins.filter(p => !leftPins.includes(p) && !rightPins.includes(p));

    // 未分配侧的引脚平均分配
    remainingPins.forEach((p, i) => {
      if (i % 2 === 0) leftPins.push(p);
      else rightPins.push(p);
    });

    const pinSpacing = 20;
    const maxPins = Math.max(leftPins.length, rightPins.length);
    const height = Math.max(60, (maxPins + 1) * pinSpacing);
    const width = 120;

    return {
      id: config.id,
      name: config.name,
      category: config.category,
      description: `Dynamic symbol for ${config.name}`,
      geometry: {
        width: width + 30,  // 引脚线余量
        height,
        body: [
          { type: 'rect', x: 15, y: 0, width, height },
          { type: 'text', x: 15 + width / 2, y: height / 2, text: config.name, anchor: 'middle' },
        ],
      },
      pins: [
        ...leftPins.map((p, i) => ({
          ...p,
          side: 'left' as const,
          offset: (i + 1) / (leftPins.length + 1),
          length: 15,
        })),
        ...rightPins.map((p, i) => ({
          ...p,
          side: 'right' as const,
          offset: (i + 1) / (rightPins.length + 1),
          length: 15,
        })),
      ],
      defaultProperties: {},
    };
  }
}
```

---

## 9. 导出管线

### 9.1 策略模式接口

```typescript
// main/services/export/ExportStrategy.ts

interface ExportStrategy {
  readonly format: string;
  readonly extension: string;

  export(payload: ExportPayload, options: ExportOptions): Promise<Buffer>;
}

interface ExportPayload {
  schematic: SchematicDSL;        // 领域模型数据
  svgContent: string;             // 预渲染的 SVG 字符串
  metadata: ProjectMetadata;
}
```

### 9.2 SVG 生成（领域模型 → SVG）

导出不依赖 DOM 截图，而是从 Domain Core **独立生成** SVG：

```typescript
// main/services/export/SVGGenerator.ts

export class SVGGenerator {
  private libraryService: LibraryService;

  constructor(libraryService: LibraryService) {
    this.libraryService = libraryService;
  }

  generate(schematic: SchematicDSL, options: SVGOptions): string {
    const { width, height, margin } = options;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg"
      width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    // 背景
    svg += `<rect width="100%" height="100%" fill="white"/>`;

    // 标题栏
    if (options.titleBlock) {
      svg += this.renderTitleBlock(options.titleBlock, width, height);
    }

    // 元器件
    for (const comp of schematic.components) {
      svg += this.renderComponent(comp, margin);
    }

    // 连线
    for (const conn of schematic.connections) {
      svg += this.renderWire(conn);
    }

    // 网络标签
    for (const label of schematic.netLabels || []) {
      svg += this.renderNetLabel(label);
    }

    svg += '</svg>';
    return svg;
  }

  private renderComponent(comp: DSLComponent, offset: Point): string {
    const symbol = this.libraryService.getSymbol(comp.category, comp.type);
    // 将符号定义的 SVG 原语转换为 SVG 标签
    let group = `<g transform="translate(${comp.position?.x || 0 + offset.x}, ${comp.position?.y || 0 + offset.y})">`;
    for (const prim of symbol.geometry.body) {
      group += this.primitiveToSVG(prim);
    }
    // 位号和值
    group += `<text class="ref-des">${comp.id}</text>`;
    group += `<text class="value">${comp.properties?.value || ''}</text>`;
    group += '</g>';
    return group;
  }

  private primitiveToSVG(prim: SVGPrimitive): string {
    switch (prim.type) {
      case 'rect':
        return `<rect x="${prim.x}" y="${prim.y}" width="${prim.width}" height="${prim.height}" fill="none" stroke="#4B8B3B" stroke-width="1.5"/>`;
      case 'line':
        return `<line x1="${prim.x1}" y1="${prim.y1}" x2="${prim.x2}" y2="${prim.y2}" stroke="#4B8B3B" stroke-width="1.5"/>`;
      case 'circle':
        return `<circle cx="${prim.cx}" cy="${prim.cy}" r="${prim.r}" fill="none" stroke="#4B8B3B" stroke-width="1.5"/>`;
      case 'path':
        return `<path d="${prim.d}" fill="none" stroke="#4B8B3B" stroke-width="1.5"/>`;
      default:
        return '';
    }
  }
}
```

### 9.3 PNG/PDF 导出策略

```typescript
// main/services/export/PNGExportStrategy.ts

export class PNGExportStrategy implements ExportStrategy {
  readonly format = 'PNG';
  readonly extension = '.png';

  async export(payload: ExportPayload, options: PNGOptions): Promise<Buffer> {
    // 使用 sharp 或 resvg-js 将 SVG 光栅化为 PNG
    const { default: { Resvg } } = await import('@aspect-dev/resvg-js');
    const resvg = new Resvg(payload.svgContent, {
      fitTo: { mode: 'width', value: options.width || 2000 },
      dpi: options.dpi || 300,
    });
    const pngData = resvg.render();
    return pngData.asPng();
  }
}

// main/services/export/PDFExportStrategy.ts
export class PDFExportStrategy implements ExportStrategy {
  readonly format = 'PDF';
  readonly extension = '.pdf';

  async export(payload: ExportPayload, options: PDFOptions): Promise<Buffer> {
    // Electron 内置 printToPDF
    // 或使用 svg-to-pdf 保持矢量
    const { jsPDF } = await import('jspdf');
    const { SVG2PDF } = await import('svg2pdf.js');

    const doc = new jsPDF({
      orientation: options.orientation || 'landscape',
      unit: 'mm',
      format: options.pageSize || 'a4',
    });

    const svgElement = new DOMParser().parseFromString(
      payload.svgContent, 'image/svg+xml'
    ).documentElement;

    await doc.svg(svgElement, { x: 10, y: 10, width: 277, height: 190 });
    return Buffer.from(doc.output('arraybuffer'));
  }
}

// main/services/export/BOMExportStrategy.ts
export class BOMExportStrategy implements ExportStrategy {
  readonly format = 'BOM';
  readonly extension = '.xlsx';

  async export(payload: ExportPayload): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('BOM');

    // 表头
    sheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '位号', key: 'refDes', width: 15 },
      { header: '名称', key: 'name', width: 20 },
      { header: '值', key: 'value', width: 15 },
      { header: '封装', key: 'package', width: 12 },
      { header: '数量', key: 'quantity', width: 8 },
      { header: '描述', key: 'description', width: 30 },
    ];

    // 合并同类元器件
    const grouped = this.groupComponents(payload.schematic.components);
    grouped.forEach((group, i) => {
      sheet.addRow({
        index: i + 1,
        refDes: group.refDesignators.join(', '),
        name: group.name,
        value: group.value,
        package: group.package,
        quantity: group.quantity,
        description: group.description,
      });
    });

    // 样式
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private groupComponents(components: DSLComponent[]) {
    const map = new Map<string, BOMGroup>();
    for (const comp of components) {
      const key = `${comp.type}_${comp.properties?.value}_${comp.properties?.package}`;
      if (!map.has(key)) {
        map.set(key, {
          name: comp.type,
          value: comp.properties?.value || '',
          package: comp.properties?.package || '',
          description: comp.properties?.description || '',
          refDesignators: [],
          quantity: 0,
        });
      }
      const group = map.get(key)!;
      group.refDesignators.push(comp.id);
      group.quantity++;
    }
    return Array.from(map.values());
  }
}
```

### 9.4 ExportService 注册

```typescript
// main/services/ExportService.ts

export class ExportService {
  private strategies = new Map<string, ExportStrategy>();
  private svgGenerator: SVGGenerator;

  constructor() {
    this.svgGenerator = new SVGGenerator(new LibraryService());
    this.strategies.set('png', new PNGExportStrategy());
    this.strategies.set('pdf', new PDFExportStrategy());
    this.strategies.set('bom', new BOMExportStrategy());
  }

  // 预留：注册新导出格式
  registerStrategy(strategy: ExportStrategy): void {
    this.strategies.set(strategy.format.toLowerCase(), strategy);
  }

  async toPNG(data: ExportPayload, options: PNGOptions): Promise<string> {
    const svgContent = this.svgGenerator.generate(data.schematic, options);
    const strategy = this.strategies.get('png')!;
    const buffer = await strategy.export({ ...data, svgContent }, options);
    return this.saveFile(buffer, options.outputPath, '.png');
  }

  async toPDF(data: ExportPayload, options: PDFOptions): Promise<string> {
    const svgContent = this.svgGenerator.generate(data.schematic, options);
    const strategy = this.strategies.get('pdf')!;
    const buffer = await strategy.export({ ...data, svgContent }, options);
    return this.saveFile(buffer, options.outputPath, '.pdf');
  }

  async toBOM(components: ComponentData[]): Promise<string> {
    const strategy = this.strategies.get('bom')!;
    const payload: ExportPayload = {
      schematic: { components, connections: [], netLabels: [], powerSymbols: [] },
      svgContent: '',
      metadata: { name: '', createdAt: Date.now() },
    };
    const buffer = await strategy.export(payload, {});
    return this.saveFile(buffer, '', '.xlsx');
  }

  private async saveFile(buffer: Buffer, basePath: string, ext: string): Promise<string> {
    const path = basePath.endsWith(ext) ? basePath : basePath + ext;
    await fs.promises.writeFile(path, buffer);
    return path;
  }
}
```

---

## 10. 版本管理

### 10.1 版本数据结构

```typescript
// main/services/VersionService.ts

interface VersionEntry {
  id: string;                           // UUID
  timestamp: number;
  type: 'snapshot' | 'incremental';
  description: string;                  // 自动生成的变更描述
  operations?: SerializedCommand[];     // 增量操作
  snapshotPath?: string;                // 快照文件路径
}

interface VersionTimeline {
  projectId: string;
  entries: VersionEntry[];
  currentIndex: number;
}

interface SemanticDiff {
  added: { type: string; id: string; description: string }[];
  removed: { type: string; id: string; description: string }[];
  modified: { type: string; id: string; field: string; from: string; to: string }[];
  moved: { id: string; from: Point; to: Point }[];
}
```

### 10.2 版本存储策略

```
每 N 次操作 或 每 M 分钟 → 创建完整快照
每次操作 → 记录增量 Command

恢复流程：
  1. 加载最近的快照
  2. 依次重放快照之后的增量 Command
  3. 到达目标版本
```

### 10.3 语义化 Diff

```typescript
export class SemanticDiffEngine {
  diff(v1: SchematicDSL, v2: SchematicDSL): SemanticDiff {
    const result: SemanticDiff = { added: [], removed: [], modified: [], moved: [] };

    const v1Map = new Map(v1.components.map(c => [c.id, c]));
    const v2Map = new Map(v2.components.map(c => [c.id, c]));

    // 新增
    for (const [id, comp] of v2Map) {
      if (!v1Map.has(id)) {
        result.added.push({ type: 'component', id, description: `${comp.category} ${comp.type}` });
      }
    }

    // 删除
    for (const [id, comp] of v1Map) {
      if (!v2Map.has(id)) {
        result.removed.push({ type: 'component', id, description: `${comp.category} ${comp.type}` });
      }
    }

    // 修改和移动
    for (const [id, v2Comp] of v2Map) {
      const v1Comp = v1Map.get(id);
      if (!v1Comp) continue;

      // 位置变更 → 移动
      if (v1Comp.position && v2Comp.position &&
          (v1Comp.position.x !== v2Comp.position.x || v1Comp.position.y !== v2Comp.position.y)) {
        result.moved.push({ id, from: v1Comp.position, to: v2Comp.position });
      }

      // 参数变更
      if (v1Comp.properties && v2Comp.properties) {
        for (const key of Object.keys(v2Comp.properties)) {
          if (v1Comp.properties[key] !== v2Comp.properties[key]) {
            result.modified.push({
              type: 'parameter', id, field: key,
              from: v1Comp.properties[key] || '', to: v2Comp.properties[key],
            });
          }
        }
      }
    }

    return result;
  }
}
```

---

## 11. 状态管理（Zustand）

```typescript
// renderer/stores/schematicStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface SchematicState {
  // 项目状态
  projectPath: string | null;
  projectName: string;
  isDirty: boolean;

  // 当前 Sheet
  activeSheetId: string;
  sheets: Sheet[];

  // 选中状态
  selectedComponentIds: string[];
  selectedWireIds: string[];

  // AI 状态
  aiStatus: 'idle' | 'generating' | 'analyzing' | 'error';
  aiMessages: ChatMessage[];

  // 操作
  setProject: (path: string, name: string) => void;
  setDirty: (dirty: boolean) => void;
  setActiveSheet: (id: string) => void;
  setSelection: (componentIds: string[], wireIds: string[]) => void;
  clearSelection: () => void;
  setAIStatus: (status: SchematicState['aiStatus']) => void;
  addAIMessage: (message: ChatMessage) => void;
}

export const useSchematicStore = create<SchematicState>()(
  subscribeWithSelector((set) => ({
    projectPath: null,
    projectName: '',
    isDirty: false,
    activeSheetId: 'sheet_1',
    sheets: [{ id: 'sheet_1', name: 'Sheet 1', order: 0, size: { width: 4000, height: 3000 } }],
    selectedComponentIds: [],
    selectedWireIds: [],
    aiStatus: 'idle',
    aiMessages: [],

    setProject: (path, name) => set({ projectPath: path, projectName: name, isDirty: false }),
    setDirty: (dirty) => set({ isDirty: dirty }),
    setActiveSheet: (id) => set({ activeSheetId: id }),
    setSelection: (componentIds, wireIds) =>
      set({ selectedComponentIds: componentIds, selectedWireIds: wireIds }),
    clearSelection: () => set({ selectedComponentIds: [], selectedWireIds: [] }),
    setAIStatus: (status) => set({ aiStatus: status }),
    addAIMessage: (message) => set(s => ({ aiMessages: [...s.aiMessages, message] })),
  }))
);
```

---

## 12. FileService（原子写入）

```typescript
// main/services/FileService.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export class FileService {
  // 原子写入：先写临时文件，再 rename 替换
  async atomicWrite(filePath: string, data: string): Promise<void> {
    const dir = path.dirname(filePath);
    const tmpPath = path.join(dir, `.tmp_${randomUUID()}`);

    try {
      await fs.writeFile(tmpPath, data, 'utf-8');
      await fs.rename(tmpPath, filePath);
    } catch (err) {
      // 清理临时文件
      await fs.unlink(tmpPath).catch(() => {});
      throw err;
    }
  }

  async createProject(name: string, projectPath: string): Promise<ProjectData> {
    const dirs = ['sheets', 'history', 'history/snapshots', 'chat'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(projectPath, dir), { recursive: true });
    }

    const project: ProjectMeta = {
      id: randomUUID(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: '1.0',
      sheets: ['sheet_1'],
    };

    await this.atomicWrite(
      path.join(projectPath, 'project.json'),
      JSON.stringify(project, null, 2)
    );

    // 创建默认 Sheet
    const defaultSheet: SchematicSheet = {
      id: 'sheet_1',
      name: 'Sheet 1',
      components: [],
      wires: [],
      netLabels: [],
      powerSymbols: [],
      metadata: { width: 4000, height: 3000 },
    };

    await this.atomicWrite(
      path.join(projectPath, 'sheets', 'sheet_1.json'),
      JSON.stringify(defaultSheet, null, 2)
    );

    return { meta: project, sheets: [defaultSheet], conversations: [] };
  }

  async saveProject(data: ProjectData): Promise<void> {
    const { meta, sheets, conversations } = data;
    const projectPath = meta.path;

    // 更新时间戳
    meta.updatedAt = Date.now();
    await this.atomicWrite(
      path.join(projectPath, 'project.json'),
      JSON.stringify(meta, null, 2)
    );

    // 保存各 Sheet
    for (const sheet of sheets) {
      await this.atomicWrite(
        path.join(projectPath, 'sheets', `${sheet.id}.json`),
        JSON.stringify(sheet, null, 2)
      );
    }

    // 保存对话历史
    if (conversations?.length) {
      await this.atomicWrite(
        path.join(projectPath, 'chat', 'conversations.json'),
        JSON.stringify(conversations, null, 2)
      );
    }

    // 更新最近项目列表
    await this.updateRecentProjects(projectPath, meta.name);
  }
}
```

---

## 13. 性能优化策略

| 场景 | 策略 | 实现方式 |
|------|------|---------|
| 大量元器件渲染 | 视口裁剪 | X6 内置虚拟渲染，仅渲染可见区域节点 |
| 拖拽实时路由 | 降级路由 | 拖拽中切换 `orth` 路由，释放后恢复 `manhattan` |
| AI 流式响应 | 增量渲染 | DSL chunk 到达后增量添加节点，非全量刷新 |
| 自动保存 | 防抖 + 增量 | 变更后 5s 防抖触发，仅保存变更的 Sheet |
| 版本快照 | 异步 + 压缩 | 快照在 Worker 线程中序列化和压缩 |
| 元器件搜索 | 内存索引 | 启动时建立倒排索引，即时匹配 |

**X6 拖拽性能优化**：

```typescript
// 使用 Selection 插件的 movingRouterFallback
graph.use(
  new Selection({
    movingRouterFallback: 'orth',  // 拖拽时降级为轻量路由
  })
);
```

---

## 14. 安全设计

### 14.1 API Key 加密存储（统一入口）

```typescript
// main/services/SecureStorage.ts
import { safeStorage } from 'electron';
import Store from 'electron-store';

const store = new Store<{ apiKey?: number[] }>({ name: 'secure-config' });

export class SecureStorage {
  static saveApiKey(key: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('System encryption not available');
    }
    const encrypted = safeStorage.encryptString(key);
    store.set('apiKey', Array.from(encrypted));
  }

  static loadApiKey(): string | null {
    const data = store.get('apiKey');
    if (!data) return null;
    return safeStorage.decryptString(Buffer.from(data));
  }

  static deleteApiKey(): void {
    store.delete('apiKey');
  }

  static hasApiKey(): boolean {
    return store.has('apiKey');
  }
}
```

### 14.2 安全约束

| 约束 | 实现 |
|------|------|
| CSP 策略 | Renderer 禁止加载外部脚本 |
| Node Integration | 禁用，通过 preload + contextBridge 暴露有限 API |
| API 通信 | 仅 Main Process 持有 API Key，Renderer 无法直接访问 |
| 文件访问 | 通过 IPC 中转，Renderer 不直接操作文件系统 |

---

## 15. 工程目录结构

```
ai-schematic-generator/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
│
├── src/
│   ├── main/                          # Electron Main Process
│   │   ├── index.ts                   # 入口、窗口管理
│   │   ├── ipc.ts                     # IPC Handler 注册
│   │   └── services/
│   │       ├── AIService.ts
│   │       ├── FileService.ts
│   │       ├── ExportService.ts
│   │       ├── VersionService.ts
│   │       ├── LibraryService.ts
│   │       ├── SecureStorage.ts
│   │       ├── ai/
│   │       │   ├── ClaudeProvider.ts
│   │       │   └── types.ts
│   │       └── export/
│   │           ├── ExportStrategy.ts
│   │           ├── PNGExportStrategy.ts
│   │           ├── PDFExportStrategy.ts
│   │           ├── BOMExportStrategy.ts
│   │           └── SVGGenerator.ts
│   │
│   ├── preload/
│   │   └── index.ts                   # contextBridge API
│   │
│   ├── renderer/                      # Electron Renderer Process
│   │   ├── index.html
│   │   ├── main.tsx                   # React 入口
│   │   ├── App.tsx
│   │   │
│   │   ├── components/                # UI 组件
│   │   │   ├── Layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── MenuBar.tsx
│   │   │   │   └── StatusBar.tsx
│   │   │   ├── Canvas/
│   │   │   │   ├── SchematicCanvas.tsx
│   │   │   │   └── MiniMap.tsx
│   │   │   ├── AIPanel/
│   │   │   │   ├── AIChatPanel.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   └── ChatInput.tsx
│   │   │   ├── Library/
│   │   │   │   ├── ComponentLibrary.tsx
│   │   │   │   ├── CategoryTree.tsx
│   │   │   │   └── ComponentItem.tsx
│   │   │   ├── Property/
│   │   │   │   ├── PropertyEditor.tsx
│   │   │   │   └── PinEditor.tsx
│   │   │   ├── Sheet/
│   │   │   │   └── SheetTabs.tsx
│   │   │   ├── Version/
│   │   │   │   ├── VersionHistory.tsx
│   │   │   │   └── VersionDiff.tsx
│   │   │   └── Welcome/
│   │   │       └── WelcomePage.tsx
│   │   │
│   │   ├── stores/                    # Zustand stores
│   │   │   ├── schematicStore.ts
│   │   │   └── settingsStore.ts
│   │   │
│   │   └── hooks/                     # React hooks
│   │       ├── useAI.ts
│   │       ├── useCanvas.ts
│   │       ├── useKeyboard.ts
│   │       └── useAutoSave.ts
│   │
│   ├── domain/                        # Domain Core (进程无关)
│   │   ├── models/
│   │   │   ├── Netlist.ts
│   │   │   └── types.ts
│   │   ├── NetlistManager.ts
│   │   ├── ConnectivityGraph.ts
│   │   ├── commands/
│   │   │   ├── Command.ts
│   │   │   ├── CommandBus.ts
│   │   │   ├── AddComponentCommand.ts
│   │   │   ├── RemoveComponentCommand.ts
│   │   │   ├── MoveComponentCommand.ts
│   │   │   ├── AddWireCommand.ts
│   │   │   ├── ModifyParameterCommand.ts
│   │   │   └── BatchCommand.ts
│   │   ├── validation/
│   │   │   └── ValidationPipeline.ts
│   │   └── library/
│   │       ├── DynamicSymbolRenderer.ts
│   │       └── SymbolRegistry.ts
│   │
│   ├── shared/                        # 跨进程共享类型
│   │   └── types/
│   │       ├── ai.ts
│   │       ├── project.ts
│   │       ├── schematic.ts
│   │       ├── library.ts
│   │       ├── export.ts
│   │       └── electron.d.ts
│   │
│   └── view/                          # X6 视图层
│       ├── canvas/
│       │   ├── SchematicGraph.ts
│       │   └── GraphSyncer.ts
│       └── shapes/
│           ├── registerShapes.ts
│           └── components/
│               ├── ResistorNode.tsx
│               ├── CapacitorNode.tsx
│               ├── DiodeNode.tsx
│               ├── TransistorNode.tsx
│               ├── ICNode.tsx
│               ├── GenericNode.tsx
│               ├── NetLabelNode.tsx
│               └── PowerSymbolNode.tsx
│
├── resources/                         # 静态资源
│   ├── library/                       # 元器件库定义 (JSON)
│   │   ├── passive.json
│   │   ├── diodes.json
│   │   ├── transistors.json
│   │   ├── ics.json
│   │   └── connectors.json
│   └── icons/
│
└── tests/
    ├── domain/
    │   ├── NetlistManager.test.ts
    │   ├── ConnectivityGraph.test.ts
    │   ├── CommandBus.test.ts
    │   └── ValidationPipeline.test.ts
    └── services/
        ├── AIService.test.ts
        └── ExportService.test.ts
```

---

## 16. 关键交互时序

### 16.1 AI 生成原理图

```
User          AIChatPanel      AIService(Main)    ClaudeProvider     Anthropic API
 │                │                  │                  │                  │
 │ "设计LDO电路"   │                  │                  │                  │
 │───────────────▶│                  │                  │                  │
 │                │ IPC:ai:generate  │                  │                  │
 │                │─────────────────▶│                  │                  │
 │                │                  │  generate()      │                  │
 │                │                  │─────────────────▶│                  │
 │                │                  │                  │ messages.create() │
 │                │                  │                  │  + tools          │
 │                │                  │                  │─────────────────▶│
 │                │                  │                  │                  │
 │                │                  │                  │  tool_use block  │
 │                │                  │                  │◀─────────────────│
 │                │                  │  DSLChunk        │                  │
 │                │                  │◀─────────────────│                  │
 │                │ ai:stream-chunk  │                  │                  │
 │                │◀─────────────────│                  │                  │
 │                │                  │                  │                  │
 │                │ ValidationPipeline.validate()       │                  │
 │                │──────────┐       │                  │                  │
 │                │          │ valid │                  │                  │
 │                │◀─────────┘       │                  │                  │
 │                │                  │                  │                  │
 │                │ NetlistManager.loadFromDSL()        │                  │
 │                │──────────┐       │                  │                  │
 │                │          │       │                  │                  │
 │                │◀─────────┘       │                  │                  │
 │                │                  │                  │                  │
 │                │ GraphSyncer.fullSync()              │                  │
 │                │──────────┐       │                  │                  │
 │  渲染到画布     │          │       │                  │                  │
 │◀───────────────│◀─────────┘       │                  │                  │
```

### 16.2 画布编辑操作

```
User         SchematicCanvas    CommandBus    NetlistManager    GraphSyncer
 │                │                │               │               │
 │ 拖拽元器件      │                │               │               │
 │───────────────▶│                │               │               │
 │                │ MoveComponentCommand           │               │
 │                │───────────────▶│               │               │
 │                │                │ execute()     │               │
 │                │                │──────────────▶│               │
 │                │                │               │ moveComponent │
 │                │                │               │───────┐       │
 │                │                │               │◀──────┘       │
 │                │                │ syncMove()    │               │
 │                │                │──────────────────────────────▶│
 │                │                │               │               │
 │                │                │ notify listeners              │
 │                │                │──────┐        │               │
 │                │                │◀─────┘        │               │
 │                │                │ → VersionService 记录增量      │
 │                │                │ → AutoSave 触发防抖           │
```

---

## 17. 错误处理与恢复

### 17.1 崩溃恢复

```typescript
// main/services/CrashRecovery.ts

export class CrashRecovery {
  private recoveryDir: string;

  constructor(appDataPath: string) {
    this.recoveryDir = path.join(appDataPath, 'recovery');
  }

  // 应用启动时检查
  async checkRecovery(): Promise<RecoveryData | null> {
    const lockFile = path.join(this.recoveryDir, 'session.lock');
    const exists = await fs.access(lockFile).then(() => true).catch(() => false);

    if (exists) {
      // 检查锁文件是否属于已死亡的进程
      const lockData = JSON.parse(await fs.readFile(lockFile, 'utf-8'));
      const isStale = !this.isProcessAlive(lockData.pid)
        || (Date.now() - lockData.startedAt > 24 * 60 * 60 * 1000); // 超过24h视为过期

      if (isStale) {
        const recoveryFile = path.join(this.recoveryDir, 'autosave.json');
        const data = await fs.readFile(recoveryFile, 'utf-8').catch(() => null);
        return data ? JSON.parse(data) : null;
      }
    }
    return null;
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0); // 信号0不杀进程，仅检查是否存在
      return true;
    } catch {
      return false;
    }
  }

  // 创建会话锁
  async startSession(): Promise<void> {
    await fs.mkdir(this.recoveryDir, { recursive: true });
    await fs.writeFile(
      path.join(this.recoveryDir, 'session.lock'),
      JSON.stringify({ pid: process.pid, startedAt: Date.now() })
    );
  }

  // 正常退出时清理
  async endSession(): Promise<void> {
    await fs.unlink(path.join(this.recoveryDir, 'session.lock')).catch(() => {});
    await fs.unlink(path.join(this.recoveryDir, 'autosave.json')).catch(() => {});
  }

  // 自动保存恢复数据
  async saveRecoveryData(data: ProjectData): Promise<void> {
    const recoveryFile = path.join(this.recoveryDir, 'autosave.json');
    await fs.writeFile(recoveryFile, JSON.stringify(data));
  }
}
```

### 17.2 AI 错误重试

```typescript
// main/services/ai/RetryPolicy.ts

interface APIError extends Error {
  status?: number;
  headers?: Record<string, string>;
}

function isAPIError(err: unknown): err is APIError {
  return err instanceof Error && 'status' in err;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; baseDelay: number } = { maxRetries: 3, baseDelay: 1000 }
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let i = 0; i <= options.maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      lastError = err;

      // 不可重试的错误
      if (isAPIError(err) && (err.status === 401 || err.status === 403)) throw err;
      if (err.name === 'AbortError') throw err;

      // 速率限制 → 等待 Retry-After
      if (isAPIError(err) && err.status === 429) {
        const retryAfter = err.headers?.['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : options.baseDelay * (i + 1);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // 其他错误 → 指数退避
      if (i < options.maxRetries) {
        await new Promise(r => setTimeout(r, options.baseDelay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}
```

---

## 18. 扩展点

| 扩展点 | 接口 | 扩展方式 |
|--------|------|---------|
| AI 模型 | `AIProvider` | 实现接口，注册到 AIService |
| 导出格式 | `ExportStrategy` | 实现接口，注册到 ExportService |
| 元器件库 | `ComponentSymbol` JSON | 添加 JSON 定义文件到 `resources/library/` |
| ERC 规则 | `ERCRule` | 添加规则到 ValidationPipeline |
| 渲染引擎 | `GraphSyncer` | 替换 X6 实现为 Canvas/WebGL 实现 |
| 快捷键 | `KeyboardShortcut` | 注册到 Keyboard 插件 |
