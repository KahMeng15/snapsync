const fs = require('fs')
const path = 'src/renderer/components/PhotoPreview.ts'
let content = fs.readFileSync(path, 'utf8')

const declarations = `
  private retakeSelectedIndices: Set<number> = new Set()
  private retakeCheckmarks: HTMLDivElement[] = []
  private retakeImgs: HTMLImageElement[] = []
  private retakeConfirmBtn: HTMLButtonElement | null = null
`

if (!content.includes('retakeSelectedIndices: Set<number>')) {
  content = content.replace('private onRetake: (indices: number[]) => void', declarations + '\n  private onRetake: (indices: number[]) => void')
  fs.writeFileSync(path, content)
}
