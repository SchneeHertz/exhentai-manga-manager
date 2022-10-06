import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import _ from 'lodash'
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ContextMenu from '@imengyu/vue3-context-menu'

import { createI18n } from 'vue-i18n'
import zhCn from './locales/zh-CN.json'
import enUs from './locales/en-US.json'
const messages = {
  'zh-CN': zhCn,
  'en-US': enUs
}

const app = createApp(App)

window._ = _

app.use(ElementPlus)
app.use(ContextMenu)
app.use(createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages
}))
app.mount('#app')