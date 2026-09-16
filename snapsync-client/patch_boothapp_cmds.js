const fs = require('fs')
const path = 'src/renderer/components/BoothApp.ts'
let content = fs.readFileSync(path, 'utf8')

const codeToAdd = `    } else if (cmd.type === 'enter-retake') {
      if (this._state === 'preview') {
        this._state = 'retake-selection'
        this.photoPreview.showRetakeSelection()
        this.emitBoothStateFull({ phase: 'retake-selection', retakeIndices: [] })
      }
    } else if (cmd.type === 'update-retake') {
      if (this._state === 'retake-selection' || this._state === 'preview') {
        this._state = 'retake-selection'
        this.photoPreview.updateRetakeSelection(cmd.indices || [])
        this.emitBoothStateFull({ phase: 'retake-selection', retakeIndices: cmd.indices || [] })
      }
    } else if (cmd.type === 'cancel-retake') {
      if (this._state === 'retake-selection') {
        this._state = 'preview'
        this.photoPreview.cancelRetakeSelection()
        this.emitBoothStateFull({ phase: 'post-session' })
      }
`

if (!content.includes("cmd.type === 'enter-retake'")) {
  content = content.replace("    } else if (cmd.type === 'go-home') {", codeToAdd + "    } else if (cmd.type === 'go-home') {")
  fs.writeFileSync(path, content)
}
