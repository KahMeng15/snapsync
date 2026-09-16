const fs = require('fs')
const path = 'src/renderer/components/BoothApp.ts'
let content = fs.readFileSync(path, 'utf8')

content = content.replace(
  "this.emitBoothStateFull({ phase: 'post-session', sessionPhotoPaths: paths, sessionThumbnails: thumbnails })",
  "this.emitBoothStateFull({ phase: 'post-session', sessionPhotoPaths: paths, sessionThumbnails: thumbnails, isRetake: undefined, retakeIndices: [] })"
)

fs.writeFileSync(path, content)
