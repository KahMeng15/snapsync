const fs = require('fs')
const path = 'src/renderer/components/BoothApp.ts'
let content = fs.readFileSync(path, 'utf8')

// 1. Add isRetake?: boolean to BoothStateFull
content = content.replace(
  "retakeIndices?: number[]",
  "retakeIndices?: number[]\n  isRetake?: boolean"
)

// 2. In emitBoothStateFull, pass isRetake
content = content.replace(
  "retakeIndices: this.currentFullState.retakeIndices,",
  "retakeIndices: this.currentFullState.retakeIndices,\n      isRetake: this.currentFullState.isRetake,"
)

// 3. In retakePhotos, clear retakeIndices and phase
content = content.replace(
  "this.emitBoothStateFull()",
  "this.emitBoothStateFull({ phase: undefined, retakeIndices: [] })"
)

// Wait, retakePhotos calls emitBoothStateFull() once for 'live'. Let's be careful.
// Let's just find "this._state = 'live'\n    this.emitBoothStateFull()"
content = content.replace(
  "this._state = 'live'\n    this.emitBoothStateFull()",
  "this._state = 'live'\n    this.emitBoothStateFull({ phase: undefined, retakeIndices: [] })"
)

// 4. In executeRetakePhotos, countdown phase
content = content.replace(
  "phase: 'countdown',\n          currentShot: targetIndex + 1,\n          totalShots: this.settingsData.photoCount,",
  "phase: 'countdown',\n          currentShot: i + 1,\n          totalShots: totalRetakes,\n          isRetake: true,"
)

// 5. In executeRetakePhotos, taking-photo phase
content = content.replace(
  "phase: 'taking-photo',\n        countdown: undefined",
  "phase: 'taking-photo',\n        isRetake: true,\n        countdown: undefined"
)

// 6. In executeRetakePhotos, post-photo-preview phase
content = content.replace(
  "phase: 'post-photo-preview',\n        countdown: undefined",
  "phase: 'post-photo-preview',\n        isRetake: true,\n        countdown: undefined"
)

// 7. In goHome, clear isRetake
content = content.replace(
  "this.currentFullState.sessionPhotoPaths = undefined",
  "this.currentFullState.sessionPhotoPaths = undefined\n      this.currentFullState.isRetake = undefined\n      this.currentFullState.retakeIndices = []"
)

fs.writeFileSync(path, content)
