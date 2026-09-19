const fs = require('fs')
const file = 'snapsync-client/src/renderer/components/BoothApp.ts'
let content = fs.readFileSync(file, 'utf8')

// Add properties
content = content.replace(
  "private _state: BoothState = 'idle'",
  `private inactivityTimer: NodeJS.Timeout | null = null
  private inactivityWarningTimer: NodeJS.Timeout | null = null
  private inactivityOverlay?: HTMLDivElement
  private inactivityCountdownEl?: HTMLHeadingElement
  private _state: BoothState = 'idle'`
)

// Add methods
const methods = `
  public resetInactivityTimer = () => {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer)
    if (this.inactivityWarningTimer) clearInterval(this.inactivityWarningTimer)
    if (this.inactivityOverlay) this.inactivityOverlay.style.display = 'none'

    const timeout = this.settingsData?.inactivityTimeout ?? 30
    if (timeout <= 0) return

    if (this._state === 'idle' || this.isCapturing || this.isTransitioning || this.isPauseActive) return

    this.inactivityTimer = setTimeout(() => {
      this.showInactivityWarning()
    }, timeout * 1000)
  }

  private showInactivityWarning() {
    if (this._state === 'idle' || this.isCapturing || this.isTransitioning || this.isPauseActive) return
    
    let countdown = 5
    if (!this.inactivityOverlay) {
      this.inactivityOverlay = document.createElement('div')
      this.inactivityOverlay.style.cssText = \`
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.85); z-index: 99999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: system-ui, sans-serif; cursor: pointer;
      \`
      const h2 = document.createElement('h2')
      h2.textContent = 'Are you still there?'
      h2.style.cssText = 'font-size: 3rem; margin-bottom: 1rem;'
      this.inactivityOverlay.appendChild(h2)

      this.inactivityCountdownEl = document.createElement('h1')
      this.inactivityCountdownEl.style.cssText = 'font-size: 8rem; margin: 0; font-variant-numeric: tabular-nums;'
      this.inactivityOverlay.appendChild(this.inactivityCountdownEl)
      
      const p = document.createElement('p')
      p.textContent = 'Tap anywhere to continue'
      p.style.cssText = 'font-size: 1.5rem; margin-top: 2rem; color: #aaa;'
      this.inactivityOverlay.appendChild(p)
      
      this.inactivityOverlay.addEventListener('click', (e) => {
        e.stopPropagation()
        this.resetInactivityTimer()
      })
      this.inactivityOverlay.addEventListener('touchstart', (e) => {
        e.stopPropagation()
        this.resetInactivityTimer()
      })

      document.body.appendChild(this.inactivityOverlay)
    }

    this.inactivityCountdownEl!.textContent = String(countdown)
    this.inactivityOverlay.style.display = 'flex'

    this.inactivityWarningTimer = setInterval(() => {
      countdown--
      if (countdown <= 0) {
        if (this.inactivityWarningTimer) clearInterval(this.inactivityWarningTimer)
        this.inactivityOverlay!.style.display = 'none'
        this.goHome()
      } else {
        this.inactivityCountdownEl!.textContent = String(countdown)
      }
    }, 1000)
  }

  private _setIsCapturing(val: boolean) {
    this.isCapturing = val
    this.resetInactivityTimer()
  }

  // ---
`
// Add methods before private updateLandingText
content = content.replace("private updateLandingText() {", methods + "\n  private updateLandingText() {")

// Now find all isCapturing = false / true and replace with _setIsCapturing (excluding initialization)
// Actually it's easier to just call this.resetInactivityTimer() in those places, or just bind document events.
// A simpler way: we just call resetInactivityTimer inside `setState` (wait there's no setState)
// Let's hook into `this._state = ` assignments by doing a replace.
content = content.replace(/this\._state = /g, "this.resetInactivityTimer(); this._state = ")
content = content.replace(/this\.isCapturing = /g, "this.resetInactivityTimer(); this.isCapturing = ")

fs.writeFileSync(file, content)
