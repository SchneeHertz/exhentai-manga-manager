import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import _ from 'lodash'

const app = createApp(App)

window._ = _

app.use(ElementPlus)
app.mount('#app')