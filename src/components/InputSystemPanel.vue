<template>
  <!--br/>iiiiiiiiiiiiiii<br/-->
  <div class="inputsystem-panel" :class="{ 'has-commands': subsystem.commandsNodes?.length }">
    <div class="input-mode-panel">
      <span class="title">{{ subsystem.label || subsystem.name }}</span>
      <span v-if="subsystem.commandsNodes?.length" class="command-buttons">
        <button
          v-for="command in subsystem.commandsNodes"
          :key="command.id"
          type="button"
          data-poris-command
          @click="launchCommand(command, $event)"
        >
          {{ command.label || command.name }}
        </button>
      </span>
      <span class="value-selector">
        <ModeSelector
          class="mode-selector"
          v-if="shallShowModeField(subsystem, modes)"
          v-model="currentMode"
          :modes="modes"
        />
        <ValueSelector
          v-if="shallShowValueField(subsystem)"
          :mode="currentMode"
          v-model:selected-value="selectedValue"
          v-model:data-value="dataValue"
        />
      </span>
    </div>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue'
import { useModelStore } from '@/stores/model'
import ModeSelector from './ModeSelector.vue'
import ValueSelector from './ValueSelector.vue'

function fakeParam(s) {
  return !s.hasSubsystems && !s.hasRealValues && s.hasValues && s.currentMode.hasValues
}

function fakeParamWithNoValue(s) {
  return !s.hasRealValues && !s.currentMode.hasValues && !s.currentMode.hasModes
}

function shallShowValueField(s) {
  return !fakeParam(s) && !fakeParamWithNoValue(s)
}
function shallShowModeField(s, m) {
  return m.length > 1 || fakeParam(s) || fakeParamWithNoValue(s)
}

const store = useModelStore()

const props = defineProps({
  subsystem: {
    type: Object,
    required: true
  },
  modes: {
    type: Array,
    required: true
  },
  mode: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['command-launched'])

function launchCommand(command, event) {
  if (event.currentTarget.dataset.porisCommandCancelled === 'true') {
    delete event.currentTarget.dataset.porisCommandCancelled
    return
  }

  emit('command-launched', {
    systemId: props.subsystem.id,
    systemName: props.subsystem.name,
    commandId: command.id,
    commandName: command.name
  })
}

const currentMode = ref(props.mode)
const selectedValue = ref(null)
const dataValue = ref(null)

function syncValue(requestedValue = null) {
  const state = store.getSystemValue(props.subsystem, currentMode.value, requestedValue)
  selectedValue.value = state.value
  dataValue.value = state.data
}

syncValue()

watch(selectedValue, (newValue) => {
  if (newValue) {
    const state = store.getSystemValue(props.subsystem, currentMode.value, newValue)
    if (dataValue.value !== state.data) dataValue.value = state.data
  }
}, { flush: 'sync' })

watch(dataValue, (newValue) => {
  if (selectedValue.value) store.setSystemValue(props.subsystem, selectedValue.value, newValue)
}, { flush: 'sync' })

watch(
  () => store.systemValues[`${props.subsystem.id}`],
  (newState) => {
    if (!newState) return
    if (selectedValue.value?.id !== newState.value?.id) selectedValue.value = newState.value
    if (dataValue.value !== newState.data) dataValue.value = newState.data
  },
  { flush: 'sync' }
)

watch(currentMode, (newMode) => {
  console.log(`watch_input: currentMode.set() mode:`, newMode)
  syncValue()
})

watch(
  () => props.mode,
  (newValue) => {
    console.log(`new props.mode:`, newValue)
    currentMode.value = newValue
  }
)
</script>
<style lang="scss" scoped>
.inputsystem-panel {
  position: relative;
  background-color: rgba(69, 120, 155, 0.15);
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px;
  margin: 6px;
  height: 23px;

  .input-mode-panel {
    display: flex;

    .title {
      font-size: 0.75em;
      font-weight: 600;
      padding-right: 10px;
    }
  }

  .value-selector {
    position: absolute;
    right: 0.5em;
  }

  .command-buttons {
    position: absolute;
    top: 0.35em;
    right: 0.5em;
    display: flex;
    gap: 4px;
  }

  &.has-commands {
    height: auto;
    min-height: 23px;
    padding-top: 2.2em;

    .input-mode-panel {
      min-height: 1.8em;
    }

    .value-selector {
      right: 0.5em;
      bottom: 0.35em;
    }
  }
}
</style>
