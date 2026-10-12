import { createApp } from 'vue'
import { createPinia } from 'pinia'

import ConfigPanelView from './views/ConfigPanelView.vue'
import { setDebug } from './utils/debug'

export function createPorisViewerPanel(modelPath, mountPoint, options = {}) {
  const { debug = false, compact = false } = options

  setDebug(debug)

  let rootProps = { modelPath, compact }

  const app = createApp(ConfigPanelView, rootProps)

  app.use(createPinia())

  app.mount(mountPoint)
  return app
}
