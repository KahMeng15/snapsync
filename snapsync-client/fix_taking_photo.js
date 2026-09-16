const fs = require('fs')
const path = 'src/renderer/components/BoothApp.ts'
let content = fs.readFileSync(path, 'utf8')

// Fix emitBoothStateFull in executeRetakePhotos
content = content.replace(
  /this\.emitBoothStateFull\(\{\s+phase: 'taking-photo',\s+countdown: undefined\s+\}\)/g,
  "this.emitBoothStateFull({\n        phase: 'taking-photo',\n        isRetake: true,\n        countdown: undefined\n      })"
)

content = content.replace(
  /this\.emitBoothStateFull\(\{\s+phase: 'post-photo-preview',\s+countdown: undefined\s+\}\)/g,
  "this.emitBoothStateFull({\n        phase: 'post-photo-preview',\n        isRetake: true,\n        countdown: undefined\n      })"
)

fs.writeFileSync(path, content)
