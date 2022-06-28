const { contextBridge, ipcRenderer, clipboard, nativeImage } = require('electron')

contextBridge.exposeInMainWorld('ipcRenderer', {
  'load-book-list': (scan)=>ipcRenderer.invoke('load-book-list', scan),
  'open-local-book': (filepath)=>ipcRenderer.invoke('open-local-book', filepath),
  'delete-local-book': (filepath)=>ipcRenderer.invoke('delete-local-book', filepath),
  // 'get-cover-hash': (filepath)=>ipcRenderer.invoke('get-cover-hash', filepath),
  'save-book-list': (list)=>ipcRenderer.invoke('save-book-list', list),
  'load-setting': ()=>ipcRenderer.invoke('load-setting'),
  'save-setting': (receiveSetting)=>ipcRenderer.invoke('save-setting', receiveSetting),
  'select-folder': ()=>ipcRenderer.invoke('select-folder'),
  'select-file': ()=>ipcRenderer.invoke('select-file'),
  'force-gene-book-list': ()=>ipcRenderer.invoke('force-gene-book-list'),
  'send-message': (func)=>ipcRenderer.on('send-message', func),
  'export-database': ()=>ipcRenderer.invoke('export-database'),
  'load-import-database': ()=>ipcRenderer.invoke('load-import-database'),
  'open-url': (url)=>ipcRenderer.invoke('open-url', url),
  'load-manga-image-list': (book)=>ipcRenderer.invoke('load-manga-image-list', book),
  'show-file': (filepath)=>ipcRenderer.invoke('show-file', filepath),
  'get-ex-webpage': (obj)=>ipcRenderer.invoke('get-ex-webpage', obj),
  'load-collection-list': ()=>ipcRenderer.invoke('load-collection-list'),
  'save-collection-list': (list)=>ipcRenderer.invoke('save-collection-list', list),
})

contextBridge.exposeInMainWorld('electronFunction', {
  'copy-image-to-clipboard': (filepath)=>clipboard.writeImage(nativeImage.createFromPath(filepath))
})