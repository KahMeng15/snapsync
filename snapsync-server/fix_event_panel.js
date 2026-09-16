const fs = require('fs')
const path = 'frontend/src/components/EventControlPanel.vue'
let content = fs.readFileSync(path, 'utf8')

content = content.replace(
  '<div class="shot-text" style="font-weight: 600;">Shot {{ boothState?.currentShot || 0 }} of {{ boothState?.totalShots || \'-\' }}</div>',
  '<div class="shot-text" style="font-weight: 600;">{{ boothState?.isRetake ? \'Retake\' : \'Shot\' }} {{ boothState?.currentShot || 0 }} of {{ boothState?.totalShots || \'-\' }}</div>'
)

fs.writeFileSync(path, content)
