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
} from './porisNode'

// Mapping between XML types, as defined on <type> and <destination type="">
// and the common project types
const XMLTypeToPorisType = {
  PORISValue: VALUE_TYPE,
  PORISValueString: VALUE_STRING_TYPE,
  PORISValueFloat: VALUE_DOUBLE_RANGE_TYPE,
  PORISValueDate: VALUE_DATE_RANGE_TYPE,
  PORISValueFilePath: VALUE_FILE_PATH_TYPE,
  PORISMode: MODE_TYPE,
  PORISNode: SUBSYSTEM_TYPE
}

// Foloowing XML tag names used for selecting the elements 
const XMLValueTagNames = [
  'poris-value',
  'poris-value-string',
  'poris-value-float',
  'poris-value-date',
  'poris-value-file-path'
]

const XMLModeTagName = 'poris-mode'

const XMLSystemTagName = 'poris-node'

/**
 * Returns the value of text XML, converted to the type defined on the 
 * type attribute, or the text it selfif no recognized type is found.
 * @param {*} elm 
 * @param {*} tagName 
 * @returns 
 */
function getFEText(elm, tagName) {
  const elmArray = elm.getElementsByTagName(tagName)
  if (elmArray.length > 0 && elmArray[0].childNodes.length > 0) {
    const type = elmArray[0].getAttribute('type')
    if (type === 'integer') {
      return parseInt(elmArray[0].childNodes[0].nodeValue, 10)
    } else if (type === 'float') {
      return parseFloat(elmArray[0].childNodes[0].nodeValue)
    } else if (type === 'timestamp') {
      return Date.parse(elmArray[0].childNodes[0].nodeValue)
    } else {
      return elmArray[0].childNodes[0].nodeValue
    }
  } else {
    return null
  }
}

function parseDestinations(elm, referemcedSusbystems) {
  /*
  <destinations type="array">
              <destination type="Value">
                  <id type="integer">2000000005</id>
                  <ident>n0::n0::n0::n0::n4</ident>
              </destination>
          </destinations>
  */
  const destsArray = elm.getElementsByTagName('destinations')

  const destinations = []

  if (destsArray.length > 0) {
    const destElmArray = elm.getElementsByTagName('destination')
    if (destElmArray.length > 0) {
      for (const destElm of destElmArray) {
        const type = XMLTypeToPorisType[destElm.getAttribute('type')]
        const id = getFEText(destElm, 'id')

        if (type == SUBSYSTEM_TYPE) {
          if (
            !referemcedSusbystems.find((elm) => {
              elm == 1
            })
          ) {
            referemcedSusbystems.push(id)
          }
        }
      /*
          if (type == 'Value') {
  
          } else if (type == 'Mode') {
  
          } else if (type == 'SubSystem') {
  
          }
  */
        destinations.push({ type, id })
      }
    }
  }

  return destinations.length > 0 ? destinations : null
}

function parseNodeAttributes(elm) {
  /*
      <node-attributes type="array">
        <node-attribute>
          <content>680.0</content>
          <name>lambda(&#197;)</name>
          <visibility type="boolean">true</visibility>
        </node-attribute>
        <node-attribute>
          <content>43.0</content>
          <name>fwhm(&#197;)</name>
          <visibility type="boolean">true</visibility>
        </node-attribute>
      </node-attributes>
  */
  const destsArray = elm.getElementsByTagName('node-attributes')

  const nodeAttributes = []

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

  return nodeAttributes.length > 0 ? nodeAttributes : null
}

function parseLabels(elm) {
  /*
    <labels type="array">
      <label>
        <name>Order</name>
        <scope-kind>
          <name>OPMS</name>
        </scope-kind>
      </label>
    </labels>
  */
  const destsArray = elm.getElementsByTagName('labels')

  const labels = []

  if (destsArray.length > 0) {
    const destElmArray = elm.getElementsByTagName('label')
    if (destElmArray.length > 0) {
      for (const destElm of destElmArray) {
        const name = getFEText(destElm, 'name')

        labels.push(name)
        /*
          const scopeKindArray = elm.getElementsByTagName('scope-kind')
          if (scopeKindArray.length > 0) {
            const scopeKind = getFEText(scopeKindArray[0], 'name')
  
            labels.push({ name, scopeKind })
          }
          */
      }
    }
  }

  return labels.length > 0 ? labels[0] : null
}

function parseBasicObject(elm, referemcedSusbystems) {
  let id = getFEText(elm, 'id')
  let ident = getFEText(elm, 'ident')
  let name = getFEText(elm, 'name')
  let nodeTypeId = getFEText(elm, 'node-type-id')
  let type = XMLTypeToPorisType[getFEText(elm, 'type')] // Converto from XML type to standard Poris type
  let destinations = parseDestinations(elm, referemcedSusbystems)
  let nodeAttributes = parseNodeAttributes(elm)
  let label = parseLabels(elm)

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

function dereferenceNodeDestinations(JSONmodel, nodes) {
  nodes.forEach((node) => {
    if (node.destinations) {
      let derDestinations = node.destinations.map((dest) => {
        return JSONmodel.findNode(dest.type, dest.id)
      })

console.log("DDDD node.id " + node.id, derDestinations)

      node.valuesNodes = derDestinations.filter(
        (dest) => dest.type != MODE_TYPE && dest.type != SUBSYSTEM_TYPE
      )
      node.modesNodes = derDestinations.filter((dest) => dest.type === MODE_TYPE)
      node.subsystemsNodes = derDestinations.filter((dest) => dest.type === SUBSYSTEM_TYPE)
    }
  })
}

function dereferenceDefaultMode(nodes) {
  nodes.forEach((node) => {
    let defMode = null
    if (node.modesNodes && node.modesNodes.length > 0) {
      if (node.defaultModeId) {
        defMode = node.modesNodes.find((m) => m.id === node.defaultModeId)
      } else {
        defMode = node.modesNodes[0]
      }
    }

    node.defaultMode = defMode
  })
}

export function parseToPorisModel(store, xmlText) {
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

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

  /*
      <poris-value>
          <id type="integer">2000000012</id>
          <ident>n0::n0::n0::n1::n2</ident>
          <name>R2000</name>
          <node-type-id type="integer">5</node-type-id>
          <project-id type="integer">13</project-id>
          <type>Value</type>
          <poris-value-formatter-id type="integer" nil="true"/>
          <destinations type="array"/>
          <node-attributes type="array"/>
          <labels type="array"/>
      </poris-value>
  
      <poris-value-double-range>
          <id type="integer">2000000014</id>
          <ident>n0::n0::n0::n2::n0::n0</ident>
          <name>NormalRange</name>
          <node-type-id type="integer">5</node-type-id>
          <project-id type="integer">13</project-id>
          <type>ValueDoubleRange</type>
          <poris-value-formatter-id type="integer">5</poris-value-formatter-id>
          <default-float type="float">1</default-float>
          <rangemax type="float">3600</rangemax>
          <rangemin type="float">0</rangemin>
          <destinations type="array"/>
          <node-attributes type="array"/>
          <labels type="array"/>
      </poris-value-double-range>
  
  
      <poris-value-string>
          <id type="integer">2000000035</id>
          <ident>EX-1860</ident>
          <name>userFilter</name>
          <node-type-id type="integer">5</node-type-id>
          <project-id type="integer">13</project-id>
          <type>ValueString</type>
          <poris-value-formatter-id type="integer" nil="true"/>
          <default-string>mycustomfilter</default-string>
          <destinations type="array"/>
          <node-attributes type="array"/>
          <labels type="array"/>
      </poris-value-string>
  
  
      <poris-value-date-range>
        <date-max type="timestamp">2040-12-31 23:59:00 UTC</date-max>
        <date-min type="timestamp">2006-02-01 00:00:00 UTC</date-min>
        <default-date type="timestamp">2011-04-09 00:00:00 UTC</default-date>
        <id type="integer">613</id>
        <name>Date</name>
        <node-type-id type="integer">5</node-type-id>
        <project-id type="integer">17</project-id>
        <type>ValueDateRange</type>
        <poris-value-formatter-id type="integer">6</poris-value-formatter-id>
        <labels type="array"/>
        <node-attributes type="array"/>
        <destinations type="array"/>
      </poris-value-date-range>
  
      <poris-value-file-path>
        <default-string>mypreimagingfile.fits</default-string>
        <file-description>FITS file containing the pre imaging mosaic.</file-description>
        <file-extension>fits</file-extension>
        <id type="integer">628</id>
        <name>PreImagingFile</name>
        <node-type-id type="integer">5</node-type-id>
        <project-id type="integer">17</project-id>
        <type>ValueFilePath</type>
        <poris-value-formatter-id type="integer" nil="true"></poris-value-formatter-id>
        <labels type="array"/>
        <node-attributes type="array"/>
        <destinations type="array"/>
      </poris-value-file-path>
      
  */

  for (const tagName of XMLValueTagNames) {
    let valueElements = xmlDoc.getElementsByTagName(tagName)

    for (const valueElm of valueElements) {
      const basicObj = parseBasicObject(valueElm, referemcedSusbystems)

      let valueFormatterId = getFEText(valueElm, 'value-formatter-id')
      basicObj[valueFormatterId] = valueFormatterId

      const type = basicObj.type

      if (type == VALUE_DOUBLE_RANGE_TYPE) {
        let defaultFloat = getFEText(valueElm, 'default-float')
        let rangemax = getFEText(valueElm, 'rangemax')
        let rangemin = getFEText(valueElm, 'rangemin')

        basicObj['defaultFloat'] = defaultFloat
        basicObj['rangemax'] = rangemax
        basicObj['rangemin'] = rangemin
      } else if (type == VALUE_STRING_TYPE) {
        let defaultString = getFEText(valueElm, 'default-string')

        basicObj['defaultString'] = defaultString
      } else if (type == VALUE_DATE_RANGE_TYPE) {
        let defaultDate = getFEText(valueElm, 'default-date')
        let datemax = getFEText(valueElm, 'date-max')
        let datemin = getFEText(valueElm, 'date-min')

        basicObj['defaultDate'] = defaultDate
        basicObj['datemax'] = datemax
        basicObj['datemin'] = datemin
      } else if (type == VALUE_FILE_PATH_TYPE) {
        let defaultString = getFEText(valueElm, 'default-string')
        let fileDescription = getFEText(valueElm, 'file-description')
        let fileExtension = getFEText(valueElm, 'file-extension')

        basicObj['defaultString'] = defaultString
        basicObj['fileDescription'] = fileDescription
        basicObj['fileExtension'] = fileExtension
      }

      JSONmodel.values.push(new PorisNode(basicObj))
    }
  }

  /*
   <poris-mode>
          <default-mode-id type="integer" nil="true"/>
          <default-value-id type="integer" nil="true"/>
          <id type="integer">2000000007</id>
          <ident>n0::n0::n0::n0::n6</ident>
          <name>Slicer</name>
          <node-type-id type="integer">6</node-type-id>
          <project-id type="integer">13</project-id>
          <type>Mode</type>
          <destinations type="array">
              <destination type="Value">
                  <id type="integer">2000000008</id>
                  <ident>n0::n0::n0::n0::n7</ident>
              </destination>
              <destination type="Mode">
                  <id type="integer">2000000029</id>
                  <ident>n0::n0::n0::n4</ident>
              </destination>
          </destinations>
          <node-attributes type="array"/>
          <labels type="array"/>
      </poris-mode>
      */

  const modeElements = xmlDoc.getElementsByTagName(XMLModeTagName)

  for (const modeElm of modeElements) {
    const basicObj = parseBasicObject(modeElm, referemcedSusbystems)

    let defaultModeId = getFEText(modeElm, 'default-mode-id')
    let defaultValueId = getFEText(modeElm, 'default-value-id')

    basicObj['defaultModeId'] = defaultModeId
    basicObj['defaultValueId'] = defaultValueId

    JSONmodel.modes.push(new PorisNode(basicObj))
  }

  /**
     
      <poris-node>
          <default-mode-id type="integer" nil="true"/>
          <id type="integer">2000000054</id>
          <ident>n0::n0</ident>
          <name>Operator</name>
          <node-type-id type="integer">4</node-type-id>
          <project-id type="integer">13</project-id>
          <type>SubSystem</type>
          <destinations type="array">
              <destination type="Mode">
                  <id type="integer">2000000050</id>
                  <ident>n0::n0::n1</ident>
              </destination>
              <destination type="Mode">
                  <id type="integer">2000000051</id>
                  <ident>n0::n0::n2</ident>
              </destination>
              <destination type="SubSystem">
                  <id type="integer">2000000055</id>
                  <ident>n0::n0::n0</ident>
              </destination>
              <destination type="Mode">
                  <id type="integer">-3</id>
                  <ident>ENG-3</ident>
              </destination>
          </destinations>
          <node-attributes type="array"/>
          <labels type="array"/>
      </poris-node>
     */

  const subsystemsElements = xmlDoc.getElementsByTagName(XMLSystemTagName)

  for (const subsElm of subsystemsElements) {
    const basicObj = parseBasicObject(subsElm, referemcedSusbystems)

    let defaultModeId = getFEText(subsElm, 'default-mode-id')

    basicObj['defaultModeId'] = defaultModeId

    JSONmodel.subsystems.push(new PorisNode(basicObj))
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
