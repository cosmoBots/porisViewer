import { createRouter, createWebHistory } from 'vue-router'
import ConfigPanelView from '../views/ConfigPanelView.vue'

let remoteModel = false
//let thiskey = "1234"
try {
  thiskey;
  remoteModel = true
} catch (error) {
  /* Do nothing */
}

let router = null

if (!remoteModel)
{
  router = createRouter({
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
}
else
{
  router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: '/',
        name: 'config',
        component: ConfigPanelView
      }
    ]
  })
}
export default router
