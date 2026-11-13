import { createApp, h, ref } from 'vue'
import ValueSelector from '../src/components/ValueSelector.vue'
import { VALUE_DOUBLE_RANGE_TYPE } from '../src/stores/porisNode'

const value = { id: 'opening', name: 'Dome opening', type: VALUE_DOUBLE_RANGE_TYPE,
  rangemin: -77.5, rangemax: 77.5, defaultFloat: 0 }
const other = { ...value, id: 'precision', name: 'Fine value', rangemin: 0, rangemax: 1 }
createApp({
  components: { ValueSelector },
  setup() {
    const data = ref(0), selected = ref(value)
    const mode = { id: 'operation', hasValues: true, valuesNodes: [value, other], defaultValue: value }
    return () => [
      h('div', { style: 'width:300px;height:90px;overflow:auto;margin:30px' }, [
        h(ValueSelector, { mode, selectedValue: selected.value, dataValue: data.value,
          'onUpdate:selectedValue': v => { selected.value = v },
          'onUpdate:dataValue': v => { data.value = v } }),
        h('output', { id: 'value' }, String(data.value))
      ]),
      h('button', { id: 'outside' }, 'Outside')
    ]
  }
}).mount('#app')
