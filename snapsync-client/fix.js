const fs = require('fs')
let content = fs.readFileSync('src/renderer/components/PhotoPreview.ts', 'utf8')

// Fix the class property
content = content.replace(
  'private onConfirm: () => void,\n    private onRetakeSelectionChanged?: (indices: number[]) => void',
  'private onConfirm: () => void\n  private onRetakeSelectionChanged?: (indices: number[]) => void'
)

// Fix the constructor
content = content.replace(
  'constructor(container: HTMLElement, onRetake: (indices: number[]) => void, onConfirm: () => void) {',
  'constructor(container: HTMLElement, onRetake: (indices: number[]) => void, onConfirm: () => void, onRetakeSelectionChanged?: (indices: number[]) => void) {\n    this.onRetakeSelectionChanged = onRetakeSelectionChanged'
)
fs.writeFileSync('src/renderer/components/PhotoPreview.ts', content)
