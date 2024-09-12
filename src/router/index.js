import { createRouter, createWebHistory } from 'vue-router'
import ConfigPanelView from '../views/ConfigPanelView.vue'

let remoteModel = false
//let formpath = "./csys_poris/prj-ident/form?issue_id=12345&key=12345"
try {
  formpath;
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
