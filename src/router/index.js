import { createRouter, createWebHistory } from 'vue-router'
import ConfigPanelView from '../views/ConfigPanelView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'config',
      component: ConfigPanelView
    },
    {
      path: '/xml',
      name: 'xml',
      component: () => import('../views/ModelXMLView.vue')
    }
  ]
})

export default router
