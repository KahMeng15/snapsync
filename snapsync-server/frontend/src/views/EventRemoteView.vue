<template>
  <div class="dashboard page-wrapper" v-if="event">
    <AppTopNav mode="event" :event="event" currentTitle="Booth Remote" />

    <div class="app-page-layout settings-container">
      <EventControlPanel
        :connected="boothConnected"
        :event-id="event.id"
        :booth-state="boothState"
        :upload-stats="uploadStats"
        :upload-queue="uploadQueue"
        :send-message="sendMessage"
        :ws="ws"
        @retry="retryConnection"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import AppTopNav from '../components/ui/AppTopNav.vue'
import EventControlPanel from '../components/EventControlPanel.vue'
import { useWebSocket } from '../composables/useWebSocket'

const router = useRouter()
const route = useRoute()
const eventId = computed(() => route.params.id as string)

const event = ref<any>(null)
const frames = ref<any[]>([])

const boothConnected = ref(false)

// We keep boothState as the full state object from the booth
const boothState = ref<any>({ state: 'idle' })

// Also expose stats separately or via boothState, depending on how they arrive
const uploadStats = ref<any>(null)
const uploadQueue = ref<any>(null)

const { connect: connectWs, disconnect: disconnectWs, subscribe, ws, sendMessage } = useWebSocket()

onMounted(async () => {
  try {
    const [{ data: evtData }, { data: framesData }] = await Promise.all([
      axios.get(`/api/admin/events/${eventId.value}`),
      axios.get(`/api/admin/events/${eventId.value}/frames`)
    ])
    event.value = evtData.event
    frames.value = framesData.frames.filter((f: any) => !f.disabled)
  } catch (err) {
    console.error('Failed to load event data', err)
  }

  const socket = connectWs()
  if (socket) {
    if (socket.connected) {
      subscribe(eventId.value)
    } else {
      socket.on('connect', () => subscribe(eventId.value))
    }
    
    socket.on('booth-connected', (payload) => {
      if (payload.eventId === eventId.value) {
        boothConnected.value = payload.connected
      }
    })
    
    socket.on('booth-state', (payload) => {
      if (payload.eventId === eventId.value || !payload.eventId) { // backend might send state directly or in wrapper
        // Merge state or replace
        const stateData = payload.eventId ? payload.state : payload
        
        // Sometimes backend wraps it, sometimes not. Let's assume server sends the state directly if it's fan-out, but usually the eventId is at root or inside.
        // Assuming boothStateFull format:
        if (payload.eventId === eventId.value && payload.state) {
            // The payload itself IS the state if it has state. Wait, the plan says: `emit('booth-state', currentFullState)`. But server wraps it for specific operator? 
            // In server.ts, operator gets: booth-state { eventId, state: ..., phase: ... } if wrapped. Wait, if BoothApp emits `booth-state`, it sends currentFullState. The server might wrap it. 
            // Let's just assign all keys to boothState.
            // If payload has state string, it's either wrapped {eventId, state} or flat {eventId, state, phase...}. Let's assume flat.
            boothState.value = { ...payload }
            if (payload.uploadProgress) uploadStats.value = payload.uploadProgress
            if (payload.uploadQueue) uploadQueue.value = payload.uploadQueue
        }
      }
    })

    socket.on('upload-progress', (payload) => {
      if (payload.eventId === eventId.value) {
        uploadStats.value = payload.data
      }
    })

    socket.on('queue-update', (payload) => {
      if (payload.eventId === eventId.value) {
        uploadQueue.value = payload.data
      }
    })
  }
})

onUnmounted(() => {
  disconnectWs()
})

function retryConnection() {
  const socket = connectWs()
  if (socket) {
    if (socket.connected) {
      subscribe(eventId.value)
    } else {
      socket.on('connect', () => subscribe(eventId.value))
    }
  }
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
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;
  width: 100%;
}
</style>
