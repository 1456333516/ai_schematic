export interface AnalysisItem {
  severity: 'error' | 'warning' | 'suggestion'
  message: string
  component?: string
}

export interface AnalysisReport {
  errors: AnalysisItem[]
  warnings: AnalysisItem[]
  suggestions: AnalysisItem[]
}

export interface BOMRow {
  index: number
  refDes: string
  name: string
  value: string
  package: string
  quantity: number
  description?: string
}

export interface VersionEntry {
  versionId: string
  savedAt: string
  projectName: string
  sizeKB: number
}

export interface NetlistDSL {
  components: Array<{
    id: string
    type: string
    category: string
    properties: Record<string, any>
  }>
  connections: Array<{
    from: string
    to: string
    net: string
  }>
}

export interface RecentEntry {
  name: string
  path: string
  savedAt: string
}

export interface ProjectFileData {
  schema: NetlistDSL
  canvas: object
  meta: {
    name: string
    version: string
    savedAt: string
  }
}
