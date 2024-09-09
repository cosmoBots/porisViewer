<template>
  <div class="input-panel">
    <div class="input-mode-panel">
      <span class="title">{{ subsystem.label || subsystem.name }} / {{ subsystem.id }}</span>
      <span class="value-selector">
        <ModeSelector
          class="mode-selector"
          v-if="modes.length > 1"
          v-model="currentMode"
          :modes="modes"
        />
        <ValueSelector :mode="currentMode" v-model="value" />
      </span>
    </div>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue'
import { useModelStore } from '@/stores/model'
import ModeSelector from './ModeSelector.vue'
import ValueSelector from './ValueSelector.vue'

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

value.value = store.getModelValue(props.subsystem, currentMode.value)

watch(value, async (newValue) => {
  //console.log(`setValue() model: ${props.subsystem.ident}, value: ${newValue}`)
  store.setModelValue(props.mode, newValue)
})

watch(currentMode, (newMode) => {
  console.log(`currentMode.set() mode:`, newMode)
  //mode.value = newMode
  value.value = store.getModelValue(props.subsystem, newMode)
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
.input-panel {
  position: relative;
  background-color: rgba(235, 117, 117, 0.5);
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  margin: 8px;

  .input-mode-panel {
    display: flex;

    .title {
      font-weight: bold;
      padding-right: 16px;
    }

    .value-selector {
      position: absolute;
      right: 0;
    }
  }
}
</style>
