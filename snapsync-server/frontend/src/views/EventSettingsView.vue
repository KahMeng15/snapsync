<template>
  <div class="dashboard page-wrapper" v-if="event">
    <AppTopNav mode="event" :event="event" currentTitle="Event Settings" />

    <div class="app-page-layout settings-container">
      
      <section class="card">
        <h2>General Info</h2>
        <p class="card-desc">Basic details about this event.</p>
        <div class="settings-box">
          <div class="field-row">
            <label>Event Name</label>
            <input type="text" v-model="eventSettings.name" class="text-input" />
          </div>
          <div class="field-row">
            <label>Event Date</label>
            <input type="date" v-model="eventSettings.date" class="text-input" />
          </div>
          <div class="field-row">
            <label>Event State</label>
            <div class="state-select-wrapper">
              <select v-model="eventSettings.status" class="custom-select">
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="inactive">Inactive</option>
              </select>
              <div class="state-desc-helper">
                <span v-if="eventSettings.status === 'upcoming'">Upcoming: Pre-event setup. Photo booth pairing is paused until active.</span>
                <span v-else-if="eventSettings.status === 'active'">Active: Event is live! Booth connects and takes photos.</span>
                <span v-else-if="eventSettings.status === 'completed'">Completed: Event finished. Booth disconnected; gallery remains accessible.</span>
                <span v-else-if="eventSettings.status === 'inactive'">Inactive: Event is paused/disabled. Booth cannot connect.</span>
              </div>
            </div>
          </div>
          <div class="field-row-col">
            <label>Organizer</label>
            <input type="text" v-model="eventSettings.organizer" class="text-input" placeholder="Faculty of ..." style="width: 100%; min-width: unset;" />
          </div>
          <div class="field-row-col">
            <label>Contact Info</label>
            <textarea v-model="eventSettings.contactInfo" class="text-input textarea-input" placeholder="Email or phone number"></textarea>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header-flex" style="margin-bottom: 0.5rem;">
          <div>
            <h2>Booth Pairing Code</h2>
            <p class="card-desc" style="margin-bottom: 0;">Use this 6-digit OTP code on the snapsync booth to connect it to this event.</p>
          </div>
          <span class="badge-booth">Booth Code</span>
        </div>
        <div class="settings-box">
          <div class="field-row otp-pairing-row">
            <div class="otp-pairing-left">
              <label>Current OTP</label>
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

      <section class="card">
        <h2>Access Expiration</h2>
        <p class="card-desc">Control when the event gallery link stops working.</p>
        <div class="settings-box">
          <div class="field-row">
            <label>Link Expiry</label>
            <select v-model="eventSettings.expiryType" class="custom-select">
              <option value="none">No Expiry</option>
              <option value="relative">Relative Duration</option>
              <option value="absolute">Specific Date & Time</option>
            </select>
          </div>
          <div class="field-row" v-if="eventSettings.expiryType === 'relative'">
            <label>Expires In</label>
            <div class="compound-input">
              <input type="number" min="1" v-model.number="relativeNumber" class="text-input num-input" />
              <select v-model="relativeUnit" class="custom-select">
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>
          <div class="field-row" v-if="eventSettings.expiryType === 'absolute'">
            <label>Date & Time</label>
            <input type="datetime-local" v-model="eventSettings.expiryValue" class="text-input datetime-input" />
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header-flex" style="margin-bottom: 0.5rem;">
          <div>
            <h2>Event Data & Backup</h2>
            <p class="card-desc" style="margin-bottom: 0;">Download a complete ZIP package of all images, frames, and settings, or import an event backup.</p>
          </div>
        </div>
        <div class="settings-box">
          <div class="field-row backup-row">
            <div class="backup-info">
              <label style="font-weight: 600; color: var(--color-text);">Export Event Data (ZIP)</label>
              <p class="backup-hint">
                Downloads a ZIP file containing all original photos, framed images, frame configurations, and database settings for this event.
              </p>
            </div>
            <AppButton variant="primary" size="sm" @click="downloadEventZip" :disabled="isDownloading">
              <svg v-if="!isDownloading" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.35rem;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>{{ isDownloading ? 'Preparing ZIP...' : 'Download Event ZIP' }}</span>
            </AppButton>
          </div>
          <div class="field-row backup-row">
            <div class="backup-info">
              <label style="font-weight: 600; color: var(--color-text);">Import Event Backup (ZIP)</label>
              <p class="backup-hint">
                Import or restore an event package from a previously downloaded ZIP archive.
              </p>
            </div>
            <AppButton variant="secondary" size="sm" @click="openImportModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.35rem;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Import Event ZIP</span>
            </AppButton>
          </div>
        </div>
      </section>

      
      <section class="card">
        <h2>Motivational Messages</h2>
        <p class="card-desc">Messages displayed during the snapsync session. These have been pre-filled with the system defaults for you to edit.</p>
        <div class="settings-box">
          <div class="field-row-col">
            <label >Homepage Hero Message</label>
            <textarea v-model="eventMessages.msgHomepage" class="text-input textarea-input" placeholder="One message per line"></textarea>
          </div>
          <div class="field-row-col">
            <label >During Countdown</label>
            <textarea v-model="eventMessages.msgCountdown" class="text-input textarea-input" placeholder="One message per line"></textarea>
          </div>
          <div class="field-row-col">
            <label >After Session (Review Screen)</label>
            <textarea v-model="eventMessages.msgPostSession" class="text-input textarea-input" placeholder="One message per line"></textarea>
          </div>
          <div class="field-row-col">
            <label >Share Page Title</label>
            <textarea v-model="eventMessages.msgShareTitle" class="text-input textarea-input" placeholder="One message per line"></textarea>
          </div>
          <div class="field-row">
            <label>Message Order</label>
            <div class="app-toggle">
              <button :class="['app-toggle-btn', eventMessages.msgOrder === 'random' ? 'app-toggle-active' : '']" @click="eventMessages.msgOrder = 'random'">Random</button>
              <button :class="['app-toggle-btn', eventMessages.msgOrder === 'sequential' ? 'app-toggle-active' : '']" @click="eventMessages.msgOrder = 'sequential'">In Order</button>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Email Overrides</h2>
        <p class="card-desc">Override the global email template for this specific event.</p>
        <div class="settings-box">
          <div class="field-row">
            <label>Enable Email Feature</label>
            <div class="app-toggle">
              <button :class="['app-toggle-btn', eventEmail.emailEnabled === 1 ? 'app-toggle-active' : '']" @click="eventEmail.emailEnabled = 1">Enabled</button>
              <button :class="['app-toggle-btn', eventEmail.emailEnabled === 0 ? 'app-toggle-active' : '']" @click="eventEmail.emailEnabled = 0">Disabled</button>
            </div>
          </div>
          <template v-if="eventEmail.emailEnabled === 1">
            <div class="field-row-col">
              <label>Sender Name (From)</label>
              <input type="text" v-model="eventEmail.emailFromName" class="text-input" placeholder="Leave empty to use global default" style="width: 100%;" />
            </div>
            <div class="field-row-col">
              <label>Subject</label>
              <input type="text" v-model="eventEmail.emailSubject" class="text-input" placeholder="Leave empty to use global default" style="width: 100%;" />
            </div>
            <div class="field-row-col">
              <label>Body</label>
              <textarea v-model="eventEmail.emailBody" class="text-input textarea-input" placeholder="Leave empty to use global default" style="height: 100px;"></textarea>
            </div>
          </template>
        </div>
      </section>

      <section class="card" v-if="eventEmail.emailEnabled === 1">
        <h2>Email Variables Guide</h2>
        <p class="card-desc">You can use these variables in your email subject and body. They will be automatically replaced with the event's actual data when the email is sent.</p>
        
        <div class="settings-box">
          <div class="field-row">
            <label style="flex: 1;"><code>{eventName}</code></label>
            <div style="flex: 2; color: var(--color-text-light); font-size: 0.9rem;">The name of the event</div>
          </div>
          <div class="field-row">
            <label style="flex: 1;"><code>{eventDate}</code></label>
            <div style="flex: 2; color: var(--color-text-light); font-size: 0.9rem;">The date the event was created</div>
          </div>
          <div class="field-row">
            <label style="flex: 1;"><code>{eventTime}</code></label>
            <div style="flex: 2; color: var(--color-text-light); font-size: 0.9rem;">The time the event was created</div>
          </div>
          <div class="field-row">
            <label style="flex: 1;"><code>{photoCount}</code></label>
            <div style="flex: 2; color: var(--color-text-light); font-size: 0.9rem;">Number of photos taken in the session</div>
          </div>
          <div class="field-row">
            <label style="flex: 1;"><code>{shareUrl}</code></label>
            <div style="flex: 2; color: var(--color-text-light); font-size: 0.9rem;">The unique link to view and download the photos</div>
          </div>
          <div class="field-row">
            <label style="flex: 1;"><code>{organizer}</code></label>
            <div style="flex: 2; color: var(--color-text-light); font-size: 0.9rem;">The organizer's name (from Settings)</div>
          </div>
          <div class="field-row">
            <label style="flex: 1;"><code>{contactInfo}</code></label>
            <div style="flex: 2; color: var(--color-text-light); font-size: 0.9rem;">The contact information (from Settings)</div>
          </div>
        </div>
      </section>

      <section class="card" v-if="authStore.user?.role === 'admin'">
        <div class="card-header-flex">
          <div>
            <h2>Operator Access</h2>
            <p class="card-desc" style="margin-bottom:0;">Manage dedicated operator accounts for this event.</p>
          </div>
          <div v-if="!operatorAccessUnlocked">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-sub)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div v-else>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
          </div>
        </div>

        <!-- Locked State -->
        


        <div class="settings-box operator-auth-box" v-if="!operatorAccessUnlocked">
          <p>Please enter your master admin password to view and manage operators.</p>
          <div class="auth-flex">
            <input type="password" v-model="adminUnlockPassword" placeholder="Admin Password" class="text-input" @keyup.enter="unlockOperatorAccess" />
            <AppButton variant="primary" @click="unlockOperatorAccess">Unlock</AppButton>
          </div>
        </div>

        <!-- Unlocked State -->
        <div v-else>
          <div class="settings-box" v-if="operators.length > 0">
            <div v-for="op in operators" :key="op.id" class="field-row">
              <div class="op-info">
                <strong>{{ op.name }}</strong>
                <div class="op-meta">Created {{ formatDateTime(op.created_at) }}</div>
              </div>
              <div class="op-actions">
                <AppButton variant="secondary" size="sm" @click="copyOperatorLink(op)">Copy Link</AppButton>
                <AppButton variant="ghost" size="sm" @click="deleteOperator(op.id)">Revoke</AppButton>
              </div>
            </div>
          </div>
          
          <div v-if="lastAddedOperator" class="operator-success-card">
            <h4>Operator Added Successfully!</h4>
            <p><strong>Name:</strong> {{ lastAddedOperator.name }}</p>
            <p><strong>Password:</strong> {{ lastAddedOperator.password }}</p>
            <p><strong>Link:</strong> {{ lastAddedOperator.link }}</p>
            <p class="warning-text">Make sure to copy the password now, it cannot be shown again.</p>
            <AppButton variant="primary" @click="copyFullMessage" style="width:100%; margin-top:1rem;">Copy All Info</AppButton>
          </div>

          <div class="settings-box add-operator-box">
            <h4>Add New Operator</h4>
            <div class="auth-flex">
              <input type="text" v-model="newOperatorName" placeholder="Operator Name (e.g. John Doe)" class="text-input" />
              <input type="text" v-model="newOperatorPassword" placeholder="Auto-generated Password" class="text-input" />
              <AppButton variant="primary" @click="addOperator">Add</AppButton>
            </div>
          </div>
        </div>
      </section>

      <div class="page-actions">
        <AppButton variant="secondary" @click="goBack">Cancel</AppButton>
        <AppButton variant="primary" @click="saveSettings" :disabled="settingsSaving">
          {{ settingsSaving ? 'Saving...' : 'Save Settings' }}
        </AppButton>
      </div>

    </div>

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
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppTopNav from '../components/ui/AppTopNav.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppModal from '../components/ui/AppModal.vue'
// import AppPageLayout from '../components/ui/AppPageLayout.vue'
import axios from 'axios'

import { toast } from 'vue3-toastify'

import { useAuthStore } from '../stores/auth'
import { formatDateTime } from '@/utils/dateFormat'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

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

const operatorAccessUnlocked = ref(false)
const adminUnlockPassword = ref('')
const operators = ref<any[]>([])
const newOperatorName = ref('')
const newOperatorPassword = ref('')

async function fetchOperators() {
  try {
    const { data } = await axios.get(`/api/admin/events/${eventId.value}/operators`)
    operators.value = data.operators
  } catch (err: any) {
    toast.error('Failed to load operators')
  }
}

async function unlockOperatorAccess() {
  try {
    await axios.post('/api/admin/verify-password', { password: adminUnlockPassword.value })
    operatorAccessUnlocked.value = true
    toast.success('Unlocked')
    await fetchOperators()
    // auto-generate a readable default password
    newOperatorPassword.value = Math.random().toString(36).slice(-8)
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Invalid password')
  }
}

const lastAddedOperator = ref<any>(null)

async function addOperator() {
  if (!newOperatorName.value || !newOperatorPassword.value) {
    toast.error('Name and Password required')
    return
  }
  const pwdToSave = newOperatorPassword.value
  try {
    await axios.post(`/api/admin/events/${eventId.value}/operators`, {
      name: newOperatorName.value,
      operatorPassword: pwdToSave,
      adminPassword: adminUnlockPassword.value
    })
    toast.success('Operator added')
    await fetchOperators()
    
    // Find the newly added operator to get its token
    const newOp = operators.value.find(o => o.name === newOperatorName.value)
    
    lastAddedOperator.value = {
      name: newOperatorName.value,
      password: pwdToSave,
      link: getOperatorLink(newOp?.access_token || '')
    }

    newOperatorName.value = ''
    newOperatorPassword.value = Math.random().toString(36).slice(-8)
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to add operator')
  }
}

async function copyFullMessage() {
  if (!lastAddedOperator.value) return
  const text = `Operator Name: ${lastAddedOperator.value.name}\nLogin Link: ${lastAddedOperator.value.link}\nPassword: ${lastAddedOperator.value.password}`
  await navigator.clipboard.writeText(text)
  toast.success('Full message copied to clipboard')
}

async function deleteOperator(operatorId: string) {
  if (!confirm('Are you sure you want to revoke this operator?')) return
  try {
    await axios.delete(`/api/admin/events/${eventId.value}/operators/${operatorId}`, {
      data: { adminPassword: adminUnlockPassword.value }
    })
    toast.success('Operator deleted')
    await fetchOperators()
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to delete operator')
  }
}

function getOperatorLink(token: string) {
  const base = window.location.origin
  // If deployed in a subdirectory, router base is needed. Let's use window.location.href parsing:
  const appRoot = window.location.href.split('/events')[0]
  return `${appRoot}/operator/${token}`
}

async function copyOperatorLink(op: any) {
  try {
    const link = getOperatorLink(op.access_token)
    // We cannot copy the password since it is hashed! We should probably show the password when created, or just tell them to copy it then.
    // Actually, since we can't get the password from the DB (it's hashed), the "Copy Info" is mostly the link and name.
    const text = `Operator Name: ${op.name}\nLogin Link: ${link}`
    await navigator.clipboard.writeText(text)
    toast.success('Link copied to clipboard')
  } catch {
    toast.error('Failed to copy')
  }
}


const relativeNumber = ref(1)
const relativeUnit = ref('days')

watch([relativeNumber, relativeUnit], ([num, unit]) => {
  if (eventSettings.value.expiryType === 'relative') {
    eventSettings.value.expiryValue = `${num}_${unit}`
  }
})

const isDownloading = ref(false)
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

async function downloadEventZip() {
  if (isDownloading.value) return
  isDownloading.value = true
  toast.info('Preparing ZIP package... This might take a few moments for large galleries.')
  try {
    const response = await axios.get(`/api/admin/events/${eventId.value}/export`, {
      responseType: 'blob'
    })
    const blob = new Blob([response.data], { type: 'application/zip' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const safeName = (event.value?.name || 'event').replace(/[^a-zA-Z0-9_-]/g, '_')
    link.setAttribute('download', `${safeName}_${eventId.value}_data.zip`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success('Event ZIP downloaded successfully!')
  } catch (err: any) {
    console.error('Failed to export event:', err)
    toast.error('Failed to download event ZIP')
  } finally {
    isDownloading.value = false
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
    const { data } = await axios.post('/api/admin/events/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    toast.success('Event package imported successfully!')
    showImportModal.value = false
    selectedZipFile.value = null
    if (data.eventId) {
      if (data.eventId === eventId.value) {
        window.location.reload()
      } else {
        router.push(`/events/${data.eventId}`)
      }
    }
  } catch (err: any) {
    console.error('Import error:', err)
    toast.error(err.response?.data?.error || 'Failed to import event ZIP')
  } finally {
    importing.value = false
  }
}

const eventSettings = ref({
  name: '',
  date: '',
  status: 'active',
  expiryType: 'none',
  expiryValue: '',
  organizer: '',
  contactInfo: ''
})

const eventMessages = ref({
  msgHomepage: '',
  msgCountdown: '',
  msgPostSession: '',
  msgShareTitle: '',
  msgOrder: 'random'
})

const eventEmail = ref({
  emailEnabled: 1,
  emailSubject: '',
  emailBody: '',
  emailFromName: ''
})

function arrayToLines(jsonStr: any) {
  if (!jsonStr) return ''
  try {
    const arr = JSON.parse(jsonStr)
    if (Array.isArray(arr)) return arr.join('\n')
  } catch {}
  return ''
}

function linesToArray(lines: any) {
  const arr = lines.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
  return arr.length > 0 ? JSON.stringify(arr) : null
}


const settingsSaving = ref(false)

onMounted(async () => {
  try {
    const { data } = await axios.get(`/api/admin/events/${eventId.value}`)
    event.value = data.event
    const ev = data.event
    eventSettings.value = {
      name: ev.name || '',
      date: ev.date || '',
      status: ev.status === 'ended' ? 'completed' : (ev.status || 'active'),
      expiryType: ev.expiry_type || 'none',
      expiryValue: ev.expiry_value || '',
      organizer: ev.organizer || '',
      contactInfo: ev.contact_info || ''
    }
    eventMessages.value = {
      msgHomepage: arrayToLines(ev.msg_homepage),
      msgCountdown: arrayToLines(ev.msg_countdown),
      msgPostSession: arrayToLines(ev.msg_post_session),
      msgShareTitle: arrayToLines(ev.msg_share_title),
      msgOrder: ev.msg_order || 'random'
    }
    eventEmail.value = {
      emailEnabled: ev.email_enabled !== undefined ? ev.email_enabled : 1,
      emailSubject: ev.email_subject || '',
      emailBody: ev.email_body || '',
      emailFromName: ev.email_from_name || ''
    }

    try {
      const { data: gData } = await axios.get('/api/admin/global-messages')
      if (!eventMessages.value.msgHomepage) eventMessages.value.msgHomepage = arrayToLines(gData.msgHomepage)
      if (!eventMessages.value.msgCountdown) eventMessages.value.msgCountdown = arrayToLines(gData.msgCountdown)
      if (!eventMessages.value.msgPostSession) eventMessages.value.msgPostSession = arrayToLines(gData.msgPostSession)
      if (!eventMessages.value.msgShareTitle) eventMessages.value.msgShareTitle = arrayToLines(gData.msgShareTitle)
      if (!ev.msg_order && gData.msgOrder) eventMessages.value.msgOrder = gData.msgOrder
    } catch (err) {
      console.warn('Could not fetch global messages', err)
    }

    if (ev.expiry_type === 'relative' && ev.expiry_value) {
      const parts = ev.expiry_value.split('_')
      if (parts.length === 2) {
        relativeNumber.value = parseInt(parts[0]) || 1
        let u = parts[1]
        if (u === 'day') u = 'days'
        if (u === 'week') u = 'weeks'
        if (u === 'month') u = 'months'
        if (u === 'year') u = 'years'
        relativeUnit.value = u
      }
    }
  } catch (err) {
    console.error('Failed to load event', err)
    toast.error('Failed to load event settings')
  }
  
  if (authStore.user?.role === 'admin') {
    await fetchOperators()
  }
})

function goBack() {
  router.push(`/events/${eventId.value}`)
}

async function saveSettings() {
  settingsSaving.value = true
  try {
    const { data } = await axios.patch(`/api/admin/events/${eventId.value}`, {
      name: eventSettings.value.name,
      date: eventSettings.value.date,
      status: eventSettings.value.status,
      expiryType: eventSettings.value.expiryType,
      expiryValue: eventSettings.value.expiryValue,
      organizer: eventSettings.value.organizer,
      contactInfo: eventSettings.value.contactInfo,
      msgHomepage: linesToArray(eventMessages.value.msgHomepage),
      msgCountdown: linesToArray(eventMessages.value.msgCountdown),
      msgPostSession: linesToArray(eventMessages.value.msgPostSession),
      msgShareTitle: linesToArray(eventMessages.value.msgShareTitle),
      msgOrder: eventMessages.value.msgOrder,
      emailEnabled: eventEmail.value.emailEnabled,
      emailSubject: eventEmail.value.emailSubject || null,
      emailBody: eventEmail.value.emailBody || null,
      emailFromName: eventEmail.value.emailFromName || null
    })
    if (data?.event && event.value) {
      event.value.status = data.event.status
    } else if (event.value) {
      event.value.status = eventSettings.value.status
    }
    toast.success('Settings saved successfully')
  } catch {
    toast.error('Failed to save settings')
  }
  settingsSaving.value = false
}
</script>

<style scoped>

.field-row-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
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
  
}
.field-row:last-child {
  border-bottom: none;
}
.field-row:nth-child(even) {
  background: var(--color-surface-alt);
}
.field-row-col {
  padding: 1rem 1.25rem;
  
}
.field-row-col label {
  display: block;
  margin-bottom: 0.5rem;
}

.field-row label, .field-row-col label {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}

.text-input, .custom-select {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  outline: none;
  min-width: 250px;
}
.text-input:focus, .custom-select:focus {
  border-color: var(--color-text-sub);
}

.compound-input {
  display: flex;
  gap: 0.5rem;
}
.num-input {
  width: 80px;
  min-width: 80px;
}
.datetime-input {
  min-width: 250px;
  color-scheme: dark;
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
  .text-input, .custom-select, .datetime-input {
    width: 100%;
    min-width: unset;
  }
}

.operator-auth-box {
  padding: 1.5rem;
}
.operator-auth-box p {
  margin: 0 0 1rem 0;
  font-size: var(--text-sm);
  color: var(--color-text-sub);
}
.auth-flex {
  display: flex;
  gap: 0.5rem;
}

.add-operator-box {
  padding: 1rem 1.25rem;
  margin-top: 1rem;
}
.add-operator-box h4 {
  margin: 0 0 0.75rem 0;
  font-size: var(--text-sm);
}

.op-info strong {
  font-size: var(--text-sm);
  display: block;
}
.op-meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}
.op-actions {
  display: flex;
  gap: 0.5rem;
}

.operator-success-card {
  margin-top: 1rem;
  padding: 1.5rem;
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
  border-radius: var(--radius-md);
}
.operator-success-card h4 {
  margin: 0 0 1rem 0;
  color: var(--color-success);
}
.operator-success-card p {
  margin: 0 0 0.5rem 0;
  font-size: var(--text-sm);
}
.warning-text {
  color: var(--color-warning);
  font-weight: 500;
  margin-top: 1rem !important;
}

.page-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.text-input.textarea-input {
  width: 100% !important;
  max-width: 100% !important;
  height: 80px;
  resize: vertical;
  text-align: left !important;
  box-sizing: border-box;
}
.field-row-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0.75rem 0.75rem;
  
}

.field-row-col label {
  font-weight: 600;
  text-align: left;
  display: block;
  width: 100%;
}

.badge-booth {
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
  color: var(--color-text-sub);
  border: 1px solid var(--color-border);
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

.state-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-end;
}
@media (max-width: 768px) {
  .state-select-wrapper {
    align-items: stretch;
  }
}
.state-desc-helper {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.4;
  max-width: 320px;
  text-align: right;
}
@media (max-width: 768px) {
  .state-desc-helper {
    text-align: left;
    max-width: unset;
  }
}

.backup-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
}
.backup-info {
  flex: 1;
  padding-right: 1.5rem;
}
.backup-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0.25rem 0 0;
  line-height: 1.4;
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
</style>
