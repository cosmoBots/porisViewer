<template>
  <div class="inputsystem-panel" v-if="subsystem.hasValues">
    <div class="input-mode-panel">
      <span class="title">{{ subsystem.label || subsystem.name }}</span>
      <span class="value-selector">
        <ModeSelector
          class="mode-selector"
          v-if="shallShowModeField(subsystem,mode)" 
          v-model="currentMode"
          :modes="modes"
        />
        <ValueSelector v-if="shallShowValueField(subsystem)" :mode="currentMode" v-model="value" />
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
  return (!s.hasSubSystems && !s.hasRealValues && s.hasValues && s.currentMode.hasValues)
}

function shallShowValueField(s)
{
  return !fakeParam(s)
}
function shallShowModeField(s,m)
{
  return m.length > 1 || fakeParam(s)
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

const currentMode = ref(props.mode)

const value = defineModel()

value.value = store.getSystemValue(props.subsystem, currentMode.value)

watch(value, async (newValue) => {
  //console.log(`setValue() model: ${props.subsystem.ident}, value: ${newValue}`)
  store.setSystemValue(props.subsystem, newValue)
})

watch(currentMode, (newMode) => {
  console.log(`watch_input: currentMode.set() mode:`, newMode)
  //mode.value = newMode
  value.value = store.getSystemValue(props.subsystem, newMode)
  console.log(`currentMode.set() value:`, value.value)
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
  background-color: rgba(69, 120, 155, 0.5);
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px;
  margin: 6px;

  .input-mode-panel {
    display: flex;

    .title {
      font-weight: bold;
      padding-right: 16px;
    }

    .value-selector {
      position: absolute;
      right: 0.5em;
    }
  }
}
</style>
