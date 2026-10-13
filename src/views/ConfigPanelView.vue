<template>
  <div class="poris-main" :class="{ compact: props.compact }" @click.capture="clearCommandMessage" @keydown.capture="clearCommandMessage">
    <div v-if="isLoading" class="loading">
      <span class="spinner"></span>
    </div>
    <div v-else-if="rootSubsystem" class="panel">
      <h2 class="title">{{ rootSubsystem.name }} Panel</h2>

      <div v-if="visibleMonitorCapsules.length" class="monitor-capsules">
        <div v-for="capsule in visibleMonitorCapsules" :key="capsule.id" class="monitor-capsule">
          <span class="monitor-name">{{ capsule.label }}</span>
          <span class="monitor-value">{{ capsule.value }}</span>
        </div>
      </div>

      <SubSystemPanel :system="rootSubsystem" @command-launched="handleCommandLaunched" />

      <div v-if="canCommit || controlEnabled" class="actions">
        <button v-if="canCommit" type="button" :disabled="isBusy" @click="commitChanges">
          {{ props.commitUrl ? 'Commit' : 'Commit changes' }}
        </button>
        <button v-if="controlEnabled" type="button" :disabled="isBusy" @click="cancelChanges">Cancel</button>
        <button v-if="commandName" type="button" :disabled="isBusy" @click="executeCommand(commandName)">
          {{ commandName }}
        </button>
      </div>

      <div v-if="commandMessage" class="status command-message">
        {{ commandMessage }}
      </div>

      <div v-if="statusMessage" class="status" :class="{ error: hasError }">
        {{ statusMessage }}
      </div>
    </div>
  </div>
</template>
<script setup>
import SubSystemPanel from '../components/SubSystemPanel.vue'

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useModelStore } from '@/stores/model'
import { commitPorisState, executePorisCommand, getPorisState, hasPorisControl } from '@/api/porisControl'
const store = useModelStore()

const isLoading = computed(() => store.isLoading)
const rootSubsystem = computed(() => store.rootSubsystem)
const isBusy = ref(false)
const statusMessage = ref('')
const commandMessage = ref('')
const hasError = ref(false)
const controlEnabled = hasPorisControl()
const canCommit = computed(() => Boolean(props.commitUrl) || controlEnabled)
const commandName = import.meta.env.VITE_PORIS_COMMAND_NAME || ''
const monitorCapsules = ref([])
const visibleMonitorCapsules = computed(() => monitorCapsules.value.filter((capsule) => capsule.visible))
let monitorTimer = null

const props = defineProps({
  modelPath: {
    type: String
  },
  compact: {
    type: Boolean,
    default: false
  },
  commitUrl: {
    type: String,
    default: ''
  },
  csrfToken: {
    type: String,
    default: ''
  },
  initialState: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['committed'])

function currentValueFor(system) {
  const state = store.systemValues[`${system.id}`]
  const selected = state?.value || system.currentMode?.defaultValue || system.currentMode?.valuesNodes?.[0]
  if (!selected) return null

  if (typeof state?.data === 'number') {
    return {
      number: state.data,
      name: selected.name,
      id: selected.id,
      type: selected.type
    }
  }

  if (selected.type === 'ValueString' || selected.type === 'ValueFilePath') {
    return { data: state?.data ?? '', name: selected.name, id: selected.id, type: selected.type }
  }

  return { name: selected.name, id: selected.id, type: selected.type }
}

function serializeSystem(system) {
  return {
    id: system.id,
    name: system.name,
    mode: system.currentMode
      ? { id: system.currentMode.id, name: system.currentMode.name }
      : null,
    value: currentValueFor(system),
    subsystems: (system.subsystemsNodes || []).map(serializeSystem)
  }
}

function buildPorisPayload() {
  return {
    root: serializeSystem(rootSubsystem.value)
  }
}

async function refreshMonitorCapsules() {
  if (!controlEnabled) {
    return
  }
  try {
    const state = await getPorisState()
    monitorCapsules.value = state?.monitors || []
  } catch {
    monitorCapsules.value = []
  }
}

async function runAction(action, successText) {
  isBusy.value = true
  hasError.value = false
  statusMessage.value = ''
  try {
    const result = await action()
    statusMessage.value = successText
    return result
  } catch (error) {
    hasError.value = true
    statusMessage.value = error?.response?.data?.error || error.message || String(error)
  } finally {
    isBusy.value = false
  }
}

async function commitChanges() {
  const result = await runAction(
    () => commitPorisState(buildPorisPayload(), { url: props.commitUrl, csrfToken: props.csrfToken }),
    'Commit applied to the PORIS runtime'
  )
  if (result?.state) {
    store.applyRuntimeState(result.state)
    emit('committed', result)
  }
}

function executeCommand(name) {
  runAction(() => executePorisCommand(name), `${name} executed`)
}

async function handleCommandLaunched({ systemId, systemName, commandId, commandName }) {
  hasError.value = false
  if (props.commitUrl) {
    const result = await runAction(
      () => commitPorisState(
        {
          ...buildPorisPayload(),
          operations: [{ type: 'invoke_command', node_id: systemId, command_id: commandId }]
        },
        { url: props.commitUrl, csrfToken: props.csrfToken }
      ),
      `Command ${systemName}.${commandName} sent to the PORIS runtime`
    )
    if (result?.state) {
      store.applyRuntimeState(result.state)
      emit('committed', result)
    }
    const commandResult = result?.operations?.find((operation) => operation.type === 'invoke_command')
    if (commandResult?.accepted) {
      commandMessage.value = `We launched ${systemName}.${commandName}`
    } else if (commandResult) {
      hasError.value = true
      statusMessage.value = commandResult.reason || 'The PORIS command was rejected'
    }
    return
  }

  commandMessage.value = `We launched ${systemName}.${commandName}`
}

function clearCommandMessage() {
  commandMessage.value = ''
}

function cancelChanges() {
  statusMessage.value = ''
  hasError.value = false
  if (props.modelPath) {
    store.loadModelURL(props.modelPath)
  }
}

if (props.modelPath) {
  store.loadModelURL(props.modelPath)
}

watch(
  () => store.rootSubsystem,
  (root) => {
    if (root && props.initialState.length) store.applyRuntimeState(props.initialState)
  },
  { immediate: true }
)

onMounted(() => {
  refreshMonitorCapsules()
  if (controlEnabled) {
    monitorTimer = window.setInterval(refreshMonitorCapsules, 1000)
  }
})

onBeforeUnmount(() => {
  if (monitorTimer) {
    window.clearInterval(monitorTimer)
  }
})
</script>
<style scoped lang="scss">
.poris-main {
  max-width: 40em;
}

.poris-main.compact {
  max-width: 100%;
  font-size: 0.9em;
}

.loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #666;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top-color: #666;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.monitor-capsules {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.monitor-capsule {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-height: 30px;
  padding: 5px 8px;
  border: 1px solid #b8c1ca;
  background: #eef3f7;
}

.monitor-name {
  font-weight: 600;
}

.monitor-value {
  font-family: monospace;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.actions button {
  min-height: 32px;
  padding: 4px 10px;
}

.status {
  margin-top: 8px;
  color: #245f36;
}

.status.error {
  color: #9f2222;
}

</style>
