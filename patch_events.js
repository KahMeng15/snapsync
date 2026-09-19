const fs = require('fs')
const file = 'snapsync-client/src/renderer/components/BoothApp.ts'
let content = fs.readFileSync(file, 'utf8')

// Add global event listeners in mount()
content = content.replace(
  "this.updateLandingText()",
  \`this.updateLandingText()
    
    const bump = () => this.resetInactivityTimer()
    document.addEventListener('click', bump)
    document.addEventListener('mousemove', bump)
    document.addEventListener('touchstart', bump)
    document.addEventListener('keydown', bump)\`
)

fs.writeFileSync(file, content)
