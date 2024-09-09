import {
  isObject as _isObject,
  isArray as _isArray,
  concat as _concat,
  compact as _compact
} from 'lodash-es'

import {
  PorisNode,
  VALUE_TYPE,
  VALUE_STRING_TYPE,
  VALUE_DOUBLE_RANGE_TYPE,
  VALUE_DATE_RANGE_TYPE,
  VALUE_FILE_PATH_TYPE,
  MODE_TYPE,
  SUBSYSTEM_TYPE,
  ValueTypes
} from 'porisNode'

function parseDestinations(jsonItem, referemcedSusbystems) {
  const destinations = []

  if (_isObject(jsonItem.destinations) && _isArray(jsonItem.destinations.destination)) {
    for (const destJsonItem of jsonItem.destinations.destination) {
      const type = destJsonItem.type
      const id = destJsonItem.id
      const ident = destJsonItem.ident

      if (type == SUBSYSTEM_TYPE) {
        if (
          !referemcedSusbystems.find((elm) => {
            elm == 1
          })
        ) {
          referemcedSusbystems.push(id)
        }
      }

      destinations.push({ type, id, ident })
    }
  }

  return destinations.length > 0 ? destinations : null
}

function parseNodeAttributes(jsonItem) {
  const nodeAttributes = []
  /*
  
  const destsArray = elm.getElementsByTagName('node-attributes')
  if (destsArray.length > 0) {
    const destElmArray = elm.getElementsByTagName('node-attribute')
    if (destElmArray.length > 0) {
      for (const destElm of destElmArray) {
        const content = getFEText(destElm, 'content')
        const name = getFEText(destElm, 'name')
        const visibility = getFEText(destElm, 'visibility')

        if (visibility) {
          nodeAttributes.push({ name, content })
        }
      }
    }
  }
    */

  return nodeAttributes.length > 0 ? nodeAttributes : null
}

function parseLabels(jsonItem) {
  const labels = []

  // const destsArray = elm.getElementsByTagName('labels')

  // if (destsArray.length > 0) {
  //   const destElmArray = elm.getElementsByTagName('label')
  //   if (destElmArray.length > 0) {
  //     for (const destElm of destElmArray) {
  //       const name = getFEText(destElm, 'name')

  //       labels.push(name)
  //       /*
  //         const scopeKindArray = elm.getElementsByTagName('scope-kind')
  //         if (scopeKindArray.length > 0) {
  //           const scopeKind = getFEText(scopeKindArray[0], 'name')

  //           labels.push({ name, scopeKind })
  //         }
  //         */
  //     }
  //   }
  // }

  return labels.length > 0 ? labels[0] : null
}

function parseBasicObject(jsonItem, referemcedSusbystems) {
  let id = jsonItem.id
  let ident = jsonItem.ident
  let name = jsonItem.name
  let nodeTypeId = jsonItem.node - type - id
  let type = jsonItem.type
  let destinations = parseDestinations(jsonItem, referemcedSusbystems)
  let nodeAttributes = parseNodeAttributes(jsonItem)
  let label = parseLabels(jsonItem)

  let hasValues = !!destinations?.find((elm) => ValueTypes.includes(elm.type))
  let hasModes = !!destinations?.find((elm) => elm.type == MODE_TYPE)
  let hasSubsystems = !!destinations?.find((elm) => elm.type == SUBSYSTEM_TYPE)

  return {
    id,
    ident,
    name,
    nodeTypeId,
    type,
    destinations,
    nodeAttributes,
    label,
    hasValues,
    hasModes,
    hasSubsystems
  }
}

export function parseToPorisModel(store, jsonText) {
  const JSONmodel = {
    values: [],
    modes: [],
    subsystems: [],

    findNode: function (type, id) {
      let source = null
      if (type == MODE_TYPE) {
        source = this.modes
      } else if (type == SUBSYSTEM_TYPE) {
        source = this.subsystems
      } else {
        source = this.values
      }

      return source.find((obj) => {
        return obj.id === id
      })
    }
  }

  var referemcedSusbystems = []

  const json = JSON.parse(jsonText)

  const poris = json.poris

  for (const item of _compact(_concat(poris.value, poris['poris-value-double-range']))) {
    const basicObj = parseBasicObject(item, referemcedSusbystems)

    let valueFormatterId = item['poris-value-formatter-id']
    basicObj[valueFormatterId] = valueFormatterId

    if (basicObj.type == VALUE_DOUBLE_RANGE_TYPE) {
      let defaultFloat = item['default-float']
      let rangemax = item['rangemax']
      let rangemin = item['rangemin']

      basicObj['defaultFloat'] = defaultFloat
      basicObj['rangemax'] = rangemax
      basicObj['rangemin'] = rangemin
    } else if (basicObj.type == VALUE_STRING_TYPE) {
      let defaultString = item['default-string']

      basicObj['defaultString'] = defaultString
    } else if (basicObj.type == VALUE_DATE_RANGE_TYPE) {
      let defaultDate = item['default-date']
      let datemax = item['date-max']
      let datemin = item['date-min']

      basicObj['defaultDate'] = defaultDate
      basicObj['datemax'] = datemax
      basicObj['datemin'] = datemin
    } else if (basicObj.type == VALUE_FILE_PATH_TYPE) {
      let defaultString = item['default-string']
      let fileDescription = item['file-description']
      let fileExtension = item['file-extension']

      basicObj['defaultString'] = defaultString
      basicObj['fileDescription'] = fileDescription
      basicObj['fileExtension'] = fileExtension
    }

    JSONmodel.values.push(new PorisNode(basicObj))
  }

  if (_isArray(poris.mode)) {
    for (const item of poris.mode) {
      const basicObj = parseBasicObject(item, referemcedSusbystems)

      let defaultModeId = item['default-mode-id']
      let defaultValueId = item['default-value-id']

      basicObj['defaultModeId'] = defaultModeId
      basicObj['defaultValueId'] = defaultValueId

      JSONmodel.modes.push(new PorisNode(basicObj))
    }
  }

  if (_isArray(poris['sub-system'])) {

  for (const item of poris['sub-system']) {
    const basicObj = parseBasicObject(item, referemcedSusbystems)

    let defaultModeId = item['default-mode-id']

    basicObj['defaultModeId'] = defaultModeId

    JSONmodel.subsystems.push(new PorisNode(basicObj))
  }
}

  console.log(JSONmodel)

  JSONmodel.rootSubsystem = JSONmodel.subsystems.find((subsys) => {
    return !referemcedSusbystems.includes(subsys.id)
  })

  //dereferenceNodeDestinations(JSONmodel, JSONmodel.values)
  dereferenceNodeDestinations(JSONmodel, JSONmodel.modes)
  dereferenceNodeDestinations(JSONmodel, JSONmodel.subsystems)

  dereferenceDefaultMode(JSONmodel.modes)
  dereferenceDefaultMode(JSONmodel.subsystems)

  return JSONmodel
}
