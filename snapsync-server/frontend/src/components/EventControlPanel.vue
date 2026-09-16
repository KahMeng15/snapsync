<template>
  <aside class="control-panel">
    <!-- Booth Remote Card -->
    <section class="card" :class="{ 'card-connected': connected, 'card-disconnected': !connected }">
      <div class="card-header-flex" style="margin-bottom: 1rem;">
        <div>
          <h2 style="margin: 0;">Booth Remote</h2>
          <p class="card-desc" style="margin-bottom:0;" v-if="!connected">Waiting for booth...</p>
        </div>
        <div class="status-indicator" @click="$emit('retry')" :style="{ cursor: !connected ? 'pointer' : 'default' }">
          <span class="pulse-dot" :class="{ 'active': connected }"></span>
          {{ connected ? 'Connected' : 'Disconnected' }}
        </div>
      </div>

      <!-- Integrated Live Preview -->
      <div class="preview-container" :class="{ 'preview-empty': !videoPlaying, 'touch-overlay-active': showOverlay }" style="margin-top: 0; margin-bottom: 1.5rem;" @click="pingOverlay">
        <div v-if="capacityError" class="capacity-error">
          Preview at capacity (Try again later)
        </div>
        <img 
          ref="previewImg" 
          class="preview-video" 
          v-show="previewEnabled && !capacityError"
          alt=""
        />
        <div v-if="previewEnabled && !capacityError && !videoPlaying" class="video-loading">
          Waiting for stream...
        </div>
        <div v-if="!previewEnabled" class="video-placeholder">
          <button class="app-btn app-btn--secondary btn-sm" @click="togglePreview">
            Enable Live Preview
          </button>
        </div>
        
        <!-- Hover to disable -->
        <div v-if="previewEnabled" class="preview-overlay-btn">
          <button class="app-btn app-btn--secondary btn-sm" @click="togglePreview">
            Disable
          </button>
        </div>
      </div>
      
      <!-- Phase / Countdown / Shot Counter (always visible when connected) -->
      <div v-if="connected" class="session-status" style="position: relative; padding: 1.5rem 1rem; background: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border); overflow: hidden;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; z-index: 2; position: relative;">
          <!-- Left Side: Phase & Shots -->
          <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem;">
            <div class="phase-badge" style="margin-bottom: 0;">{{ currentPhaseLabel || 'STANDBY' }}</div>
            <div class="shot-counter" style="align-items: flex-start; flex-direction: column; gap: 0.5rem;">
              <div class="shot-text" style="font-weight: 600;">{{ boothState?.isRetake ? 'Retake' : 'Shot' }} {{ boothState?.currentShot || 0 }} of {{ boothState?.totalShots || '-' }}</div>
              <div class="dots" style="gap: 0.25rem;">
                <span v-for="i in Math.max(boothState?.totalShots || 1, 1)" :key="i" class="dot" :class="{ active: i <= (boothState?.currentShot || 0) }"></span>
              </div>
            </div>
          </div>

          <!-- Right Side: Countdown -->
          <div style="text-align: right;">
            <div class="countdown-display" :style="{ color: ['post-photo-preview', 'time-gap'].includes(boothState?.phase) ? 'var(--color-text-sub)' : 'var(--color-text)' }" style="margin-bottom: 0; font-size: 3rem; transition: color 0.3s;">
              {{ boothState?.countdown !== undefined ? boothState?.countdown : '-' }}
            </div>
            <div style="font-size: 0.7rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Timer</div>
          </div>
        </div>

        <!-- Progress Bar at bottom -->
        <div style="position: absolute; bottom: 0; left: 0; height: 4px; background: var(--color-text);"
             :style="{ 
               width: boothState?.countdown !== undefined && maxCountdown > 0 ? `${(Math.max(0, boothState?.countdown - 1) / maxCountdown) * 100}%` : '100%',
               transition: boothState?.countdown === undefined ? 'none' : 'width 1s linear'
             }">
        </div>
      </div>

      <!-- Main Action Buttons -->
      <div class="actions-group" style="margin-top: 1rem;">
        <button v-if="currentState === 'idle'" class="app-btn full-width-btn btn-primary" @click="boothAction('start')" :disabled="!connected || pendingAction === 'start'">
          <span v-if="pendingAction === 'start'" class="app-spinner inline-spinner"></span>
          {{ pendingAction === 'start' ? 'Waking up...' : 'Wake Up Booth' }}
        </button>
        <button v-if="currentState === 'live'" class="app-btn full-width-btn btn-primary" @click="boothAction('capture')" :disabled="!connected || pendingAction === 'capture'">
          <span v-if="pendingAction === 'capture'" class="app-spinner inline-spinner"></span>
          {{ pendingAction === 'capture' ? 'Starting...' : 'Start Countdown' }}
        </button>
        <button v-if="currentState === 'live'" class="app-btn full-width-btn app-btn--secondary" @click="boothAction('home')" :disabled="!connected || pendingAction === 'home'">
          <span v-if="pendingAction === 'home'" class="app-spinner inline-spinner"></span>
          {{ pendingAction === 'home' ? 'Putting on Standby...' : 'Standby Mode' }}
        </button>
        
        <button v-if="currentState === 'capturing' && boothState?.phase === 'countdown'" class="app-btn full-width-btn btn-danger" @click="boothAction('cancel-countdown')" :disabled="!connected || pendingAction === 'cancel-countdown'">
          <span v-if="pendingAction === 'cancel-countdown'" class="app-spinner inline-spinner"></span>
          {{ pendingAction === 'cancel-countdown' ? 'Canceling...' : 'Cancel Countdown' }}
        </button>
        <button v-if="currentState === 'capturing' && boothState?.phase !== 'countdown'" class="app-btn full-width-btn btn-danger" @click="boothAction('stop')" :disabled="!connected || pendingAction === 'stop'">
          <span v-if="pendingAction === 'stop'" class="app-spinner inline-spinner"></span>
          {{ pendingAction === 'stop' ? 'Stopping...' : 'Stop Session' }}
        </button>
        <button v-if="['preview', 'retake-selection'].includes(currentState)" class="app-btn full-width-btn btn-warning" @click="boothAction('home')" :disabled="!connected || pendingAction === 'home'">
          <span v-if="pendingAction === 'home'" class="app-spinner inline-spinner"></span>
          {{ pendingAction === 'home' ? 'Returning...' : 'Return to Menu' }}
        </button>
        <button v-if="currentState === 'paused'" class="app-btn full-width-btn btn-resume" @click="togglePause(false)" :disabled="!connected || pendingAction === 'resume'">
          <span v-if="pendingAction === 'resume'" class="app-spinner inline-spinner"></span>
          {{ pendingAction === 'resume' ? 'Resuming...' : 'Resume' }}
        </button>
        <button v-if="['idle', 'live', 'capturing'].includes(currentState) && currentState !== 'paused'" class="app-btn full-width-btn btn-pause" @click="togglePause(true)" :disabled="!connected || pendingAction === 'pause'">
          <span v-if="pendingAction === 'pause'" class="app-spinner inline-spinner"></span>
          {{ pendingAction === 'pause' ? 'Pausing...' : 'Pause Booth' }}
        </button>
      </div>
    </section>

    <!-- Upload & Stats (Visible at all times to show background uploads and totals) -->
    <section class="card">
      <div class="card-header-flex">
        <h2>System Stats</h2>
      </div>
      
      <!-- Upload Progress Bar (only show if actively uploading) -->
      <div v-if="uploadStats && uploadStats.percent < 100" style="margin-bottom: 1rem;">
        <div class="progress-bar-container">
          <div class="progress-bar-fill" :style="{ width: uploadStats.percent + '%' }"></div>
        </div>
        <div class="upload-stats-text" style="margin-bottom: 0;">
          {{ uploadStats.percent }}% <span v-if="uploadStats.speed">· {{ uploadStats.speed }}</span> <span v-if="uploadStats.eta">· ETA {{ uploadStats.eta }}</span>
        </div>
      </div>
      
      <!-- Global Booth Stats & Queue -->
      <div class="stat-pills">
        <span class="pill" v-if="uploadQueue">{{ uploadQueue.uploading }} uploading</span>
        <span class="pill" v-if="uploadQueue">{{ uploadQueue.queued }} queued</span>
        <span class="pill">
          {{ boothState?.totalSessionsUploaded || 0 }} sessions uploaded
        </span>
        <span class="pill">
          {{ boothState?.totalImagesUploaded || 0 }} images uploaded
        </span>
      </div>
    </section>

    <!-- Session Photos & Retake Control -->
    <section v-if="['preview', 'retake-selection'].includes(currentState) && boothState?.sessionPhotoPaths && boothState?.sessionPhotoPaths.length > 0" class="card">
      <div class="card-header-flex">
        <h2>Session Photos</h2>
      </div>
      <div class="thumbnail-grid">
        <div 
          v-for="(path, index) in boothState?.sessionPhotoPaths" 
          :key="index" 
          class="thumbnail-container"
          @click="toggleRetake(index)"
        >
          <img :src="boothState?.sessionThumbnails?.[index] || '/api/photos/' + encodeURIComponent(path)" class="thumbnail-img" />
          <div class="thumbnail-overlay" v-if="retakeSelection.includes(index)">
            <span class="checkmark">✓</span>
          </div>
        </div>
      </div>
      <div class="actions-group" style="margin-top: 1rem;">
        <button v-if="boothState?.phase !== 'retake-selection'" class="app-btn full-width-btn app-btn--secondary" style="opacity: 0.5" disabled>
          Tap a photo to select for retake
        </button>
        <template v-else>
          <button class="app-btn full-width-btn btn-primary" @click="initiateRetake" :disabled="retakeSelection.length === 0 || pendingAction === 'retake'" style="margin-bottom: 0.5rem">
            <span v-if="pendingAction === 'retake'" class="app-spinner inline-spinner"></span>
            {{ pendingAction === 'retake' ? 'Initiating...' : 'Confirm Retake (' + retakeSelection.length + ')' }}
          </button>
          <button class="app-btn full-width-btn app-btn--secondary" @click="cancelRetake">
            Cancel Retake
          </button>
        </template>
        <button v-if="boothState?.shareUrl" class="app-btn full-width-btn app-btn--secondary" @click="toggleQR" :disabled="pendingAction === 'qr'">
          <span v-if="pendingAction === 'qr'" class="app-spinner inline-spinner"></span>
          {{ qrShowing ? 'Hide QR on Booth' : 'Show QR on Booth' }}
        </button>
        <button v-if="boothState?.shareUrl" class="app-btn full-width-btn app-btn--secondary" @click="showLocalQR">
          Show QR on Remote
        </button>
      </div>
    </section>
  </aside>

  <!-- Local QR Modal -->
  <div v-if="showRemoteQR" class="app-modal-overlay" @click="showRemoteQR = false" style="z-index: 10000; cursor: pointer;">
    <div class="app-modal" style="background: white; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 90vw; width: 400px; color: black;" @click.stop>
      <h2 style="margin-bottom: 1rem; margin-top: 0;">Scan to Get Photos</h2>
      <img v-if="remoteQrDataUrl" :src="remoteQrDataUrl" style="width: 100%; height: auto; max-width: 300px; margin: 0 auto; display: block;" />
      <div v-else style="padding: 4rem; color: #666;">Generating QR...</div>
      <button class="app-btn btn-primary" style="margin-top: 2rem; width: 100%; padding: 1rem;" @click="showRemoteQR = false">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  connected: boolean
  eventId: string
  boothState: any
  uploadStats?: any
  uploadQueue?: any
  sendMessage: (event: string, data: any) => void
  ws: any // to attach preview-chunk listener
}>()

const emit = defineEmits<{ retry: [] }>()

const currentState = computed(() => props.boothState?.state || 'idle')

const currentPhaseLabel = computed(() => {
  if (props.boothState?.phase === 'countdown') return 'COUNTDOWN'
  if (props.boothState?.phase === 'taking-photo') return 'TAKING PHOTO'
  if (props.boothState?.phase === 'post-photo-preview') return 'PREVIEW'
  if (props.boothState?.phase === 'time-gap') return 'INTERVAL'
  if (props.boothState?.phase === 'post-session') return 'PROCESSING'
  if (currentState.value === 'live') return 'READY'
  return props.boothState?.phase?.toUpperCase() || currentState.value.toUpperCase()
})

const maxCountdown = ref(0)
watch(() => props.boothState?.countdown, (newVal) => {
  if (newVal === undefined) {
    maxCountdown.value = 0
  } else if (newVal > maxCountdown.value || maxCountdown.value === 0) {
    maxCountdown.value = newVal
  }
}, { immediate: true })

const pendingAction = ref<string | null>(null)

function boothAction(action: string) {
  pendingAction.value = action
  // Safety timeout in case the network drops or client fails to transition state
  setTimeout(() => { if (pendingAction.value === action) pendingAction.value = null }, 15000)

  if (action === 'start') {
    props.sendMessage('booth-start', { eventId: props.eventId })
  } else if (action === 'capture') {
    props.sendMessage('booth-capture', { eventId: props.eventId })
  } else if (action === 'stop') {
    props.sendMessage('booth-stop', { eventId: props.eventId })
  } else if (action === 'cancel-countdown') {
    props.sendMessage('booth-cancel-countdown', { eventId: props.eventId })
  } else if (action === 'home') {
    props.sendMessage('booth-go-home', { eventId: props.eventId })
  }
}

function togglePause(paused: boolean) {
  const action = paused ? 'pause' : 'resume'
  pendingAction.value = action
  setTimeout(() => { if (pendingAction.value === action) pendingAction.value = null }, 15000)
  props.sendMessage('booth-pause', { eventId: props.eventId, paused })
}

// Retake logic
const retakeSelection = computed(() => props.boothState?.retakeIndices || [])

watch(currentState, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    pendingAction.value = null
  }
  
  if (newVal !== 'preview' && newVal !== 'retake-selection') {
    qrShowing.value = false
  }
  
  if (newVal === 'idle' || newVal === 'preview' || newVal === 'retake-selection') {
    // Booth camera is off, turn off the remote stream viewer
    if (previewEnabled.value) {
      pausePreview()
    }
  }

  // Automatically re-request stream if booth wakes up and we already want the stream
  if (newVal === 'live' && previewEnabled.value) {
    pausePreview()
    setTimeout(() => {
      startPreview()
    }, 100)
  }
})

function toggleRetake(index: number) {
  let newSelection = [...retakeSelection.value]
  if (newSelection.includes(index)) {
    newSelection = newSelection.filter(i => i !== index)
  } else {
    newSelection.push(index)
  }
  
  if (props.boothState?.phase !== 'retake-selection') {
    // Automatically enter retake mode on the client if it's not already in it
    props.sendMessage('booth-update-retake', { eventId: props.eventId, indices: newSelection })
  } else {
    props.sendMessage('booth-update-retake', { eventId: props.eventId, indices: newSelection })
  }
}

function initiateRetake() {
  if (retakeSelection.value.length > 0) {
    pendingAction.value = 'retake'
    setTimeout(() => { if (pendingAction.value === 'retake') pendingAction.value = null }, 2000)
    props.sendMessage('booth-retake', { eventId: props.eventId, indices: retakeSelection.value })
  }
}

function cancelRetake() {
  props.sendMessage('booth-cancel-retake', { eventId: props.eventId })
}


// QR Logic
const qrShowing = ref(false)
const showRemoteQR = ref(false)
const remoteQrDataUrl = ref('')

async function showLocalQR() {
  if (!props.boothState?.shareUrl) return
  showRemoteQR.value = true
  remoteQrDataUrl.value = await QRCode.toDataURL(props.boothState.shareUrl, {
    width: 500,
    margin: 2,
  })
}

function toggleQR() {
  qrShowing.value = !qrShowing.value
  pendingAction.value = 'qr'
  setTimeout(() => { if (pendingAction.value === 'qr') pendingAction.value = null }, 2000)
  
  if (qrShowing.value) {
    props.sendMessage('booth-show-qr', { eventId: props.eventId })
  } else {
    props.sendMessage('booth-hide-qr', { eventId: props.eventId })
  }
}

// Preview Logic
const previewCollapsed = ref(true)
const previewEnabled = ref(false)
const capacityError = ref(false)
const videoPlaying = ref(false)
const previewImg = ref<HTMLImageElement | null>(null)
let lastFrameUrl = ''

const showOverlay = ref(false)
let overlayTimer: any = null

function pingOverlay() {
  if (!previewEnabled.value) return
  showOverlay.value = true
  if (overlayTimer) clearTimeout(overlayTimer)
  overlayTimer = setTimeout(() => {
    showOverlay.value = false
  }, 3000)
}

function onWindowClick(e: MouseEvent | TouchEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.preview-container')) {
    showOverlay.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', onWindowClick)
  window.addEventListener('touchstart', onWindowClick, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('click', onWindowClick)
  window.removeEventListener('touchstart', onWindowClick)
  if (overlayTimer) clearTimeout(overlayTimer)
})

function togglePreview() {
  if (previewEnabled.value) {
    stopPreview()
  } else {
    startPreview()
  }
}

function startPreview() {
  previewEnabled.value = true
  capacityError.value = false
  videoPlaying.value = false
  previewCollapsed.value = false

  props.sendMessage('request-preview', { eventId: props.eventId })
}

function pausePreview() {
  videoPlaying.value = false
  props.sendMessage('stop-preview', { eventId: props.eventId })
  if (lastFrameUrl) {
    URL.revokeObjectURL(lastFrameUrl)
    lastFrameUrl = ''
  }
  if (previewImg.value) {
    previewImg.value.src = ''
  }
}

function stopPreview() {
  previewEnabled.value = false
  pausePreview()
}

function handlePreviewFrame(frame: ArrayBuffer) {
  if (!previewEnabled.value || capacityError.value) return
  if (!videoPlaying.value) videoPlaying.value = true

  const blob = new Blob([frame], { type: 'image/jpeg' })
  const url = URL.createObjectURL(blob)
  
  if (previewImg.value) {
    previewImg.value.onload = () => {
      if (lastFrameUrl && lastFrameUrl !== url) {
        URL.revokeObjectURL(lastFrameUrl)
      }
      lastFrameUrl = url
    }
    previewImg.value.src = url
  }
}

function handlePreviewCapacity() {
  capacityError.value = true
  stopPreview()
}

function attachWsListeners(socket: any) {
  if (!socket) return
  socket.on('preview-frame', handlePreviewFrame)
  socket.on('preview-capacity', handlePreviewCapacity)
}

function detachWsListeners(socket: any) {
  if (!socket) return
  socket.off('preview-frame', handlePreviewFrame)
  socket.off('preview-capacity', handlePreviewCapacity)
}

watch(() => props.ws, (newWs, oldWs) => {
  if (oldWs) detachWsListeners(oldWs)
  if (newWs) attachWsListeners(newWs)
}, { immediate: true })

onUnmounted(() => {
  stopPreview()
  detachWsListeners(props.ws)
})
</script>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}
.card h2 {
  font-size: var(--text-base);
  font-weight: 600;
  margin: 0 0 0.25rem;
}
.card-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin: 0 0 1rem;
  line-height: 1.3;
}
.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

/* Status */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
}
.pulse-dot.active {
  background: var(--color-success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success) 20%, transparent);
}

.session-status {
  text-align: center;
  padding: 2rem 0;
}
.phase-badge {
  display: inline-block;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-sub);
  margin-bottom: 1rem;
  letter-spacing: 0.05em;
}
.countdown-display {
  font-size: 4rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 1rem;
  color: var(--color-text);
  animation: popIn 0.3s ease-out;
}
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.shot-counter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.dots {
  display: flex;
  gap: 0.5rem;
}
.dot {
  width: 2rem;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  border: none;
}
.dot.active {
  background: var(--color-text);
}
.shot-text {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.actions-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.app-btn {
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: var(--text-base);
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  white-space: nowrap;
}
.full-width-btn {
  width: 100%;
  text-align: center;
}
.btn-primary {
  background: var(--color-text);
  color: var(--color-bg);
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-text-muted);
}
.btn-danger {
  background: var(--color-error);
  color: #fff;
}
.btn-warning {
  background: #ff9800;
  color: #fff;
}
.btn-pause {
  background: #ff9800;
  color: #fff;
}
.btn-resume {
  background: var(--color-success);
  color: #fff;
}
.app-btn--secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.app-btn--secondary:hover:not(:disabled) {
  background: var(--color-border);
}
.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: var(--text-sm);
}
.app-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Upload Progress */
.progress-bar-container {
  height: 8px;
  background: var(--color-surface);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
  border: 1px solid var(--color-border);
}
.progress-bar-fill {
  height: 100%;
  background: var(--color-success);
  transition: width 0.3s ease;
}
.upload-stats-text {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}
.stat-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pill {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--color-text-sub);
}

/* Thumbnail Grid */
.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
}
.thumbnail-container {
  position: relative;
  aspect-ratio: 3/2;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
}
.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumbnail-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.checkmark {
  color: white;
  font-size: 2rem;
  font-weight: bold;
}

/* Preview */
.preview-container {
  background: #000;
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;
}
.preview-empty {
  aspect-ratio: 4/3;
}
.preview-video {
  width: 100%;
  height: auto;
  display: block;
}
.video-loading, .video-placeholder, .capacity-error {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-sub);
  font-size: var(--text-sm);
  background: var(--color-surface-alt);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}
.capacity-error {
  color: var(--color-error);
}
.preview-overlay-btn {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}
@media (hover: hover) {
  .preview-container:hover .preview-overlay-btn {
    opacity: 1;
    visibility: visible;
  }
}
@media (hover: none) {
  .preview-overlay-btn {
    pointer-events: none;
  }
  .preview-container.touch-overlay-active .preview-overlay-btn {
    opacity: 1;
    visibility: visible;
  }
  .preview-container.touch-overlay-active .preview-overlay-btn button {
    pointer-events: auto;
  }
}
.collapse-icon {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
