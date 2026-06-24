<template>
  <div class="poris-main">
    <div v-if="isLoading" class="loading">
      <span class="spinner"></span>
    </div>
    <div v-else-if="rootSubsystem" class="panel">
      <h2 class="title">{{ rootSubsystem.name }} Panel</h2>

      <SubSystemPanel :system="rootSubsystem" />

      <div v-if="controlEnabled" class="actions">
        <button type="button" :disabled="isBusy" @click="commitChanges">Commit changes</button>
        <button type="button" :disabled="isBusy" @click="cancelChanges">Cancel</button>
        <button v-if="commandName" type="button" :disabled="isBusy" @click="executeCommand(commandName)">
          {{ commandName }}
        </button>
      </div>

      <div v-if="statusMessage" class="status" :class="{ error: hasError }">
        {{ statusMessage }}
      </div>
    </div>
  </div>
</template>
<script setup>
import SubSystemPanel from '../components/SubSystemPanel.vue'

import { computed, ref } from 'vue'
import { useModelStore } from '@/stores/model'
import { commitPorisState, executePorisCommand, hasPorisControl } from '@/api/porisControl'
const store = useModelStore()

const isLoading = computed(() => store.isLoading)
const rootSubsystem = computed(() => store.rootSubsystem)
const isBusy = ref(false)
const statusMessage = ref('')
const hasError = ref(false)
const controlEnabled = hasPorisControl()
const commandName = import.meta.env.VITE_PORIS_COMMAND_NAME || ''

const props = defineProps({
  modelPath: {
    type: String
  }
})

function currentValueFor(system) {
  const value = store.systemValues[`${system.id}`]
  if (value && typeof value === 'object') {
    return { name: value.name, id: value.id, type: value.type }
  }
  const fallback = system.currentMode?.valuesNodes?.[0]
  if (typeof value === 'number') {
    return {
      number: value,
      name: fallback?.name || null,
      id: fallback?.id || null,
      type: fallback?.type || null
    }
  }
  if (fallback) {
    return { name: fallback.name, id: fallback.id, type: fallback.type }
  }
  return null
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

async function runAction(action, successText) {
  isBusy.value = true
  hasError.value = false
  statusMessage.value = ''
  try {
    await action()
    statusMessage.value = successText
  } catch (error) {
    hasError.value = true
    statusMessage.value = error?.response?.data?.error || error.message || String(error)
  } finally {
    isBusy.value = false
  }
}

function commitChanges() {
  runAction(() => commitPorisState(buildPorisPayload()), 'Changes committed')
}

function executeCommand(name) {
  runAction(() => executePorisCommand(name), `${name} executed`)
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
</script>
<style scoped lang="scss">
.poris-main {
  max-width: 40em;
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