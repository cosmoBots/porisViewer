import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import ConfigPanelView from './views/ConfigPanelView.vue'

export function createPorisViewerPanel(modelPath, mountPoint) {
  let rootProps = { modelPath }

  const app = createApp(ConfigPanelView, rootProps)

  app.use(createPinia())

  app.mount(mountPoint)
}
