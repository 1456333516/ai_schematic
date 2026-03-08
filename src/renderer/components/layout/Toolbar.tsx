import { Button, Tooltip, Divider } from 'antd'
import {
  UndoOutlined, RedoOutlined, RotateRightOutlined, SwapOutlined,
  SelectOutlined, DragOutlined, BorderOutlined,
  ZoomInOutlined, ZoomOutOutlined, CompressOutlined
} from '@ant-design/icons'
import { useCanvasStore } from '@renderer/stores/useCanvasStore'
import { useAppStore } from '@renderer/stores/useAppStore'

export function Toolbar() {
  const { activeTool, setActiveTool } = useCanvasStore()
  const { projectName, isDirty, currentView } = useAppStore()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '100%',
      padding: '0 8px',
      gap: 2,
      background: 'var(--color-bg-l1)',
      borderBottom: '1px solid var(--color-border)',
      fontSize: 'var(--font-size-sm)'
    }}>
      {/* History */}
      <Tooltip title="Undo (Ctrl+Z)">
        <Button type="text" size="small" icon={<UndoOutlined />} id="btn-undo" />
      </Tooltip>
      <Tooltip title="Redo (Ctrl+Y)">
        <Button type="text" size="small" icon={<RedoOutlined />} id="btn-redo" />
      </Tooltip>

      <Divider type="vertical" />

      {/* Transform */}
      <Tooltip title="Rotate 90° (R)">
        <Button type="text" size="small" icon={<RotateRightOutlined />} id="btn-rotate" />
      </Tooltip>
      <Tooltip title="Flip Horizontal (X)">
        <Button type="text" size="small" icon={<SwapOutlined />} id="btn-flip" />
      </Tooltip>

      <Divider type="vertical" />

      {/* Mode */}
      <Tooltip title="Select (V)">
        <Button
          type={activeTool === 'select' ? 'primary' : 'text'}
          size="small"
          icon={<SelectOutlined />}
          onClick={() => setActiveTool('select')}
        />
      </Tooltip>
      <Tooltip title="Pan (H)">
        <Button
          type={activeTool === 'pan' ? 'primary' : 'text'}
          size="small"
          icon={<DragOutlined />}
          onClick={() => setActiveTool('pan')}
        />
      </Tooltip>
      <Tooltip title="Box Select (B)">
        <Button
          type={activeTool === 'select-box' ? 'primary' : 'text'}
          size="small"
          icon={<BorderOutlined />}
          onClick={() => setActiveTool('select-box')}
        />
      </Tooltip>

      <Divider type="vertical" />

      {/* Project title */}
      {currentView === 'editor' && (
        <div style={{
          flex: 1,
          textAlign: 'center',
          fontWeight: 500,
          fontSize: 'var(--font-size-sm)',
          color: isDirty ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          userSelect: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {isDirty ? '● ' : ''}{projectName ?? 'Untitled'}
        </div>
      )}

      {/* Zoom */}
      <Tooltip title="Zoom In (Ctrl+=)">
        <Button type="text" size="small" icon={<ZoomInOutlined />} id="btn-zoom-in" />
      </Tooltip>
      <Tooltip title="Zoom Out (Ctrl+-)">
        <Button type="text" size="small" icon={<ZoomOutOutlined />} id="btn-zoom-out" />
      </Tooltip>
      <Tooltip title="Zoom to Fit (Ctrl+0)">
        <Button type="text" size="small" icon={<CompressOutlined />} id="btn-zoom-fit" />
      </Tooltip>
    </div>
  )
}
