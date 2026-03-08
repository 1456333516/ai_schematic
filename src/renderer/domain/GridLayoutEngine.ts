import type { Point } from './types'

const GRID_SIZE = 10
const COL_SPACING = 100
const ROW_SPACING = 120
const COLS_PER_ROW = 5
const START_X = 100
const START_Y = 100

export class GridLayoutEngine {
  private currentRow = 0
  private currentCol = 0

  getNextPosition(componentWidth: number = 80, componentHeight: number = 60): Point {
    const x = START_X + this.currentCol * COL_SPACING
    const y = START_Y + this.currentRow * ROW_SPACING

    const alignedX = Math.round(x / GRID_SIZE) * GRID_SIZE
    const alignedY = Math.round(y / GRID_SIZE) * GRID_SIZE

    this.currentCol++
    if (this.currentCol >= COLS_PER_ROW) {
      this.currentCol = 0
      this.currentRow++
    }

    return { x: alignedX, y: alignedY }
  }

  reset(): void {
    this.currentRow = 0
    this.currentCol = 0
  }
}
