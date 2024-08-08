import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import _ from 'lodash'
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ContextMenu from '@imengyu/vue3-context-menu'

import { createI18n } from 'vue-i18n'
import zhCn from './locales/zh-CN.json'
import zhTw from './locales/zh-TW.json'
import enUs from './locales/en-US.json'
const messages = {
  'zh-CN': zhCn,
  'zh-TW': zhTw,
  'en-US': enUs
}

const app = createApp(App)

window._ = _

app.use(ElementPlus)
app.use(ContextMenu)
app.use(createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  globalInjection: true,
  legacy: false,
  messages
}))

app.directive('lazy', {
  mounted(el, binding) {
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          binding.value(binding.arg)
          observer.unobserve(el)
        }
      })
    })
    observer.observe(el)
  }
})

app.mount('#app')