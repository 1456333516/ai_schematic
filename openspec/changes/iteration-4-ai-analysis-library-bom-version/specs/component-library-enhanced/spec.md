## ADDED Requirements

### Requirement: ComponentLibrary LIBRARY_DATA covers all PRD F5 categories
`LIBRARY_DATA` in `ComponentLibrary.tsx` SHALL include real items (non-empty arrays) for all categories:

| Category | Items |
|---|---|
| 无源器件 | 电阻(resistor), 电容-电解(capacitor-electrolytic), 电容-瓷片(capacitor-ceramic), 电感(inductor), 磁珠(ferrite-bead), 保险丝(fuse) |
| 二极管 | 普通二极管(diode), 稳压管(zener), 肖特基(schottky), LED |
| 三极管 | NPN, PNP |
| MOS管 | N-MOS, P-MOS |
| 运算放大器 | 单运放(opamp-single), 双运放(opamp-dual), 四运放(opamp-quad) |
| 逻辑门 | 与门(gate-and), 或门(gate-or), 非门(gate-not), 与非门(gate-nand), 或非门(gate-nor) |
| 常用IC | 555定时器, LDO通用, DC-DC通用, MCU通用(8/16/32/48/64引脚) |
| 连接器 | 2P排针, 4P排针, 6P排针, USB-Type-C, DC电源座 |
| 电源符号 | VCC, VDD, GND, AGND, +3.3V, +5V, +12V |
| 其他 | 晶振(crystal), 蜂鸣器(buzzer), 继电器(relay), 光耦(optocoupler) |

#### Scenario: All categories have at least one item
- **WHEN** the ComponentLibrary renders
- **THEN** no category shows "Coming soon" placeholder

#### Scenario: Search finds inductor by name
- **WHEN** user types "电感" in the search input
- **THEN** the inductor item appears in filtered results

#### Scenario: Search finds item by English name
- **WHEN** user types "zener" in the search input
- **THEN** the zener diode item appears in filtered results

---

### Requirement: X6 shapes registered for new component types
`registerShapes.ts` SHALL register X6 React node shapes for each new component type that does not reuse an existing shape.

New shape IDs to register:
- `schematic-inductor`
- `schematic-fuse`
- `schematic-zener`
- `schematic-schottky`
- `schematic-npn`
- `schematic-pnp`
- `schematic-nmos`
- `schematic-pmos`
- `schematic-opamp`
- `schematic-gate-and`
- `schematic-gate-or`
- `schematic-gate-not`
- `schematic-gate-nand`
- `schematic-gate-nor`
- `schematic-crystal`

Connector types reuse `schematic-ic` with appropriate `pinCount`. Power symbols (+3.3V, +5V, +12V, VDD, AGND) reuse `schematic-vcc` with differentiated labels. Buzzer, relay, optocoupler use `schematic-ic` as fallback with appropriate pin count.

Each new shape component SHALL render an SVG symbol consistent with EDA conventions (resistor/diode style already established in the codebase).

#### Scenario: NPN transistor shape renders on canvas
- **WHEN** an NPN transistor node is added to the X6 graph with shape `schematic-npn`
- **THEN** the node renders visibly with correct collector/base/emitter port positions

#### Scenario: AND gate shape renders on canvas
- **WHEN** an AND gate node is added with shape `schematic-gate-and`
- **THEN** the node renders with the standard AND gate D-shaped body

---

### Requirement: DynamicSymbolRenderer for unknown component types
A utility function `createDynamicNode(pinCount: number, label: string): NodeConfig` SHALL be exported from `src/renderer/components/canvas/DynamicSymbolRenderer.ts`.

The function SHALL:
- Reuse `schematic-ic` shape
- Calculate node height as `Math.max(60, pinCount * 12)` px
- Set node width to 80 px
- Distribute pins evenly on left and right sides (ceil(pinCount/2) per side)
- Set node data `{ label, category: 'dynamic', refDesPrefix: 'U' }`

#### Scenario: 6-pin dynamic node
- **WHEN** `createDynamicNode(6, 'CUSTOM')` is called
- **THEN** the returned config has height ≥ 72, 3 ports on left, 3 ports on right

#### Scenario: 1-pin dynamic node minimum height
- **WHEN** `createDynamicNode(1, 'X')` is called
- **THEN** the returned config has height = 60 (minimum enforced)

---

### Requirement: Drag-and-drop works for all new library items
All new `LibraryItem` entries in `LIBRARY_DATA` SHALL be draggable onto the canvas and double-clickable to add at canvas center.

The `startDrag` and `addToCenter` functions in `ComponentLibrary.tsx` SHALL handle new items by:
- Using the item's `shape` property to create the node
- Assigning the next available `refDes` from `useCanvasStore.getNextRefDes(item.refDesPrefix)`
- For items with `shape === 'schematic-ic'`, using `createICNode(item.pinCount ?? 4)`

#### Scenario: Drag inductor to canvas
- **WHEN** user drags the inductor item from the library to the canvas
- **THEN** an inductor node with shape `schematic-inductor` appears at drop position with an auto-assigned refDes

#### Scenario: Double-click adds NPN transistor at center
- **WHEN** user double-clicks the NPN item in the library
- **THEN** an NPN node with shape `schematic-npn` is added at the canvas content center
