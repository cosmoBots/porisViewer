import { createApp } from 'vue'
import { createPinia } from 'pinia'

import ConfigPanelView from './views/ConfigPanelView.vue'
import { setDebug } from './utils/debug'

export function createPorisViewerPanel(modelPath, mountPoint, options = {}) {
  const { debug = false, compact = false, commitUrl = '', csrfToken = '', initialState = [], onCommit } = options

  setDebug(debug)

  let rootProps = { modelPath, compact, commitUrl, csrfToken, initialState, onCommitted: onCommit }

  const app = createApp(ConfigPanelView, rootProps)

  app.use(createPinia())

  app.mount(mountPoint)
  return app
}
