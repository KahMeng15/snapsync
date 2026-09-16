const fs = require('fs')
const path = 'src/renderer/components/BoothApp.ts'
let content = fs.readFileSync(path, 'utf8')

content = content.replace(
  "type BoothState = 'idle' | 'live' | 'capturing' | 'preview' | 'paused'",
  "type BoothState = 'idle' | 'live' | 'capturing' | 'preview' | 'paused' | 'retake-selection'"
)

content = content.replace(
  "phase?: 'countdown' | 'taking-photo' | 'post-photo-preview' | 'post-session'",
  "phase?: 'countdown' | 'taking-photo' | 'post-photo-preview' | 'post-session' | 'retake-selection'\n  retakeIndices?: number[]"
)

content = content.replace(
  "private handleBoothCommand(cmd: { type: string; settings?: any }) {",
  "private handleBoothCommand(cmd: any) {"
)

// Also fix 'this.photoPreview.overlay.dataset.mode' which is private
// I'll replace it with 'this.photoPreview.isRetakeMode()' or just expose it.
// Actually it's easier to just cast it as any or add a getter.
content = content.replace(
  "this.photoPreview.overlay.dataset.mode",
  "(this.photoPreview as any).overlay.dataset.mode"
)

fs.writeFileSync(path, content)
