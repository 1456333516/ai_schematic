import { Modal, Input, Form } from 'antd'
import { FolderOutlined } from '@ant-design/icons'
import { useAppStore } from '@renderer/stores/useAppStore'

interface Props {
  open: boolean
  onClose: () => void
}

const NAME_PATTERN = /^[^<>:"/\\|?*]+$/

export function NewProjectDialog({ open, onClose }: Props) {
  const [form] = Form.useForm<{ name: string; path: string }>()
  const setProject = useAppStore((s) => s.setProject)

  const handleBrowse = async () => {
    const result = await window.electronAPI.system.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Project Location'
    })
    if (!result.canceled && result.filePaths[0]) {
      form.setFieldsValue({ path: result.filePaths[0] })
    }
  }

  const handleCreate = async () => {
    const values = await form.validateFields()
    const filePath = `${values.path}/${values.name}.aischematic`
    const result = await window.electronAPI.file.createProject(values.name, filePath)
    if (result?.success === false) return
    setProject(values.name, filePath)
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="New Project"
      open={open}
      onOk={handleCreate}
      onCancel={() => { form.resetFields(); onClose() }}
      okText="Create"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="Project Name"
          rules={[
            { required: true, message: 'Project name is required' },
            { max: 64, message: 'Max 64 characters' },
            { pattern: NAME_PATTERN, message: 'Contains invalid characters' }
          ]}
        >
          <Input placeholder="My Circuit" autoFocus />
        </Form.Item>
        <Form.Item
          name="path"
          label="Storage Path"
          rules={[{ required: true, message: 'Please select a storage path' }]}
        >
          <Input
            placeholder="Select folder..."
            readOnly
            addonAfter={
              <FolderOutlined onClick={handleBrowse} style={{ cursor: 'pointer' }} />
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
