const fs = require('fs')
const path = 'src/renderer/components/PhotoPreview.ts'
let content = fs.readFileSync(path, 'utf8')

const codeToAdd = `
  public updateRetakeSelection(indices: number[]) {
    if (this.overlay.dataset.mode !== 'retake') {
      this.showRetakeSelection(indices)
      return
    }
    
    // Check if same
    const current = Array.from(this.retakeSelectedIndices).sort()
    const next = [...indices].sort()
    if (current.length === next.length && current.every((v, i) => v === next[i])) {
      return
    }

    this.retakeSelectedIndices = new Set(indices)
    this.retakeImgs.forEach((img, idx) => {
      if (this.retakeSelectedIndices.has(idx)) {
        img.style.borderColor = 'var(--color-info)'
      } else {
        img.style.borderColor = 'transparent'
      }
    })
    this.retakeCheckmarks.forEach((check, idx) => {
      check.style.display = this.retakeSelectedIndices.has(idx) ? 'flex' : 'none'
    })

    if (this.retakeConfirmBtn) {
      this.retakeConfirmBtn.disabled = this.retakeSelectedIndices.size === 0
      this.retakeConfirmBtn.style.opacity = this.retakeSelectedIndices.size === 0 ? '0.5' : '1'
      this.retakeConfirmBtn.textContent = this.retakeSelectedIndices.size > 0 ? \`Retake \${this.retakeSelectedIndices.size} Photo\${this.retakeSelectedIndices.size > 1 ? 's' : ''}\` : 'Select Photos'
    }
  }

  public cancelRetakeSelection() {
    if (this.overlay.dataset.mode === 'retake') {
      this.keydownHandlers = null
      this.show(this.currentPaths, null, this.lastServerUrl, this.lastOtp, this.lastSessionId)
      this.onRetakeSelectionChanged?.([])
    }
  }
`

if (!content.includes('public updateRetakeSelection')) {
  content = content.replace('public showRetakeSelection(', codeToAdd + '\n  public showRetakeSelection(')
  fs.writeFileSync(path, content)
}
