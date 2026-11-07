import { ref, onMounted } from 'vue'

const deferredPrompt = ref<any>(null)
const isInstallable = ref(false)
const isStandalone = ref(false)

if (typeof window !== 'undefined') {
  // Check if running in standalone mode (already installed PWA)
  const checkStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
  }

  isStandalone.value = checkStandalone()

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()
    // Stash the event so it can be triggered later.
    deferredPrompt.value = e
    isInstallable.value = true
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null
    isInstallable.value = false
    isStandalone.value = true
  })
}

export function usePwaInstall() {
  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt.value) return false
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      deferredPrompt.value = null
      isInstallable.value = false
      return true
    }
    return false
  }

  return {
    isInstallable,
    isStandalone,
    promptInstall,
  }
}

