const { app, ipcRenderer } = require('electron')
const path = require('node:path')

const getRootPath = () => {
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'))
  } else {
    return app.getAppPath()
  }
}

async function naturalSort(files) {
  try {
    return await ipcRenderer.invoke('natural-sort', files)
  } catch (error) {
    return files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  }
}

module.exports = {
  getRootPath,
  naturalSort
}