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

// 创建一个共享的 IntersectionObserver 实例
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target
      const callback = el._lazyCallback
      const arg = el._lazyArg

      if (callback && typeof callback === 'function') {
        callback(arg)
      }
      observer.unobserve(el)
    }
  })
})

app.directive('lazy', {
  mounted(el, binding) {
    // 将回调和参数存储在元素上，以便在观察者中访问
    el._lazyCallback = binding.value
    el._lazyArg = binding.arg

    // 添加元素到 IntersectionObserver 中
    observer.observe(el)
  },
  unmounted(el) {
    // 取消观察元素并清理
    observer.unobserve(el)
    delete el._lazyCallback
    delete el._lazyArg
  }
})


app.mount('#app')