<template>
  <div class="dashboard page-wrapper" v-if="event">
    <AppTopNav mode="event" :event="event" currentTitle="Booth Settings" />


    

    <div class="app-page-layout settings-container">
      
      <section class="card">
        <h2>Capture Flow</h2>
        <p class="card-desc">Configure the photo sequence and timing defaults.</p>
        <div class="settings-box">
          <div class="field-row">
            <label>Photos per session</label>
            <input type="number" min="1" max="4" v-model.number="eventSettings.photoCount" class="text-input num-input" :disabled="!boothConnected" />
          </div>
          <div class="field-row">
            <label>Countdown (seconds)</label>
            <input type="number" min="3" max="10" v-model.number="eventSettings.countdown" class="text-input num-input" :disabled="!boothConnected" />
          </div>
          <div class="field-row">
            <label>Interval between shots</label>
            <input type="number" min="0" max="5" v-model.number="eventSettings.captureInterval" class="text-input num-input" :disabled="!boothConnected" />
          </div>
          <div class="field-row">
            <label>Post-capture preview</label>
            <input type="number" min="1" max="5" v-model.number="eventSettings.postCapturePreview" class="text-input num-input" :disabled="!boothConnected" />
          </div>
        </div>
      </section>

      <section class="card">
        <h2>DSLR Camera Settings</h2>
        <p class="card-desc">Remote camera overrides (overrides local booth config).</p>
        <div class="settings-box">
          <div class="field-row-col">
            <div class="slider-header">
              <label>Shutter Speed</label>
              <span class="slider-val">{{ eventSettings.dslrShutterSpeed || 'auto' }}</span>
            </div>
            <input type="range" min="0" :max="shutterChoices.length - 1" :value="shutterChoices.indexOf(eventSettings.dslrShutterSpeed) >= 0 ? shutterChoices.indexOf(eventSettings.dslrShutterSpeed) : 0" @input="eventSettings.dslrShutterSpeed = shutterChoices[parseInt(($event.target as HTMLInputElement).value)]" class="range-input" :disabled="!boothConnected" />
          </div>
          
          <div class="field-row-col">
            <div class="slider-header">
              <label>ISO</label>
              <span class="slider-val">{{ eventSettings.dslrIso || 'auto' }}</span>
            </div>
            <input type="range" min="0" :max="isoChoices.length - 1" :value="isoChoices.indexOf(eventSettings.dslrIso) >= 0 ? isoChoices.indexOf(eventSettings.dslrIso) : 0" @input="eventSettings.dslrIso = isoChoices[parseInt(($event.target as HTMLInputElement).value)]" class="range-input" :disabled="!boothConnected" />
          </div>
          
          <div class="field-row-col">
            <div class="slider-header">
              <label>Aperture</label>
              <span class="slider-val">{{ eventSettings.dslrAperture || 'auto' }}</span>
            </div>
            <input type="range" min="0" :max="apertureChoices.length - 1" :value="apertureChoices.indexOf(eventSettings.dslrAperture) >= 0 ? apertureChoices.indexOf(eventSettings.dslrAperture) : 0" @input="eventSettings.dslrAperture = apertureChoices[parseInt(($event.target as HTMLInputElement).value)]" class="range-input" :disabled="!boothConnected" />
          </div>
          
          <div class="field-row-col">
            <div class="slider-header">
              <label>White Balance</label>
              <span class="slider-val">{{ eventSettings.dslrWhiteBalance === 'Manual' ? eventSettings.dslrWhiteBalanceKelvin + 'K' : (eventSettings.dslrWhiteBalance || 'auto') }}</span>
            </div>
            <div class="button-group">
              <button :class="['focus-btn', eventSettings.dslrWhiteBalance === 'Auto' ? 'focus-active' : '']" @click="eventSettings.dslrWhiteBalance = 'Auto'" :disabled="!boothConnected">Auto</button>
              <button :class="['focus-btn', eventSettings.dslrWhiteBalance === 'Manual' ? 'focus-active' : '']" @click="eventSettings.dslrWhiteBalance = 'Manual'" :disabled="!boothConnected">Manual (K)</button>
              <button :class="['focus-btn', eventSettings.dslrWhiteBalance === 'Daylight' ? 'focus-active' : '']" @click="eventSettings.dslrWhiteBalance = 'Daylight'" :disabled="!boothConnected">Daylight</button>
              <button :class="['focus-btn', eventSettings.dslrWhiteBalance === 'Tungsten' ? 'focus-active' : '']" @click="eventSettings.dslrWhiteBalance = 'Tungsten'" :disabled="!boothConnected">Tungsten</button>
            </div>
            <div v-if="eventSettings.dslrWhiteBalance === 'Manual'" style="margin-top: 1rem;">
               <input type="range" min="2500" max="10000" step="100" v-model.number="eventSettings.dslrWhiteBalanceKelvin" class="range-input" :disabled="!boothConnected" />
            </div>
          </div>
          
          <div class="field-row-col">
            <div class="slider-header">
              <label>Focus Mode</label>
            </div>
            <div class="button-group">
              <button :class="['focus-btn', eventSettings.dslrFocusMode === 'auto' ? 'focus-active' : '']" @click="eventSettings.dslrFocusMode = 'auto'" :disabled="!boothConnected">AF (Auto)</button>
              <button :class="['focus-btn', eventSettings.dslrFocusMode === 'manual' ? 'focus-active' : '']" @click="eventSettings.dslrFocusMode = 'manual'" :disabled="!boothConnected">MF (Manual)</button>
            </div>
          </div>
        </div>
      </section>


      <section class="card" v-if="boothConnected && remoteConfig">
        <h2>Live Booth Hardware</h2>
        <p class="card-desc">These settings live only on the local machine and are being updated over WebSockets.</p>
        <div class="settings-box">
          
          <div class="field-row">
            <label>Camera Source</label>
            <select v-model="remoteConfig.cameraMode" class="custom-select">
              <option value="webcam">Webcam (USB/Built-in)</option>
              <option value="dslr">DSLR (Sony/Canon/Nikon)</option>
            </select>
          </div>
          
          <div class="field-row" v-if="remoteConfig.cameraMode === 'dslr'">
            <label>DSLR Liveview Mode</label>
            <select v-model="remoteConfig.liveviewMode" class="custom-select">
              <option value="mjpeg">MJPEG Stream (Smooth)</option>
              <option value="polling">Polling (Low Bandwidth)</option>
            </select>
          </div>

          <div class="field-row">
            <label>Auto-Start Session on Idle</label>
            <div class="focus-toggle">
              <button :class="['focus-btn', remoteConfig.autoPreview ? 'focus-active' : '']" @click="remoteConfig.autoPreview = true">ON</button>
              <button :class="['focus-btn', !remoteConfig.autoPreview ? 'focus-active' : '']" @click="remoteConfig.autoPreview = false">OFF</button>
            </div>
          </div>
          
          <div class="field-row">
            <label>Development Simulation</label>
            <div class="focus-toggle">
              <button :class="['focus-btn', remoteConfig.devSimulationEnabled ? 'focus-active' : '']" @click="remoteConfig.devSimulationEnabled = true">ENABLED</button>
              <button :class="['focus-btn', !remoteConfig.devSimulationEnabled ? 'focus-active' : '']" @click="remoteConfig.devSimulationEnabled = false">DISABLED</button>
            </div>
          </div>
          
        </div>
      </section>
      
      <!-- Connection Status -->
      <section class="card" :class="{ 'card-connected': boothConnected, 'card-disconnected': !boothConnected }">
        <div class="card-header-flex" style="margin-bottom: 1rem;">
          <div>
            <h2>Booth Connection</h2>
            <p class="card-desc" style="margin-bottom:0;">
              {{ boothConnected ? 'Booth is currently online and receiving updates.' : 'Booth is offline. Changes will sync when it reconnects.' }}
            </p>
          </div>
          <div class="status-indicator">
            <span class="pulse-dot" :class="{ 'active': boothConnected }"></span>
            {{ boothConnected ? 'Connected' : 'Disconnected' }}
          </div>
        </div>

        <div class="settings-box">
          <div class="field-row otp-pairing-row">
            <div class="otp-pairing-left">
              <label>Pairing OTP</label>
              <div class="otp-pill-group">
                <span class="otp-pill-code">{{ event?.otp || '------' }}</span>
                <button type="button" class="btn-copy-otp" @click="copyOtp" :title="otpCopied ? 'Copied!' : 'Copy OTP'">
                  <svg v-if="!otpCopied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>{{ otpCopied ? 'Copied' : 'Copy' }}</span>
                </button>
              </div>
            </div>
            <div class="otp-pairing-right">
              <AppButton variant="secondary" size="sm" @click="openResetOtpModal">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.35rem;">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Reset Code
              </AppButton>
            </div>
          </div>
        </div>
      </section>

      <div class="page-actions">

        <AppButton variant="secondary" @click="goBack">Cancel</AppButton>
        <AppButton variant="primary" @click="saveSettings" :disabled="settingsSaving || !boothConnected">
          {{ settingsSaving ? 'Saving...' : 'Save Settings' }}
        </AppButton>
      </div>
    </div>

    <!-- Reset Booth OTP Modal -->
    <AppModal v-model="showResetModal" title="Reset Booth OTP Code">
      <div class="reset-otp-modal-content">
        <div class="reset-warning-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div style="font-size: var(--text-sm); color: var(--color-text-sub); line-height: 1.4;">
            Resetting the booth OTP code will disconnect any booth currently connected to this event. You will need to enter the new code on the booth to reconnect.
          </div>
        </div>

        <div style="margin-top: 1.25rem;">
          <label style="display:block; margin-bottom: 0.5rem; font-size: var(--text-sm); font-weight: 500;">Generation Mode</label>
          <div class="app-toggle" style="width: fit-content; margin-bottom: 1rem;">
            <button type="button" :class="['app-toggle-btn', !isCustomOtp ? 'app-toggle-active' : '']" @click="isCustomOtp = false">Auto Generate</button>
            <button type="button" :class="['app-toggle-btn', isCustomOtp ? 'app-toggle-active' : '']" @click="isCustomOtp = true">Custom 6-Digit Code</button>
          </div>

          <div v-if="isCustomOtp" style="margin-top: 0.75rem;">
            <label style="display:block; margin-bottom: 0.5rem; font-size: var(--text-sm); color: var(--color-text-sub);">Enter 6-digit numeric OTP</label>
            <input
              type="text"
              inputmode="numeric"
              maxlength="6"
              v-model="customOtpInput"
              placeholder="e.g. 583920"
              class="text-input"
              style="width: 100%; box-sizing: border-box; font-family: monospace; font-size: 1.25rem; letter-spacing: 0.25rem; text-align: center;"
              @input="customOtpInput = customOtpInput.replace(/\D/g, '')"
            />
            <p v-if="customOtpInput && customOtpInput.length !== 6" style="color: var(--color-danger, #ef4444); font-size: var(--text-xs); margin-top: 0.35rem;">
              Code must be exactly 6 digits
            </p>
          </div>
          <div v-else style="font-size: var(--text-sm); color: var(--color-text-muted);">
            A unique, random 6-digit code will be generated immediately.
          </div>
        </div>
      </div>

      <template #footer>
        <AppButton variant="secondary" @click="showResetModal = false">Cancel</AppButton>
        <AppButton variant="primary" @click="confirmResetOtp" :disabled="resettingOtp || (isCustomOtp && customOtpInput.length !== 6)">
          {{ resettingOtp ? 'Resetting...' : 'Confirm Reset' }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppTopNav from '../components/ui/AppTopNav.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
import { useWebSocket } from '../composables/useWebSocket'
// import AppPageLayout from '../components/ui/AppPageLayout.vue'
import axios from 'axios'
import { toast } from 'vue3-toastify'

const router = useRouter()
const route = useRoute()

const eventId = computed(() => route.params.id as string)
const event = ref<any>(null)

const otpCopied = ref(false)
const showResetModal = ref(false)
const isCustomOtp = ref(false)
const customOtpInput = ref('')
const resettingOtp = ref(false)

async function copyOtp() {
  if (!event.value?.otp) return
  try {
    await navigator.clipboard.writeText(event.value.otp)
    otpCopied.value = true
    toast.success('Booth OTP copied to clipboard')
    setTimeout(() => { otpCopied.value = false }, 2000)
  } catch {
    toast.error('Failed to copy OTP')
  }
}

function openResetOtpModal() {
  isCustomOtp.value = false
  customOtpInput.value = ''
  showResetModal.value = true
}

async function confirmResetOtp() {
  if (isCustomOtp.value && (!customOtpInput.value || customOtpInput.value.length !== 6)) {
    toast.error('Code must be exactly 6 digits')
    return
  }
  resettingOtp.value = true
  try {
    const payload = isCustomOtp.value ? { otp: customOtpInput.value } : {}
    const { data } = await axios.post(`/api/admin/events/${eventId.value}/reset-otp`, payload)
    if (event.value) {
      event.value.otp = data.otp
    }
    showResetModal.value = false
    toast.success(`Booth OTP code reset to ${data.otp}`)
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to reset OTP code')
  } finally {
    resettingOtp.value = false
  }
}

const isoChoices = ['auto', '100', '200', '400', '800', '1600', '3200', '6400']
const shutterChoices = ['auto', '1/30', '1/40', '1/50', '1/60', '1/80', '1/100', '1/125', '1/160', '1/200', '1/250', '1/320', '1/400', '1/500', '1/640', '1/800']
const apertureChoices = ['auto', '2.8', '4', '4.5', '5', '5.6', '6.3', '7.1', '8', '9', '10', '11']

const eventSettings = ref({
  photoCount: 4,
  countdown: 5,
  captureInterval: 1,
  postCapturePreview: 2,
  dslrIso: 'auto',
  dslrShutterSpeed: 'auto',
  dslrAperture: 'auto',
  dslrFocusMode: 'auto'
})

const settingsSaving = ref(false)


const { connect: connectWs, disconnect: disconnectWs, subscribe, ws, sendMessage } = useWebSocket()
const boothConnected = ref(false)




const remoteConfig = ref<any>(null)
let socketRef: any = null

onMounted(async () => {

  try {
    const { data } = await axios.get(`/api/admin/events/${eventId.value}`)
    event.value = data.event
    const ev = data.event
    eventSettings.value = {
      photoCount: ev.photo_count || 4,
      countdown: ev.countdown || 5,
      captureInterval: ev.capture_interval || 1,
      postCapturePreview: ev.post_capture_preview || 2,
      dslrIso: ev.dslr_iso || 'auto',
      dslrShutterSpeed: ev.dslr_shutterspeed || 'auto',
      dslrAperture: ev.dslr_aperture || 'auto',
      dslrFocusMode: ev.dslr_focus_mode || 'auto',
      dslrWhiteBalance: ev.dslr_whitebalance || 'auto',
      dslrWhiteBalanceKelvin: ev.dslr_whitebalance_kelvin || 5200
    }


    const socket = connectWs()
    if (socket) {
      socketRef = socket
      subscribe(eventId.value)

      socket.on('booth-connected', (payload) => {
        if (payload.eventId === eventId.value) {
          boothConnected.value = payload.connected
          if (payload.connected) {
            socket.emit('request-booth-config', eventId.value)
          } else {
            remoteConfig.value = null
          }
        }
      })
      
      socket.on('booth-config', (payload) => {
        if (payload.eventId === eventId.value) {
          remoteConfig.value = payload.config
        }
      })

      socket.on('event-otp-reset', (payload) => {
        if (payload.eventId === eventId.value && event.value) {
          event.value.otp = payload.otp
        }
      })
      
      // Request initially just in case
      socket.emit('request-booth-config', eventId.value)
    }

  } catch (err) {
    console.error('Failed to load event', err)
  }
})


function goBack() {
  router.push(`/events/${eventId.value}`)
}

async function saveSettings() {
  settingsSaving.value = true
  try {
    await axios.patch(`/api/admin/events/${eventId.value}`, {
      photoCount: eventSettings.value.photoCount,
      countdown: eventSettings.value.countdown,
      captureInterval: eventSettings.value.captureInterval,
      postCapturePreview: eventSettings.value.postCapturePreview,
      dslrIso: eventSettings.value.dslrIso,
      dslrShutterSpeed: eventSettings.value.dslrShutterSpeed,
      dslrAperture: eventSettings.value.dslrAperture,
      dslrFocusMode: eventSettings.value.dslrFocusMode,
    })
    if (boothConnected.value && remoteConfig.value && socketRef) {
      socketRef.emit('update-booth-config', { eventId: eventId.value, config: remoteConfig.value })
    }
    toast.success('Settings saved successfully')
  } catch {
    toast.error('Failed to save settings')
  }
  settingsSaving.value = false
}
</script>

<style scoped>
.page-wrapper {
  background: var(--color-bg);
  min-height: 100vh;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}
.settings-container {
  max-width: 800px;
  margin: 0 auto;
}

.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.card h2 {
  font-size: var(--text-base);
  font-weight: 600;
  margin: 0 0 0.25rem;
}
.card-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin: 0 0 1.25rem;
}
.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.settings-box {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}
.field-row:last-child {
  border-bottom: none;
}
.field-row:nth-child(even) {
  background: var(--color-surface-alt);
}
.field-row-col {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.field-row label, .field-row-col label {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}

.text-input {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  outline: none;
}
.text-input:focus {
  border-color: var(--color-text-sub);
}
.num-input {
  width: 100px;
}
.range-input {
  width: 100%;
  accent-color: var(--color-text);
}

.slider-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.slider-val {
  color: var(--color-text);
  font-weight: 500;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.focus-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  width: max-content;
}
.focus-btn {
  background: var(--color-surface);
  border: none;
  color: var(--color-text-sub);
  padding: 0.375rem 0.75rem;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.focus-active {
  background: var(--color-border);
  color: var(--color-text);
}
.focus-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  margin-bottom: 2rem;
}

/* Status Indicator */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}
.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-error);
}
.pulse-dot.active {
  background: var(--color-success);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-success) 20%, transparent);
}

.custom-select {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  outline: none;
  min-width: 200px;
}
.custom-select:focus {
  border-color: var(--color-text-sub);
}

.app-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.app-toggle-btn {
  padding: 0.375rem 0.75rem;
  font-size: var(--text-xs);
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: var(--color-surface);
  color: var(--color-text-sub);
}
.app-toggle-btn.app-toggle-active {
  background: var(--color-text);
  color: var(--color-bg);
}

.otp-pairing-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.otp-pairing-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.otp-pill-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.otp-pill-code {
  font-family: monospace;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.2rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-sm);
}

.btn-copy-otp {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-sub);
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-xs);
  font-weight: 500;
  transition: all 0.15s ease;
}

.btn-copy-otp:hover {
  color: var(--color-text);
  border-color: var(--color-text-sub);
}

.reset-warning-banner {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.875rem 1rem;
  background: color-mix(in srgb, #f59e0b 12%, transparent);
  border: 1px solid color-mix(in srgb, #f59e0b 35%, transparent);
  border-radius: var(--radius-md);
}

@media (max-width: 768px) {
  .field-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .field-row label {
    display: block;
  }
  .text-input, .custom-select {
    width: 100%;
    min-width: unset;
  }
  .button-group, .focus-toggle {
    width: 100%;
  }
}
</style>
