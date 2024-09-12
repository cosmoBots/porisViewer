<template>
  <select v-model="model" :disabled="modes.length < 2">
    <option v-for="mode in modes" :key="mode.id" :value="mode">
      {{ mode.label || mode.name }}
    </option>
  </select>
</template>

<script setup>
import { ref, watch } from 'vue'
//import { useModelStore } from '@/stores/model';
//const store = useModelStore()

const model = defineModel()

const props = defineProps({
  modes: {
    type: Array,
    required: true
  }
})

// console.log(`model: ${model.value}, modes:`, props.modes)

const modes = ref(props.modes)

watch(
  () => props.modes,
  (newVal, oldVal) => {
    //console.log(`Prop changed: ${newVal}, oldVal: ${oldVal}`)
    modes.value = newVal
  }
)
</script>
<style lang="scss" scoped></style>
