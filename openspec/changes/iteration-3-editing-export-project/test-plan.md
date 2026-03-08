# Iteration 3 手动测试文档

**前置条件**
- 执行 `npm run dev` 启动开发环境
- 准备一个已配置好的 Anthropic API Key（用于 AI 相关测试）
- 打开 DevTools：菜单 `View › Developer Tools`（用于部分日志验证）

---

## T1 — 新建项目与文件保存

**目标**：验证 Ctrl+S 能创建真实的 `.aischematic` 文件。

**步骤：**

1. 启动应用，出现欢迎页
2. 点击欢迎页「New Project」按钮，输入项目名称（如 `TestProject`），选择保存位置
3. 进入编辑器，从左侧组件库**双击**添加 3 个组件（例如 2 个电阻 + 1 个电容）
4. 观察窗口标题栏
5. 按 `Ctrl+S` 保存
6. 打开系统文件管理器，导航到步骤 2 选择的保存目录

**预期结果：**
- 步骤 4：标题显示 `● TestProject — AI Schematic`（● 表示有未保存变更）
- 步骤 5：标题变为 `TestProject — AI Schematic`（● 消失）
- 步骤 6：目录下出现 `TestProject.aischematic` 文件
- 用记事本/VSCode 打开该文件，内容为合法 JSON，且包含三个顶层字段：`schema`、`canvas`、`meta`，其中 `meta.version` 为 `"1.0"`

---

## T2 — 另存为

**目标**：验证 Save As 可以另存到新路径。

**步骤：**

1. 在 T1 的基础上，按 `Ctrl+Shift+S`（菜单 `File › Save As...`）
2. 选择不同的目录和文件名（如 `TestProject_copy.aischematic`）
3. 检查标题栏和新路径

**预期结果：**
- 新路径下出现另存的文件
- 标题 ● 消失，说明当前 projectPath 已更新为新路径
- 后续 Ctrl+S 保存的是新路径的文件（非原文件）

---

## T3 — 打开项目（文件恢复）

**目标**：验证打开已保存的 `.aischematic` 文件能恢复画布和域状态。

**步骤：**

1. 关闭当前项目（菜单 `File › New Project` 回到欢迎页）
2. 菜单 `File › Open Project...`，选择 T1 保存的 `.aischematic` 文件
3. 观察画布和属性

**预期结果：**
- 画布上出现与保存前相同的 3 个组件，位置一致
- 窗口标题显示 `TestProject — AI Schematic`（无 ●）
- 组件数量与保存前相同

---

## T4 — 打开项目（未保存提示）

**目标**：验证有未保存变更时打开新项目会弹出提示。

**步骤：**

1. 在打开的项目中，添加一个新组件（不保存）
2. 菜单 `File › Open Project...`
3. 出现对话框后，选择「**Cancel**」
4. 再次执行菜单 `File › Open Project...`，这次选择「**Discard**」
5. 选择一个 `.aischematic` 文件打开

**预期结果：**
- 步骤 3：对话框关闭，画布内容不变，仍处于当前项目（脏状态）
- 步骤 4~5：新项目正常打开，原有未保存内容被丢弃

---

## T5 — 最近项目

**目标**：验证 Recent Projects 菜单正确显示并能打开项目。

**步骤：**

1. 完成 T1（已保存至少一个项目）
2. 点击菜单 `File › Recent Projects`
3. 点击列表中的项目名称

**预期结果：**
- 步骤 2：子菜单中显示最近保存的项目名称
- 步骤 3：该项目正常加载到画布（同 T3 的效果）

---

## T6 — 自动保存

**目标**：验证 60 秒后文件会自动更新。

**步骤：**

1. 打开或新建一个已有项目路径的项目（Ctrl+S 至少保存过一次）
2. 在文件管理器中记录 `.aischematic` 文件的「修改时间」
3. 等待约 **65 秒**（不执行任何手动保存）
4. 在文件管理器刷新，查看文件「修改时间」

**预期结果：**
- 文件修改时间更新了，说明自动保存成功触发
- 应用界面无任何提示弹窗（自动保存是静默的）

> ⚠️ 注意：自动保存只有在 projectPath 已设置（即 Ctrl+S 过至少一次）时才会激活。

---

## T7 — 属性面板编辑

**目标**：验证 PropertyPanel 可以正确显示和编辑组件属性。

**步骤：**

1. 在画布上**单击**一个电阻组件
2. 观察画布下方属性面板（如果不可见，可能需要确认有节点被选中）
3. 面板中修改「RefDes」字段（如改为 `R99`），按 **Enter** 或点击其他字段（触发 blur）
4. 修改「Value」字段（如改为 `10kΩ`），按 Enter
5. 修改「Package」字段（如填写 `0402`），按 Enter
6. 在画布上查看组件标注是否更新

**预期结果：**
- 步骤 1：属性面板显示，包含 RefDes、Value、Package、Tolerance、Rating、Notes 输入框，及只读的 X/Y 坐标和旋转角度
- 步骤 3~5：字段值可正常输入并提交
- 步骤 6：画布上该组件的 refDes 标签更新
- 窗口标题出现 ●（isDirty = true）

---

## T8 — 属性验证（必填字段）

**目标**：验证 RefDes 和 Value 为空时不允许提交。

**步骤：**

1. 选中一个组件，打开属性面板
2. 清空「RefDes」字段，按 Enter
3. 清空「Value」字段，按 Enter

**预期结果：**
- 步骤 2~3：字段显示红色验证提示「Required」，命令不被派发（画布和 undo 历史不变）

---

## T9 — 属性编辑 Undo/Redo

**目标**：验证属性修改通过 CommandBus，支持 Ctrl+Z/Ctrl+Y。

**步骤：**

1. 选中一个组件，记录当前 RefDes 值（如 `R1`）
2. 将 RefDes 改为 `R99`，按 Enter（提交）
3. 按 `Ctrl+Z`（Undo）
4. 再按 `Ctrl+Y`（Redo）

**预期结果：**
- 步骤 2：值变为 `R99`，面板显示 `R99`
- 步骤 3：值恢复为 `R1`，面板**自动刷新**显示 `R1`（无需重新选择组件）
- 步骤 4：值再次变为 `R99`

---

## T10 — 多选时属性面板

**目标**：验证多选时属性面板显示占位符。

**步骤：**

1. 按住 Ctrl 或用框选，选中 2 个以上组件
2. 观察属性面板

**预期结果：**
- 属性面板显示 `N components selected`，不显示编辑表单

---

## T11 — 菜单操作验证

**目标**：验证 Edit 和 View 菜单的操作有效。

**步骤：**

1. 添加几个组件到画布
2. 菜单 `Edit › Select All`
3. 菜单 `Edit › Delete`
4. 菜单 `Edit › Undo`
5. 菜单 `View › Zoom In`（重复 3 次）
6. 菜单 `View › Zoom Out`（重复 3 次）
7. 菜单 `View › Zoom to Fit`

**预期结果：**
- 步骤 2：所有节点被选中（蓝色高亮框）
- 步骤 3：所有组件从画布移除
- 步骤 4：组件恢复
- 步骤 5~6：画布正确缩放
- 步骤 7：画布缩放到适合窗口

---

## T12 — 导出 PNG

**目标**：验证 PNG 导出正常生成文件。

**步骤：**

1. 画布上有至少 2 个组件
2. 菜单 `Tools › Export › Export PNG...`
3. 弹出系统保存对话框，选择保存路径（如桌面 `test.png`）
4. 出现 ExportDialog，选择缩放倍率「**2×**」，点击「Export」
5. 用图片查看器打开生成的 PNG 文件

**预期结果：**
- 步骤 4：Modal 出现，显示缩放选项 1×/2×/4×
- 步骤 5：PNG 文件存在，包含画布上的元件图形，背景为白色
- 应用显示「Export successful」提示

---

## T13 — 取消导出不触发 IPC

**目标**：验证取消导出不会写入文件。

**步骤：**

1. 菜单 `Tools › Export › Export PNG...`
2. 保存对话框选择路径后，在 ExportDialog 中点击「**Cancel**」

**预期结果：**
- 没有文件被写入
- 没有任何 IPC 调用

---

## T14 — 导出 PDF

**目标**：验证 PDF 导出正常生成文件。

**步骤：**

1. 画布上有至少 2 个组件
2. 菜单 `Tools › Export › Export PDF...`
3. 选择保存路径（如桌面 `test.pdf`）
4. ExportDialog 中选择「**Portrait**」（竖向），点击「Export」
5. 用 PDF 阅读器打开生成的文件

**预期结果：**
- PDF 文件存在且可打开
- 内容包含画布渲染结果
- 应用显示「Export successful」提示

> ⚠️ 说明：PDF 导出使用 Electron 的 `printToPDF` 实现，导出内容为整个渲染器页面，不是仅画布区域。这是当前版本的已知限制，下一版本可优化。

---

## T15 — AI 生成模式（需要 API Key）

**目标**：验证初始画布（空画布）时 AI 使用「生成」模式。

**前置**：已在 `File › Settings` 配置有效的 API Key。

**步骤：**

1. 新建项目，确保画布为空
2. 打开 DevTools，切到 Console 面板
3. 在 AI Chat Panel 输入框上方确认**没有** `Modify mode` 标签
4. 输入 `add a simple LED circuit with a resistor`，点击发送
5. 观察 DevTools Console 和画布变化

**预期结果：**
- 步骤 3：输入框上方无 Tag（生成模式）
- 步骤 4：Console 中出现 `ai:generate` IPC 调用，不是 `ai:modify`
- 步骤 5：AI 响应后，画布上出现组件（电阻、LED 等）

---

## T16 — AI 修改模式（需要 API Key）

**目标**：验证画布有组件时 AI 切换为「修改」模式并传递 netlist context。

**前置**：画布上已有组件（T15 之后，或手动添加）。

**步骤：**

1. 确认画布有组件，观察 AI Chat Panel 输入框上方
2. 输入 `add a capacitor in parallel with the LED`，点击发送
3. 在 DevTools Console 中查找 IPC 相关日志

**预期结果：**
- 步骤 1：输入框上方出现蓝色 `Modify mode` 标签
- 步骤 2：Console 中出现 `ai:modify` IPC 调用（不是 `ai:generate`）
- AI 的修改基于当前电路进行，不会重新生成全部内容

---

## ⚠️ 非本版本功能说明

以下功能**不属于 Iteration 3 测试范围**，如遇到相关入口请跳过：

| 功能 | 说明 |
|------|------|
| `Edit › Cut/Copy/Paste` 菜单项 | 由 Electron 系统角色原生处理，与本版本无关 |
| `Tools › AI Analysis` | `enabled: false`，Iteration 4 实现 |
| `Tools › Export BOM...` | `enabled: false`，Iteration 4 实现 |
| `Tools › Version History` | `enabled: false`，Iteration 4 实现 |
| BOM 导出、多图纸、SVG 导出 | 均为 Iteration 4/5 功能 |
| 导线 PropertyPanel 编辑 | 当前版本仅支持节点属性编辑，导线不在范围内 |

---

## 测试结果记录表

| 测试 | 功能 | 通过 | 问题描述 |
|------|------|------|----------|
| T1 | 新建项目 + Ctrl+S | ⬜ | |
| T2 | Save As | ⬜ | |
| T3 | 打开项目（文件恢复） | ⬜ | |
| T4 | 打开项目（未保存提示） | ⬜ | |
| T5 | 最近项目菜单 | ⬜ | |
| T6 | 自动保存（60秒） | ⬜ | |
| T7 | 属性面板编辑 | ⬜ | |
| T8 | 属性验证 | ⬜ | |
| T9 | 属性 Undo/Redo | ⬜ | |
| T10 | 多选占位符 | ⬜ | |
| T11 | 菜单操作 | ⬜ | |
| T12 | 导出 PNG | ⬜ | |
| T13 | 取消导出无副作用 | ⬜ | |
| T14 | 导出 PDF | ⬜ | |
| T15 | AI 生成模式 | ⬜ | |
| T16 | AI 修改模式 | ⬜ | |
