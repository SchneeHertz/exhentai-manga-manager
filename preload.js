const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ipcRenderer', {
  'load-doujinshi-list': (scan)=>ipcRenderer.invoke('load-doujinshi-list', scan),
  'open-local-book': (filepath)=>ipcRenderer.invoke('open-local-book', filepath),
  'delete-local-book': (filepath)=>ipcRenderer.invoke('delete-local-book', filepath),
  'get-cover-hash': (filepath)=>ipcRenderer.invoke('get-cover-hash', filepath),
  'save-book-list': (list)=>ipcRenderer.invoke('save-book-list', list),
  'load-setting': ()=>ipcRenderer.invoke('load-setting'),
  'save-setting': (receiveSetting)=>ipcRenderer.invoke('save-setting', receiveSetting),
  'select-folder': ()=>ipcRenderer.invoke('select-folder'),
  'select-file': ()=>ipcRenderer.invoke('select-file'),
  'force-gene-book-list': ()=>ipcRenderer.invoke('force-gene-book-list'),
  'send-message': (func)=>ipcRenderer.on('send-message', func),
  'get-ex-url': (obj)=>ipcRenderer.invoke('get-ex-url', obj),
  'export-database': ()=>ipcRenderer.invoke('export-database'),
  'load-import-database': ()=>ipcRenderer.invoke('load-import-database'),
  'open-url': (url)=>ipcRenderer.invoke('open-url', url),
  'load-manga-image-list': (filepath)=>ipcRenderer.invoke('load-manga-image-list', filepath),
  'show-file': (filepath)=>ipcRenderer.invoke('show-file', filepath)
})