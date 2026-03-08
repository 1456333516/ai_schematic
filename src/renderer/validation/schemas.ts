import { z } from 'zod'

export const AddComponentSchema = z.object({
  id: z.string(),
  type: z.enum(['resistor', 'capacitor', 'led', 'transistor', 'ic', 'connector']),
  category: z.string(),
  properties: z.record(z.any()).optional()
})

export const ConnectPinsSchema = z.object({
  from: z.string(),
  to: z.string(),
  net: z.string()
})

export const AddPowerSymbolSchema = z.object({
  id: z.string(),
  symbolType: z.enum(['VCC', 'GND', 'VDD', 'VSS']),
  net: z.string()
})

export const AddNetLabelSchema = z.object({
  net: z.string(),
  label: z.string()
})

export type AddComponentInput = z.infer<typeof AddComponentSchema>
export type ConnectPinsInput = z.infer<typeof ConnectPinsSchema>
export type AddPowerSymbolInput = z.infer<typeof AddPowerSymbolSchema>
export type AddNetLabelInput = z.infer<typeof AddNetLabelSchema>
