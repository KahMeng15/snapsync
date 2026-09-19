const fs = require('fs')
const file = 'snapsync-client/src/renderer/components/Settings.ts'
let content = fs.readFileSync(file, 'utf8')

content = content.replace(
  "const numValues = [this.settings.photoCount, this.settings.countdown, this.settings.captureInterval, this.settings.postCapturePreview, this.settings.shutterOffsetDelay || 0, this.settings.liveviewRetryAttempts || 1, this.settings.inactivityTimeout ?? 30]",
  "const numValues = [this.settings.inactivityTimeout ?? 30, this.settings.liveviewRetryAttempts || 1, this.settings.photoCount, this.settings.countdown, this.settings.captureInterval, this.settings.postCapturePreview, this.settings.shutterOffsetDelay || 0]"
)

fs.writeFileSync(file, content)
