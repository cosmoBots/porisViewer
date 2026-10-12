<template>
  <div class="input">
    <select
      v-if="values.length > 1"
      v-model="selectedValue"
      class="active-value-selector"
    >
      <option v-for="v in values" :key="v.id" :value="v">{{ v.name }}</option>
    </select>

    <input v-if="isValueString()" v-model="dataValue" type="text" />

    <input
      v-else-if="isValueDoubleRange()"
      class="numberPicker"
      v-model.number="dataValue"
      type="number"
      step=".01"
      :min="activeValue.rangemin"
      :max="activeValue.rangemax"
      @focus="rememberPreviousValue"
      @keydown="preventOutOfRangeStep"
      @blur="restoreInvalidValue"
    />

    <VueDatePicker
      v-else-if="isValueDateRange()"
      v-model="dataValue"
      :min="activeValue.datemin"
      :max="activeValue.datemax"
      enable-seconds
      is-24
    />

    <input v-else-if="isValueFilePath()" type="file" :accept="activeValue.fileExtension" />

    <span v-else-if="isValue() && values.length === 1">{{ activeValue.name }}</span>

    <span v-else-if="!activeValue">No values!</span>
    {{ " " }}
  </div>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

import {
  VALUE_TYPE,
  VALUE_STRING_TYPE,
  VALUE_DOUBLE_RANGE_TYPE,
  VALUE_FILE_PATH_TYPE,
  VALUE_DATE_RANGE_TYPE
} from '@/stores/porisNode'

// import { useModelStore } from '@/stores/model'
// const store = useModelStore()

const props = defineProps({
  mode: {
    type: Object,
    required: true
  }
})

const selectedValue = defineModel('selectedValue')
const dataValue = defineModel('dataValue')
const previousValue = ref(null)

function isWithinActiveRange(value, valueNode = activeValue.value) {
  if (value == null || value === '') return false

  const numericValue = Number(value)
  return (
    Number.isFinite(numericValue) &&
    numericValue >= valueNode.rangemin &&
    numericValue <= valueNode.rangemax
  )
}

function rememberPreviousValue() {
  previousValue.value = dataValue.value
}

function preventOutOfRangeStep(event) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

  const currentValue = Number(dataValue.value)
  if (!Number.isFinite(currentValue)) return

  const valueNode = activeValue.value
  const step = Number(event.currentTarget.step) || 1
  const nextValue = currentValue + (event.key === 'ArrowUp' ? step : -step)

  if (!isWithinActiveRange(nextValue, valueNode)) event.preventDefault()
}

function restoreInvalidValue(event) {
  const valueNode = activeValue.value
  if (isWithinActiveRange(dataValue.value, valueNode)) return

  const previous = previousValue.value
  const restoreValue = isWithinActiveRange(previous, valueNode) ? previous : Number(valueNode.defaultFloat)
  const commandButton = event.relatedTarget?.closest?.('[data-poris-command]')

  if (commandButton) {
    const continueCommand = window.confirm(
      'This value is outside the active range. Restore the previous value and continue with the command? Choose Cancel to cancel the command.'
    )
    if (!continueCommand) commandButton.dataset.porisCommandCancelled = 'true'
  } else {
    window.alert('This value is outside the active range. The previous value will be restored.')
  }

  dataValue.value = restoreValue
}

const mode = ref(props.mode)

const values = computed(() => {
  if (mode.value.hasValues) {
    return mode.value.valuesNodes
  } else {
    return []
  }
})

const activeValue = computed(() => selectedValue.value || mode.value.defaultValue || values.value[0])

const isValueString = () => activeValue.value?.type === VALUE_STRING_TYPE

const isValueDoubleRange = () => activeValue.value?.type === VALUE_DOUBLE_RANGE_TYPE

const isValueFilePath = () => activeValue.value?.type === VALUE_FILE_PATH_TYPE

const isValueDateRange = () => activeValue.value?.type === VALUE_DATE_RANGE_TYPE

const isValue = () => activeValue.value?.type === VALUE_TYPE

/*
console.log(`ValueSelector mode:`, props.mode)
console.log(
  `ValueSelector isValueString: ${isValueString()}, isValueDoubleRange: ${isValueDoubleRange()}, isValueDateRange: ${isValueDateRange()}, values[0]:`,
  values.value[0]
)
console.log(`ValueSelector model.value (${typeof model.value}):`, model.value)
*/

watch(
  () => props.mode,
  (newMode) => {
    console.log('watch.mode', newMode)
    mode.value = newMode
  }
)

watch(values, (newVal, oldVal) => {
  console.log(`values mode: ${mode.value.id}, changed/oldVal:`, newVal, oldVal)
})

//watch(selected, async (newVal) => {
//  emit('value', newVal)
//})
</script>
<style lang="scss" scoped>
.input {
  display: inline;

  .numberPicker {
    text-align: right;
  }
}
</style>
