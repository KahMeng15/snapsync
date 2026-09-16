const fs = require('fs')
const path = 'frontend/src/components/EventControlPanel.vue'
let content = fs.readFileSync(path, 'utf8')

content = content.replace(
  "if (newVal !== 'preview') {",
  "if (newVal !== 'preview' && newVal !== 'retake-selection') {"
)

content = content.replace(
  "if (newVal === 'idle' || newVal === 'preview') {",
  "if (newVal === 'idle' || newVal === 'preview' || newVal === 'retake-selection') {"
)

content = content.replace(
  "v-if=\"currentState === 'preview'\" class=\"app-btn full-width-btn btn-warning\"",
  "v-if=\"['preview', 'retake-selection'].includes(currentState)\" class=\"app-btn full-width-btn btn-warning\""
)

fs.writeFileSync(path, content)
