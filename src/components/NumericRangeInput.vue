<template>
  <input
    ref="numberInput"
    v-model.number="value"
    class="numberPicker"
    type="number"
    :min="min"
    :max="max"
    :step="step"
    :aria-label="label"
    :aria-expanded="open"
    @focus="showSlider"
    @blur="blurNumber"
    @keydown="onNumberKeydown"
  />
  <Teleport to="body">
    <div
      v-if="open && hasRange"
      ref="popup"
      class="poris-numeric-slider"
      :style="position"
      @focusout="closeOnFocusOut"
      @keydown.esc.stop.prevent="dismiss"
    >
      <input
        v-model.number="sliderValue"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :aria-label="label"
      />
      <div class="poris-numeric-slider-limits" aria-hidden="true">
        <span>{{ min }}</span><span>{{ max }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  min: { type: [Number, String], required: true },
  max: { type: [Number, String], required: true },
  step: { type: [Number, String], default: 0.01 },
  label: { type: String, default: 'Value' }
})
const emit = defineEmits(['focus', 'blur', 'keydown'])
const value = defineModel()
const numberInput = ref(null)
const popup = ref(null)
const open = ref(false)
const position = ref({})
const hasRange = computed(() =>
  Number.isFinite(Number(props.min)) && Number.isFinite(Number(props.max)) &&
  Number(props.min) < Number(props.max)
)
const sliderValue = computed({
  get() {
    const numeric = value.value === '' ? NaN : Number(value.value)
    return Number.isFinite(numeric)
      ? Math.min(Number(props.max), Math.max(Number(props.min), numeric))
      : Number(props.min)
  },
  set(next) { value.value = Number(next) }
})

function reposition() {
  if (!open.value || !numberInput.value) return
  const rect = numberInput.value.getBoundingClientRect()
  const width = Math.min(260, Math.max(0, window.innerWidth - 16))
  const height = popup.value?.offsetHeight || 64
  const top = rect.bottom + height + 6 <= window.innerHeight
    ? rect.bottom + 6 : Math.max(8, rect.top - height - 6)
  position.value = {
    position: 'fixed', width: `${width}px`, top: `${top}px`,
    left: `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`
  }
}

function showSlider(event) {
  open.value = hasRange.value
  reposition()
  nextTick(reposition)
  emit('focus', event)
}

function contains(target) {
  return target && (numberInput.value === target || popup.value?.contains(target))
}

function closeOnFocusOut(event) {
  if (!contains(event.relatedTarget)) open.value = false
}

function blurNumber(event) {
  emit('blur', event)
  closeOnFocusOut(event)
}

function onNumberKeydown(event) {
  if (event.key === 'Escape') {
    open.value = false
    event.stopPropagation()
  }
  emit('keydown', event)
}

function dismiss() {
  numberInput.value?.focus()
  open.value = false
}

function closeOutside(event) {
  if (!contains(event.target)) open.value = false
}

watch(open, (visible) => {
  const method = visible ? 'addEventListener' : 'removeEventListener'
  window[method]('resize', reposition)
  window[method]('scroll', reposition, true)
  document[method]('pointerdown', closeOutside, true)
}, { flush: 'sync' })
watch(() => [props.min, props.max], () => { open.value = false })
onBeforeUnmount(() => {
  window.removeEventListener('resize', reposition)
  window.removeEventListener('scroll', reposition, true)
  document.removeEventListener('pointerdown', closeOutside, true)
})
</script>

<style scoped>
.numberPicker { text-align: right; }
.poris-numeric-slider {
  z-index: 10000;
  box-sizing: border-box;
  padding: 10px 12px 6px;
  border: 1px solid #aab5c0;
  border-radius: 5px;
  background: #fff;
  color: #333;
  box-shadow: 0 3px 12px #0003;
}
.poris-numeric-slider input { display: block; width: 100%; margin: 0; }
.poris-numeric-slider-limits {
  display: flex;
  justify-content: space-between;
  font: 11px/1.5 sans-serif;
}
</style>
