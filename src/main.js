import { createApp } from 'vue'
import { createPinia } from 'pinia'
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

const pinia = createPinia()
app.use(pinia)

app.use(ElementPlus)
app.use(ContextMenu)
app.use(createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  globalInjection: true,
  legacy: false,
  messages
}))

// 创建一个共享的 IntersectionObserver 实例
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const el = entry.target
    const enterCallback = el._lazyEnterCallback
    const leaveCallback = el._lazyLeaveCallback
    const arg = el._lazyArg

    if (entry.isIntersecting) {
      if (enterCallback && typeof enterCallback === 'function') {
        enterCallback(arg)
      }
    } else {
      if (leaveCallback && typeof leaveCallback === 'function') {
        leaveCallback(arg)
      }
    }
  })
}, {
  rootMargin: '2560px'
})

app.directive('lazy', {
  mounted(el, binding) {
    el._lazyEnterCallback = binding.value.enter
    el._lazyLeaveCallback = binding.value.leave
    el._lazyArg = binding.arg

    observer.observe(el)
  },
  unmounted(el) {
    observer.unobserve(el)
    delete el._lazyEnterCallback
    delete el._lazyLeaveCallback
    delete el._lazyArg
  }
})


app.mount('#app')