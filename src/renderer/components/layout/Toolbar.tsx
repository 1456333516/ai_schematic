import { Button, Tooltip, Divider } from 'antd'
import {
  UndoOutlined, RedoOutlined, RotateRightOutlined, SwapOutlined,
  SelectOutlined, DragOutlined, GatewayOutlined,
  ZoomInOutlined, ZoomOutOutlined, CompressOutlined
} from '@ant-design/icons'
import { useCanvasStore } from '@renderer/stores/useCanvasStore'

export function Toolbar() {
  const { activeTool, setActiveTool } = useCanvasStore()

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
        <Button type="text" size="small" icon={<UndoOutlined />} disabled />
      </Tooltip>
      <Tooltip title="Redo (Ctrl+Y)">
        <Button type="text" size="small" icon={<RedoOutlined />} disabled />
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
          type={activeTool === 'boxSelect' ? 'primary' : 'text'}
          size="small"
          icon={<GatewayOutlined />}
          onClick={() => setActiveTool('boxSelect')}
        />
      </Tooltip>

      <Divider type="vertical" />

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
