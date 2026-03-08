# AI Schematic Generator

> AI 驱动的电路原理图生成与编辑工具 — 自然语言描述，秒出专业原理图

## 简介

AI Schematic Generator 是一款 **Windows 桌面端** 的 AI 电路原理图工具。用户通过自然语言描述电路需求，AI 自动生成符合嘉立创 EDA 符号标准的原理图，并提供完整的画布编辑、AI 分析、项目管理与多格式导出能力。

**定位边界**：专注于原理图（Schematic）的 AI 生成与编辑，不涉及 PCB Layout、电路仿真和 Gerber 文件生成。

## 核心功能

### AI 原理图生成
- 自然语言 → 结构化中间 DSL → Validation Pipeline → 渲染到画布
- 支持流式输出，生成过程实时可见
- 元器件符号遵循嘉立创 EDA 标准

### 画布编辑器
- 元器件拖拽放置、参数编辑、连线管理
- 完整 Undo/Redo 支持（命令模式）
- 网格吸附、对齐辅助线、多选批量操作

### AI 对话式交互
- 侧边栏常驻对话面板，支持上下文感知的迭代修改
- 多轮对话，AI 理解当前原理图状态
- 对话历史随项目保存

### AI 电路分析
- 电路功能正确性检查
- 元器件参数合理性验证
- 悬空引脚、短路等 DRC 检测
- 结构化分析报告（错误 / 警告 / 建议 三级分类）

### 元器件库（40+ 种类）

| 类别 | 元器件 |
|------|--------|
| 无源器件 | 电阻、电容（瓷片/电解）、电感、磁珠、保险丝 |
| 二极管 | 普通二极管、稳压管、肖特基二极管、LED |
| 三极管 | NPN、PNP |
| MOS 管 | N-MOS、P-MOS |
| 运算放大器 | OpAmp |
| 逻辑门 | 与门、或门、非门、与非门、或非门 |
| 常用 IC | 555 定时器、LDO、DC-DC、MCU 通用封装 |
| 连接器 | 排针、排母、USB、DC 电源座 |
| 电源符号 | VCC、VDD、GND、+3.3V、+5V、+12V |
| 其他 | 晶振、蜂鸣器、继电器 |

### 项目管理
- 创建 / 保存 / 打开 / 最近项目列表
- 自动保存（变更后 ≤ 5 秒触发）
- 原子写入，防止文件损坏

### 版本历史
- 自动快照（上限 50 条）
- 时间线 UI，一键回滚到任意历史版本

### 多格式导出

| 格式 | 说明 |
|------|------|
| PNG | 高分辨率位图 |
| PDF | 矢量 PDF，支持横/竖版 |
| BOM | Excel (.xlsx)，含位号/名称/值/封装/数量 |

## 技术架构

```
┌─────────────────────────────────────────┐
│              Electron Shell             │
├──────────────────┬──────────────────────┤
│   Main Process   │   Renderer Process   │
│   (Node.js)      │   (React + AntV X6)  │
│                  │                      │
│  FileService     │  View Layer          │
│  AIService       │  ↕ Command Bus       │
│  ExportService   │  ↕ Domain Core       │
│  VersionService  │  ↕ Validation        │
└──────────────────┴──────────────────────┘
           ↕ IPC (contextBridge)
         AI Adapter Layer (Claude)
```

**核心原则**：
- **领域驱动**：电路"真相"在 Domain Core，X6 仅作视图投影
- **命令模式**：所有画布操作经 Command Bus 调度，天然支持 Undo/Redo
- **适配器模式**：AI 引擎标准化接口，预留多模型扩展
- **策略模式**：导出格式可独立扩展

## 技术栈

| 层次 | 技术 |
|------|------|
| 桌面框架 | Electron 33 |
| 前端框架 | React 18 + TypeScript |
| 图编辑引擎 | AntV X6 2.19.2 |
| 状态管理 | Zustand |
| UI 组件库 | Ant Design 5.x |
| AI 集成 | Anthropic SDK (Claude) |
| BOM 导出 | ExcelJS |
| 构建工具 | electron-vite |

## 快速开始

**环境要求**：Node.js ≥ 18，Windows 10/11

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

启动后，在设置中填入 Anthropic API Key，即可使用 AI 功能。

## 迭代进度

| 迭代 | 目标 | 状态 |
|------|------|------|
| Iteration 1 | Electron 脚手架 + X6 画布基础 | ✅ 完成 |
| Iteration 2 | Domain Core + AI 生成流水线 | ✅ 完成 |
| Iteration 3 | 文件持久化 + 属性编辑 + 导出 | ✅ 完成 |
| Iteration 4 | AI 分析 + BOM 导出 + 版本历史 + 元器件库扩展 | ✅ 完成 |
| Iteration 5 | 多模型支持 + 高级导出 + 性能优化 | 🔜 规划中 |

## 项目文档

- [`docs/PRD.md`](docs/PRD.md) — 产品需求文档
- [`docs/architecture.md`](docs/architecture.md) — 技术架构设计
- [`docs/ui-design.md`](docs/ui-design.md) — UI 交互设计
- [`openspec/specs/iteration-roadmap.md`](openspec/specs/iteration-roadmap.md) — 迭代路线图
