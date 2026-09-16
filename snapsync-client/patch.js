const fs = require('fs')
let content = fs.readFileSync('src/renderer/components/PhotoPreview.ts', 'utf8')

// 1. Add onRetakeSelectionChanged to constructor
content = content.replace(
  'private onConfirm: () => void',
  'private onConfirm: () => void,\n    private onRetakeSelectionChanged?: (indices: number[]) => void'
)

// 2. Add class variables
content = content.replace(
  'private progressText: HTMLDivElement | null = null',
  'private progressText: HTMLDivElement | null = null\n  private retakeSelectedIndices = new Set<number>()\n  private retakeCheckmarks: HTMLElement[] = []\n  private retakeImgs: HTMLElement[] = []\n  private retakeConfirmBtn: HTMLButtonElement | null = null'
)

// 3. Update showRetakeSelection signature
content = content.replace(
  'private showRetakeSelection() {',
  'public showRetakeSelection(initialIndices: number[] = []) {\n    this.retakeSelectedIndices = new Set(initialIndices)\n    this.retakeCheckmarks = []\n    this.retakeImgs = []'
)

// 4. Update internal variables in showRetakeSelection
content = content.replace(
  'const selectedIndices = new Set<number>()',
  '// selectedIndices replaced by this.retakeSelectedIndices'
)

content = content.replace(
  /selectedIndices/g,
  'this.retakeSelectedIndices'
)

content = content.replace(
  /const updateConfirmBtn/g,
  'const updateConfirmBtn'
)

// 5. Save the references for update
content = content.replace(
  /img\.className = 'ui-photo-retake-img'/g,
  "img.className = 'ui-photo-retake-img'\n      this.retakeImgs.push(img)"
)

content = content.replace(
  /checkMark\.className = 'ui-photo-retake-check'/g,
  "checkMark.className = 'ui-photo-retake-check'\n      this.retakeCheckmarks.push(checkMark)"
)

content = content.replace(
  /const confirmBtn = document\.createElement\('button'\)\n    confirmBtn\.disabled = true/g,
  "const confirmBtn = document.createElement('button')\n    this.retakeConfirmBtn = confirmBtn\n    confirmBtn.disabled = this.retakeSelectedIndices.size === 0"
)

// 6. Call onRetakeSelectionChanged on click
content = content.replace(
  /updateConfirmBtn\(\)/g,
  "updateConfirmBtn()\n        this.onRetakeSelectionChanged?.(Array.from(this.retakeSelectedIndices).sort((a, b) => a - b))"
)

// 7. Call onRetakeSelectionChanged on cancel
content = content.replace(
  /this\.show\(this\.currentPaths, null, this\.lastServerUrl, this\.lastOtp, this\.lastSessionId\)/g,
  "this.show(this.currentPaths, null, this.lastServerUrl, this.lastOtp, this.lastSessionId)\n      this.onRetakeSelectionChanged?.([])"
)

// 8. Add setRetakeSelection method
const setRetakeMethod = `
  public setRetakeSelection(indices: number[]) {
    if (this.overlay.dataset.mode !== 'retake') {
      if (indices.length > 0) {
        this.showRetakeSelection(indices)
      }
      return
    }
    
    this.retakeSelectedIndices = new Set(indices)
    
    this.retakeImgs.forEach((img, idx) => {
      if (this.retakeSelectedIndices.has(idx)) {
        img.style.borderColor = 'var(--color-info)'
        this.retakeCheckmarks[idx].style.display = 'flex'
      } else {
        img.style.borderColor = 'transparent'
        this.retakeCheckmarks[idx].style.display = 'none'
      }
    })
    
    if (this.retakeConfirmBtn) {
      this.retakeConfirmBtn.disabled = this.retakeSelectedIndices.size === 0
      this.retakeConfirmBtn.style.opacity = this.retakeSelectedIndices.size === 0 ? '0.5' : '1'
      this.retakeConfirmBtn.textContent = this.retakeSelectedIndices.size > 0 ? \`Retake \${this.retakeSelectedIndices.size} Photo\${this.retakeSelectedIndices.size > 1 ? 's' : ''}\` : 'Select Photos'
    }
  }
`
content = content.replace('private showQR(url: string) {', setRetakeMethod + '\n  private showQR(url: string) {')

// 9. Fix checkmark initial display
content = content.replace(
  /checkMark\.innerHTML = '✓'/g,
  "checkMark.innerHTML = '✓'\n      checkMark.style.display = this.retakeSelectedIndices.has(idx) ? 'flex' : 'none'\n      if (this.retakeSelectedIndices.has(idx)) img.style.borderColor = 'var(--color-info)'"
)

fs.writeFileSync('src/renderer/components/PhotoPreview.ts', content)
