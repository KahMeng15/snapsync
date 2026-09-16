const fs = require('fs')
const path = 'frontend/src/components/EventControlPanel.vue'
let content = fs.readFileSync(path, 'utf8')

// We want to replace the local retakeSelection logic with computed from boothState.
// Currently it's: const retakeSelection = ref<number[]>([])

content = content.replace(
  "const retakeSelection = ref<number[]>([])",
  "const retakeSelection = computed(() => props.boothState?.retakeIndices || [])"
)

const toggleRetakeStr = `function toggleRetake(index: number) {
  if (retakeSelection.value.includes(index)) {
    retakeSelection.value = retakeSelection.value.filter(i => i !== index)
  } else {
    retakeSelection.value.push(index)
  }
}`

const newToggleRetakeStr = `function toggleRetake(index: number) {
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
}`

if (content.includes("retakeSelection.value = retakeSelection.value.filter")) {
  content = content.replace(toggleRetakeStr, newToggleRetakeStr)
}

const initiateRetakeStr = `function initiateRetake() {
  if (retakeSelection.value.length > 0) {
    pendingAction.value = 'retake'
    setTimeout(() => { if (pendingAction.value === 'retake') pendingAction.value = null }, 2000)
    props.sendMessage('booth-retake', { eventId: props.eventId, indices: retakeSelection.value })
    retakeSelection.value = []
  }
}`

const newInitiateRetakeStr = `function initiateRetake() {
  if (retakeSelection.value.length > 0) {
    pendingAction.value = 'retake'
    setTimeout(() => { if (pendingAction.value === 'retake') pendingAction.value = null }, 2000)
    props.sendMessage('booth-retake', { eventId: props.eventId, indices: retakeSelection.value })
  }
}

function cancelRetake() {
  props.sendMessage('booth-cancel-retake', { eventId: props.eventId })
}
`

if (content.includes("props.sendMessage('booth-retake',")) {
  content = content.replace(initiateRetakeStr, newInitiateRetakeStr)
}

// Now replace the template buttons
const buttonsTemplateOld = `<button class="app-btn full-width-btn app-btn--secondary" @click="initiateRetake" :disabled="retakeSelection.length === 0 || pendingAction === 'retake'">
          <span v-if="pendingAction === 'retake'" class="app-spinner inline-spinner"></span>
          {{ pendingAction === 'retake' ? 'Initiating...' : 'Initiate Retake (' + retakeSelection.length + ')' }}
        </button>`

const buttonsTemplateNew = `<button v-if="boothState?.phase !== 'retake-selection'" class="app-btn full-width-btn app-btn--secondary" style="opacity: 0.5" disabled>
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
        </template>`

if (content.includes("Initiate Retake (")) {
  content = content.replace(buttonsTemplateOld, buttonsTemplateNew)
}

// Clean up the watch(currentState) resetting retakeSelection
const watchBlockOld = `  if (newVal !== 'preview') {
    retakeSelection.value = []
    qrShowing.value = false
  }`
const watchBlockNew = `  if (newVal !== 'preview') {
    qrShowing.value = false
  }`
if (content.includes(watchBlockOld)) {
  content = content.replace(watchBlockOld, watchBlockNew)
}

fs.writeFileSync(path, content)
