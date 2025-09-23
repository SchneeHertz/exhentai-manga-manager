import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    port: 5374
  },
  optimizeDeps: {
    include: ["@hymbz/comic-read-script"]
  }
})
