<template>
  <div class="events-page">
    <AppTopNav mode="home" />

    <main class="app-page-layout">
      <div class="events-header">
        <div class="events-header-left">
          <h2>Events</h2>
          
        </div>
        <div class="events-header-right">
          <AppButton v-if="authStore.user?.role === 'admin'" variant="secondary" @click="openImportModal" style="margin-right: 0.5rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Import Event
          </AppButton>
          <AppButton v-if="authStore.user?.role === 'admin'" variant="primary" @click="showCreateModal = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Event
          </AppButton>
        </div>
      </div>

      <div class="event-grid" v-if="events.length > 0">
        <div
          v-for="event in events"
          :key="event.id"
          class="event-card"
          @click="router.push(`/events/${event.id}`)"
        >
          <div class="event-info">
            <h3 class="event-name">{{ event.name }}</h3>
            <div class="event-organizer">{{ event.organizer || authStore.user?.email || 'Admin' }}</div>
            <p v-if="event.description" class="event-desc">{{ event.description }}</p>
          </div>
          <div class="event-meta">
            <div class="event-date">{{ formatDate(event.date) }}</div>
            <span class="event-status" :class="`status-${event.status}`">{{ event.status }}</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>No events yet. Create one to get started.</p>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-content">
          <h2>Create Event</h2>
          <div class="form-field">
            <label>Event Name</label>
            <input v-model="newEventName" placeholder="e.g. Faculty Award Night" />
          </div>
          <div class="form-field">
            <label>Date</label>
            <input v-model="newEventDate" type="date" />
          </div>
          <div class="form-field">
            <label>Description (optional)</label>
            <textarea v-model="newEventDesc" placeholder="Any notes..."></textarea>
          </div>
          <div v-if="createError" class="form-error">{{ createError }}</div>
          <div class="form-actions">
            <button @click="showCreateModal = false" class="btn-secondary">Cancel</button>
            <button @click="handleCreate" class="btn-primary" :disabled="!newEventName.trim() || creating">
              {{ creating ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="createdOtp" class="modal-overlay" @click.self="showOtpModal = false">
        <div class="modal-content otp-modal">
          <h2>Event Created</h2>
          <p>Share this OTP with the snapsync to connect:</p>
          <div class="otp-display">{{ createdOtp }}</div>
          <button @click="copyOtp" class="btn-primary">{{ otpCopied ? 'Copied!' : 'Copy OTP' }}</button>
          <button @click="createdOtp = ''" class="btn-secondary">Done</button>
        </div>
      </div>
    </Teleport>

    <!-- Import Event Package Modal -->
    <AppModal v-model="showImportModal" title="Import Event Package">
      <div class="import-modal-content">
        <p style="font-size: var(--text-sm); color: var(--color-text-sub); margin-bottom: 1rem; line-height: 1.5;">
          Select a Snapsync event backup ZIP file to import. The archive restores all frame configurations, original photos, and event database settings.
        </p>

        <div class="import-dropzone" :class="{ 'has-file': !!selectedZipFile }" @click="triggerFileInput">
          <input
            ref="fileInputRef"
            type="file"
            accept=".zip,application/zip"
            style="display: none;"
            @change="handleFileChange"
          />
          <div v-if="!selectedZipFile" class="dropzone-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 0.5rem; color: var(--color-text-sub);">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <div style="font-weight: 500;">Click to select an event ZIP file</div>
            <div style="font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 0.25rem;">Supports backups exported from Snapsync (up to 1GB)</div>
          </div>
          <div v-else class="dropzone-file-info">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <div style="flex: 1; text-align: left; margin-left: 0.75rem; overflow: hidden;">
              <strong style="display:block; font-size: var(--text-sm); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">{{ selectedZipFile.name }}</strong>
              <span style="font-size: var(--text-xs); color: var(--color-text-sub);">{{ formatBytes(selectedZipFile.size) }}</span>
            </div>
            <button type="button" @click.stop="selectedZipFile = null" class="btn-clear-file" title="Remove file">&times;</button>
          </div>
        </div>

        <div style="margin-top: 1rem;">
          <label class="checkbox-label" style="display: flex; align-items: flex-start; gap: 0.5rem; font-size: var(--text-sm); cursor: pointer;">
            <input type="checkbox" v-model="importOverwrite" style="margin-top: 0.2rem;" />
            <div>
              <span>Overwrite existing event if matching ID is found</span>
              <div style="font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 0.15rem;">
                If unchecked, an event with an existing ID will be safely imported as a new copy.
              </div>
            </div>
          </label>
        </div>
      </div>

      <template #footer>
        <AppButton variant="secondary" @click="showImportModal = false" :disabled="importing">Cancel</AppButton>
        <AppButton variant="primary" @click="executeImport" :disabled="!selectedZipFile || importing">
          {{ importing ? 'Importing...' : 'Upload & Import' }}
        </AppButton>
      </template>
    </AppModal>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppTopNav from '../components/ui/AppTopNav.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePhotosStore } from '../stores/photos'
import { toast } from 'vue3-toastify'

const router = useRouter()
const authStore = useAuthStore()
const photosStore = usePhotosStore()

const events = ref<any[]>([])
const showCreateModal = ref(false)
const newEventName = ref('')
const newEventDate = ref(new Date().toISOString().split('T')[0])
const newEventDesc = ref('')
const createError = ref('')
const creating = ref(false)
const createdOtp = ref('')
const showOtpModal = ref(false)
const otpCopied = ref(false)

const showImportModal = ref(false)
const selectedZipFile = ref<File | null>(null)
const importOverwrite = ref(false)
const importing = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function openImportModal() {
  selectedZipFile.value = null
  importOverwrite.value = false
  showImportModal.value = true
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedZipFile.value = target.files[0]
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function loadEvents() {
  try {
    const { data } = await (await import('axios')).default.get('/api/admin/events?includeEnded=true')
    events.value = data.events
  } catch (err) {
    toast.error('Failed to load events')
  }
}

async function executeImport() {
  if (!selectedZipFile.value) return
  importing.value = true
  const formData = new FormData()
  formData.append('file', selectedZipFile.value)
  if (importOverwrite.value) {
    formData.append('overwrite', 'true')
  }

  try {
    const axios = (await import('axios')).default
    const { data } = await axios.post('/api/admin/events/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    toast.success('Event package imported successfully!')
    showImportModal.value = false
    selectedZipFile.value = null
    await loadEvents()
    if (data.eventId) {
      router.push(`/events/${data.eventId}`)
    }
  } catch (err: any) {
    console.error('Import error:', err)
    toast.error(err.response?.data?.error || 'Failed to import event ZIP')
  } finally {
    importing.value = false
  }
}

import { formatDate as formatAppDate } from '@/utils/dateFormat'

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return formatAppDate(dateStr)
}

onMounted(async () => {
  await loadEvents()
})

async function handleCreate() {
  if (!newEventName.value.trim()) return
  creating.value = true
  createError.value = ''
  try {
    const res = await photosStore.createEvent(newEventName.value.trim(), newEventDate.value, newEventDesc.value.trim())
    createdOtp.value = res.otp
    showCreateModal.value = false
    newEventName.value = ''
    newEventDesc.value = ''
    toast.success('Event created successfully')
    const { data } = await (await import('axios')).default.get('/api/admin/events?includeEnded=true')
    events.value = data.events
  } catch (err: any) {
    createError.value = err.response?.data?.error || 'Failed to create event'
    toast.error(createError.value)
  } finally {
    creating.value = false
  }
}

function copyOtp() {
  navigator.clipboard.writeText(createdOtp.value)
  otpCopied.value = true
  toast.success('OTP copied to clipboard')
  setTimeout(() => { otpCopied.value = false }, 2000)
}

async function handleLogout() {
  await authStore.logout()
  toast.info('Logged out')
  router.push('/login')
}
</script>

<style scoped>
.events-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
}

.events-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  /* Full width via app-page-layout */
  width: 100%;
}
.events-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.events-header h2 {
  font-size: var(--text-2xl);
  font-weight: 700;
  margin: 0;
}
.event-count {
  color: var(--color-text-sub);
  font-size: var(--text-sm);
  background: var(--color-surface);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-lg);
}
.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.event-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.event-card:hover {
  border-color: var(--color-border);
}

.event-name {
  font-size: var(--text-base);
  font-weight: 600;
  margin: 0;
}

.event-organizer {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-sub);
  margin-top: 0.25rem;
}

.event-date {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}

.event-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin: 0.25rem 0 0;
}

.event-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.event-otp {
  font-size: var(--text-xs);
  color: var(--color-text-sub);
  font-family: monospace;
}

.event-status {
  font-size: 0.6875rem;
  text-transform: uppercase;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-lg);
}

.status-active {
  background: #1a3a2a;
  color: var(--color-success);
}

.status-upcoming {
  background: #1e293b;
  color: #3b82f6;
}

.status-completed {
  background: #2e1065;
  color: #c084fc;
}

.status-inactive {
  background: #334155;
  color: #94a3b8;
}

.status-ended {
  background: var(--color-border);
  color: var(--color-error);
}

.import-modal-content {
  padding: 0.25rem 0;
}
.import-dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  background: var(--color-surface);
  transition: all 0.15s ease;
}
.import-dropzone:hover {
  border-color: var(--color-primary, #3b82f6);
}
.import-dropzone.has-file {
  border-style: solid;
  border-color: #22c55e;
  padding: 1.25rem 1rem;
}
.dropzone-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.dropzone-file-info {
  display: flex;
  align-items: center;
}
.btn-clear-file {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-sub);
  cursor: pointer;
  padding: 0 0.5rem;
  line-height: 1;
}
.btn-clear-file:hover {
  color: var(--color-error, #ef4444);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--color-text-muted);
}

.btn-link {
  margin-top: 1rem;
  background: none;
  border: none;
  color: var(--color-info);
  cursor: pointer;
  font-size: var(--text-sm);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  width: 100%;
  max-width: 420px;
}

.modal-content h2 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.form-field label {
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}

.form-field input,
.form-field textarea {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-sm);
}

.form-field textarea {
  min-height: 60px;
  resize: vertical;
}

.form-error {
  color: var(--color-error);
  font-size: var(--text-sm);
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-primary {
  background: var(--color-info);
  color: var(--color-text);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: var(--text-sm);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-border);
  color: var(--color-text);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: var(--text-sm);
}

.otp-modal {
  text-align: center;
}

.otp-display {
  font-size: 2rem;
  font-family: monospace;
  letter-spacing: 0.5rem;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  margin: 1rem 0;
}

.otp-modal button {
  margin: 0.25rem;
}
</style>
