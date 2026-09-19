const fs = require('fs')
const file = 'snapsync-client/src/renderer/components/Settings.ts'
let content = fs.readFileSync(file, 'utf8')

// Add inactivityTimeout to interface
content = content.replace(
  "devLatencyMs?: number",
  "devLatencyMs?: number\n  inactivityTimeout?: number"
)

// Add to default settings object
content = content.replace(
  "liveviewRetryAttempts: 1, shutterOffsetDelay: 0 }",
  "liveviewRetryAttempts: 1, shutterOffsetDelay: 0, inactivityTimeout: 30 }"
)

// Add createAppSection
const appSectionCode = `
  private createAppSection(): HTMLDivElement {
    const section = document.createElement('div')
    section.style.cssText = 'margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #2a2a2a;'

    const title = document.createElement('h3')
    title.textContent = 'App'
    title.style.cssText = 'font-size: 0.8125rem; font-weight: 600; color: #888; margin: 0 0 1rem; text-transform: uppercase; letter-spacing: 0.05em;'
    section.appendChild(title)

    // Screen Mode Dropdown
    const screenModeRow = document.createElement('div')
    screenModeRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;'
    const smLabel = document.createElement('label')
    smLabel.textContent = 'Screen Mode'
    smLabel.style.cssText = 'font-size: 0.875rem; color: #ccc; font-weight: 500;'
    screenModeRow.appendChild(smLabel)

    const smSelect = document.createElement('select')
    smSelect.style.cssText = this.selectStyle()
    smSelect.style.width = '140px'
    const opts = [
      { v: 'fullscreen', l: 'Fullscreen' },
      { v: 'windowed-fullscreen', l: 'Windowed FS' },
      { v: 'windowed', l: 'Windowed' }
    ]
    opts.forEach(o => {
      const opt = document.createElement('option')
      opt.value = o.v
      opt.textContent = o.l
      smSelect.appendChild(opt)
    })
    
    // We don't save screen mode in settings.json to avoid locking users out.
    // We just apply it immediately. Or we can save it?
    // "in the photobooth settings can you add a screen mode where the user can select..."
    // Let's just apply it immediately and not persist it, or persist in localStorage.
    const savedScreenMode = localStorage.getItem('screenMode') || 'windowed'
    smSelect.value = savedScreenMode
    if (window.snapsync?.setScreenMode) {
      window.snapsync.setScreenMode(savedScreenMode as any)
    }

    smSelect.addEventListener('change', () => {
      localStorage.setItem('screenMode', smSelect.value)
      if (window.snapsync?.setScreenMode) {
        window.snapsync.setScreenMode(smSelect.value as any)
      }
    })
    screenModeRow.appendChild(smSelect)
    section.appendChild(screenModeRow)

    // Inactivity Timeout
    const timeoutRow = document.createElement('div')
    timeoutRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;'
    
    const timeoutLabel = document.createElement('div')
    const tTitle = document.createElement('div')
    tTitle.textContent = 'Inactivity Timeout (s)'
    tTitle.style.cssText = 'font-size: 0.875rem; color: #ccc; font-weight: 500;'
    const tDesc = document.createElement('div')
    tDesc.textContent = '0 to disable'
    tDesc.style.cssText = 'font-size: 0.75rem; color: #666;'
    timeoutLabel.appendChild(tTitle)
    timeoutLabel.appendChild(tDesc)
    timeoutRow.appendChild(timeoutLabel)

    const timeoutInput = document.createElement('input')
    timeoutInput.type = 'number'
    timeoutInput.min = '0'
    timeoutInput.value = String(this.settings.inactivityTimeout ?? 30)
    timeoutInput.style.cssText = \`
      width: 60px; padding: 0.375rem 0.5rem; border: 1px solid #333; border-radius: 6px;
      background: #0f0f0f; color: #fff; font-size: 0.875rem; font-weight: 600;
      outline: none; text-align: center; box-sizing: border-box;
    \`
    timeoutInput.addEventListener('change', () => {
      let val = parseInt(timeoutInput.value, 10)
      if (isNaN(val) || val < 0) val = 30
      timeoutInput.value = String(val)
      this.settings.inactivityTimeout = val
      this.markDirty()
    })
    this.numInputs.push(timeoutInput) // Add to numInputs to be updated on loadSettings
    timeoutRow.appendChild(timeoutInput)
    section.appendChild(timeoutRow)

    // Close Client Button
    const closeBtn = document.createElement('button')
    closeBtn.textContent = 'Close Photobooth'
    closeBtn.style.cssText = \`
      width: 100%; padding: 0.75rem; border: none; border-radius: 6px;
      background: #cc3333; color: white; font-size: 0.875rem; font-weight: 600;
      cursor: pointer; margin-top: 0.5rem; transition: background 0.1s;
    \`
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = '#e63939')
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = '#cc3333')
    closeBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to close the photobooth client?')) {
        window.snapsync?.closeApp()
      }
    })
    section.appendChild(closeBtn)

    return section
  }
`
// Add the method before createServerSection
content = content.replace("private createServerSection(): HTMLDivElement {", appSectionCode + "\n  private createServerSection(): HTMLDivElement {")

// Call createAppSection in layout
content = content.replace(
  "const serverSection = this.createServerSection()",
  "const appSection = this.createAppSection()\n    col1.appendChild(appSection)\n    const serverSection = this.createServerSection()"
)

// Also update the numInputs array in loadSettings
content = content.replace(
  "this.settings.shutterOffsetDelay || 0, this.settings.liveviewRetryAttempts || 1]",
  "this.settings.shutterOffsetDelay || 0, this.settings.liveviewRetryAttempts || 1, this.settings.inactivityTimeout ?? 30]"
)

fs.writeFileSync(file, content)
