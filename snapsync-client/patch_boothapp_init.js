const fs = require('fs')
const path = 'src/renderer/components/BoothApp.ts'
let content = fs.readFileSync(path, 'utf8')

const searchStr = `this.photoPreview = new PhotoPreview(
      this.container,
      (indices) => {
        this.retakePhotos(indices)
      },
      () => this.goHome()
    )`

const replacementStr = `this.photoPreview = new PhotoPreview(
      this.container,
      (indices) => {
        this.retakePhotos(indices)
      },
      () => this.goHome(),
      (indices) => {
        if (indices.length === 0 && this._state !== 'retake-selection') {
          return // Cancelled or empty before opening
        }
        if (indices.length === 0 && this.photoPreview.overlay.dataset.mode !== 'retake') {
          // It was cancelled
          this._state = 'preview'
          this.emitBoothStateFull({ phase: 'post-session', retakeIndices: [] })
        } else {
          this._state = 'retake-selection'
          this.emitBoothStateFull({ phase: 'retake-selection', retakeIndices: indices })
        }
      }
    )`

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replacementStr)
  fs.writeFileSync(path, content)
} else {
  console.log("Could not find initialization block")
}
