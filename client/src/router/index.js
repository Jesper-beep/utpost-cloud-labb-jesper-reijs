import { createRouter, createWebHistory } from 'vue-router'
import GuidesView from '../views/GuidesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/guider', name: 'guides', component: GuidesView },
    {
      path: '/guider/:slug',
      name: 'guide',
      component: () => import('../views/GuideDetailView.vue'),
    },
    { path: '/turer', name: 'tours', component: () => import('../views/ToursView.vue') },
    {
      path: '/turer/:id',
      name: 'tour',
      component: () => import('../views/TourDetailView.vue'),
    },
  ],
})

export default router
