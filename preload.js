const { contextBridge, ipcRenderer, clipboard, nativeImage } = require('electron')

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, listener)
})

contextBridge.exposeInMainWorld('electronFunction', {
  'copy-image-to-clipboard': (filepath)=>clipboard.writeImage(nativeImage.createFromPath(filepath)),
  'copy-text-to-clipboard': (text)=>clipboard.writeText(text),
  'read-text-from-clipboard': ()=>clipboard.readText()
})