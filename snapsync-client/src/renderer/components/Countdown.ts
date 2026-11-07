export class CountdownUI {
  private overlay: HTMLElement
  private countdownEl: HTMLDivElement
  private messageEl: HTMLDivElement

  constructor(overlay: HTMLElement) {
    this.overlay = overlay

    this.countdownEl = document.createElement('div')
    this.countdownEl.className = 'ui-countdown'
    this.overlay.appendChild(this.countdownEl)

    this.messageEl = document.createElement('div')
    this.messageEl.className = 'ui-countdown-message'
    this.overlay.appendChild(this.messageEl)
  }

  async play(seconds: number, audioCtx: AudioContext, onPrep?: () => void, pauseCheck?: () => Promise<void>, prepAt = 1, message?: string | null, signal?: AbortSignal, onTick?: (tick: number) => void): Promise<void> {
    const cleanup = () => {
      this.countdownEl.textContent = ''
      this.countdownEl.style.opacity = '0'
      this.messageEl.textContent = ''
      if (onTick) onTick(0)
    }

    this.messageEl.textContent = message || ''
    // Clamp prepAt so that live preview is never frozen at the very start of the countdown
    const effectivePrepAt = (prepAt > 0 && seconds > 1)
      ? Math.min(prepAt, Math.max(0.5, seconds - 1))
      : prepAt

    let prepTriggered = false
    const checkPrep = (remainingSec: number) => {
      if (!prepTriggered && onPrep && effectivePrepAt > 0 && remainingSec <= effectivePrepAt + 0.01) {
        prepTriggered = true
        onPrep()
      }
    }

    for (let i = seconds; i > 0; i--) {
      if (signal?.aborted) return cleanup()
      if (pauseCheck) await pauseCheck()
      if (signal?.aborted) return cleanup()
      this.countdownEl.textContent = String(i)
      if (onTick) onTick(i)
      this.countdownEl.style.opacity = '1'
      this.countdownEl.style.transform = 'scale(1.2)'

      this.playBeep(audioCtx, i === 1 ? 880 : 660)

      checkPrep(i)

      await this.delay(500, pauseCheck)
      if (signal?.aborted) return cleanup()
      this.countdownEl.style.transform = 'scale(1)'

      checkPrep(i - 0.5)

      await this.delay(500, pauseCheck)
      if (signal?.aborted) return cleanup()
    }

    cleanup()
  }

  private playBeep(audioCtx: AudioContext, frequency: number) {
    try {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.value = 0.3
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.3)
    } catch {}
  }

  private async delay(ms: number, pauseCheck?: () => Promise<void>): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
    if (pauseCheck) await pauseCheck()
  }
}
