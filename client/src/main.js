import './assets/main.css'

import { createApp } from 'vue'
import urql from '@urql/vue'
import App from './App.vue'
import router from './router'
import { client } from './urql'

const app = createApp(App)

app.use(router)
// M5: gör GraphQL-klienten tillgänglig för useQuery() i alla vyer
app.use(urql, client)

app.mount('#app')
