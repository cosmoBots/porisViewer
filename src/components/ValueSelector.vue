<template>
  <div class="input">
    <input v-if="isValueString()" v-model="model" type="text" />

    <input
      v-else-if="isValueDoubleRange()"
      class="numberPicker"
      v-model.number="model"
      type="number"
      step=".01"
      :min="values[0].rangemin"
      :max="values[0].rangemax"
    />

    <VueDatePicker
      v-else-if="isValueDateRange()"
      v-model="model"
      :min="values[0].datemin"
      :max="values[0].datemax"
      enable-seconds
      is-24
    />

    <input v-else-if="isValueFilePath()" type="file" :accept="values[0].fileExtension" />

    <select v-else-if="isValue()" v-model="model" :disabled2="values.length < 2">
      <option v-for="v in values" :key="v.id" :value="v">{{ v.name }}</option>
    </select>

    <span v-else>No values!</span>
    {{ mode.id }}
  </div>
</template>
<script setup>
import { computed, watch } from 'vue'
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

const model = defineModel()

const values = computed(() => props.mode.valuesNodes)

const isValueString = () => values.value.length && values.value[0].type === VALUE_STRING_TYPE

const isValueDoubleRange = () =>
  values.value.length && values.value[0].type === VALUE_DOUBLE_RANGE_TYPE

const isValueFilePath = () => values.value.length && values.value[0].type === VALUE_FILE_PATH_TYPE

const isValueDateRange = () => values.value.length && values.value[0].type === VALUE_DATE_RANGE_TYPE

const isValue = () => values.value.length && values.value[0].type === VALUE_TYPE

/*
console.log(`ValueSelector mode:`, props.mode)
console.log(
  `ValueSelector isValueString: ${isValueString()}, isValueDoubleRange: ${isValueDoubleRange()}, isValueDateRange: ${isValueDateRange()}, values[0]:`,
  values.value[0]
)
console.log(`ValueSelector model.value (${typeof model.value}):`, model.value)
*/

watch(values, (newVal, oldVal) => {
  console.log(`values mode: ${props.mode.id}, changed: ${newVal}, oldVal: ${oldVal}`)
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
