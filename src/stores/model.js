import {
  concat as _concat,
  intersection as _intersection,
  difference as _difference,
  isUndefined as _isUndefined
} from 'lodash-es'
import { ref } from 'vue'
import { defineStore } from 'pinia'

import { VALUE_STRING_TYPE, VALUE_DOUBLE_RANGE_TYPE, VALUE_FILE_PATH_TYPE } from './porisNode'

import { xmlModelLoader } from '@/api/modelLoader'
import { parseToPorisModel } from './xmlParser'

export const useModelStore = defineStore('model', () => {
  const xmlModel = ref(null)
  const values = ref([])
  const modes = ref([])
  const subsystems = ref([])
  const rootSubsystem = ref()

  const currentModes = ref([])

  const systemValues = ref({})

  function loadModel(modelName) {
    xmlModelLoader(modelName).then((model) => {
      xmlModel.value = model

      let JSONmodel = parseToPorisModel(this, model)

      values.value = JSONmodel.values
      modes.value = JSONmodel.modes
      subsystems.value = JSONmodel.subsystems
      rootSubsystem.value = JSONmodel.rootSubsystem

      console.log('LIMPIANDO valores por defecto')
      currentModes.value = []

      systemValues.value = {}

      console.log('Initial setValidMode')
      setValidMode(JSONmodel.rootSubsystem)
    })
  }

  function getValue(id) {
    return values.value.find((element) => element.id == id)
  }

  function getMode(id) {
    return modes.value.find((element) => element.id == id)
  }

  function getSubsystem(id) {
    return subsystems.value.find((element) => element.id == id)
  }

  var DEBUG = false

  function setValidModeFrom(subsystem, mode, validModes) {
    subsystem.validModes = validModes
    if (validModes.length > 0) {
      let prevMode = subsystem.currentMode
      let candidate = null
      if (validModes.length > 0) {
        if (mode != null && validModes.includes(mode)) {
          console.log(`setValidMode_ candidate mode`)
          candidate = mode
        } else {
          if (validModes.includes(subsystem.defaultMode)) {
            candidate = subsystem.defaultMode
            console.log(`setValidMode_ candidate default`)
          } else {
            candidate = validModes[0]
            console.log(`setValidMode_ candidate firstvalid`)
          }
        }
      } else {
        console.log(`setValidMode_ candidate default without parent`)
        candidate = subsystem.defaultMode
      }

      if (prevMode != candidate) {
        console.log(`setValidMode_() subsystem:`, subsystem.name, candidate.name)
        subsystem.currentMode = candidate
        currentModes.value[`${subsystem.id}`] = candidate
        console.log(`setValidMode Value set`, subsystem.currentMode)
        if (subsystem.hasValues) {
          getSystemValue(subsystem, subsystem.currentMode)
        }
        if (subsystem.hasSubsystems) {
          subsystem.subsystemsNodes.forEach((ss) => {
            setValidSubMode(ss, ss.currentMode, subsystem.currentMode)
          })
        }
      }
      return candidate
    } else {
      subsystem.currentMode = null
      return null
    }
  }

  /**
   * Resets the whole tree of valid modes
   * @param {*} subsystem
   * @param {*} mode
   */
  function setValidMode(subsystem, mode) {
    let validModes = getValidObjModes(subsystem)
    console.log(`setValidMode_ NOT using supermode len ${validModes.length}`)
    console.log(`setValidMode() subsystem:`, subsystem, mode)
    console.log(`   setValidMode validModes`, validModes)

    return setValidModeFrom(subsystem, mode, validModes)
  }

  function setValidSubMode(subsystem, mode, supermode) {
    let validModes = _intersection(subsystem.modesNodes, supermode.modesNodes)
    console.log(`setValidMode_ using supermode len ${validModes.length}`)
    validModes.forEach((m) => {
      console.log(`setValidMode_ valid: ${m}`)
    })
    console.log(`setValidMode() subsystem:`, subsystem, mode)
    console.log(`   setValidMode validModes`, validModes)

    return setValidModeFrom(subsystem, mode, validModes)
  }

  function getCurrentMode(modeOptions) {
    const current = currentModes.value.reduce((accumulator, param) => {
      if (modeOptions.includes(param.id)) {
        return param
      }

      return accumulator
    }, null)

    if (current) {
      return current
    } else {
      return modeOptions[0]
    }
  }

  function getValidObjModes(obj) {
    // if (obj.id === 534) {
    // console.log(`getValidObjModes() obj.id: ${obj.id}`, obj)
    //console.log(`getValidObjModes() getObjModes`, getObjModes(obj))
    // console.log(`getValidObjModes() validModes`, validModes.value)
    // console.log(`getValidObjModes() _intersection`,  _intersection(obj.modesNodes, validModes.value))
    // }

    console.log(`obj: ${obj.name}`)
    console.log(`objModes: ${obj.modesNodes}`)
    obj.modesNodes.forEach((m) => {
      console.log(m.name)
    })
    if (obj.parent != null) {
      console.log(`parent: ${obj.parent.name}`)
      console.log(`parent mode: ${obj.parent.currentMode}`)
      console.log(`obj.modesNodes: ${obj.modesNodes}`)
      console.log(`obj.modesNodes[0]: ${obj.modesNodes[0]}`)
      console.log(`obj.modesNodes[0].name: ${obj.modesNodes[0].name}`)
      let ret = _intersection(obj.modesNodes, obj.parent.currentMode.modes)
      console.log('modesNodes ret')
      console.log(`modesNodes ret[0]: ${obj.modesNodes[0]}`)
      console.log(`modesNodes ret[0].name: ${obj.modesNodes[0].name}`)
      return ret
    } else {
      return obj.modesNodes
    }
  }

  function hasValidObjModes(obj) {
    //console.log(`hasValidObjModes() id: ${obj.id}, ${getValidObjModes(obj).length > 0}`)
    return getValidObjModes(obj).length > 0
  }

  function setSystemValue(system, value) {
    console.log(`setSystemValue() system: ${system.id}, value:`, value)
    systemValues.value[`${system.id}`] = value
  }

  function getSystemValue(system, mode) {
    let value = systemValues.value[`${system.id}`]

    console.log(
      `getSystemValue() system: ${system.id}, _isUndefined(value): ${_isUndefined(value)}, mode / value`,
      mode,
      value
    )

    if (!mode.hasValues) {
      //console.log(`getSystemValue() no value!!`)
      return null
    }

    let valueOptions = mode.valuesNodes

    if (
      !_isUndefined(value) &&
      valueOptions.find((val) => {
        val.id === value.id
      }) === null
    ) {
      value = undefined
    }

    console.log(`getModelValue() valueOptions[0].type: ${valueOptions[0].type}`)

    if (valueOptions[0].type == VALUE_STRING_TYPE) {
      if (_isUndefined(value)) {
        value = valueOptions[0].defaultString
      }
    } else if (valueOptions[0].type == VALUE_DOUBLE_RANGE_TYPE) {
      if (
        _isUndefined(value) ||
        valueOptions[0].rangemin > value ||
        valueOptions[0].rangemax < value
      ) {
        value = valueOptions[0].defaultFloat
      }
    } else if (valueOptions[0].type == VALUE_FILE_PATH_TYPE) {
      console.log('FILE')
      if (_isUndefined(value)) {
        value = valueOptions[0].defaultString
      }
    } else {
      if (_isUndefined(value) || !valueOptions.includes(value)) {
        value = valueOptions[0]
      }
    }

    setSystemValue(system, value)

    return value
  }

  /*
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }
*/
  return {
    xmlModel,
    rootSubsystem,
    currentModes,
    systemValues,
    loadModel,
    getValue,
    getMode,
    getSubsystem,
    getCurrentMode,
    setValidMode,
    getValidObjModes,
    hasValidObjModes,
    getSystemValue,
    setSystemValue
  }
})
