const { contextBridge, ipcRenderer, webFrame } = require('electron')

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, listener)
})

contextBridge.exposeInMainWorld('electronFunction', {
  'get-zoom-level': ()=>webFrame.getZoomLevel(),
  'set-zoom-level': (level)=>webFrame.setZoomLevel(level)
})