const { app } = require('electron')
const path = require('node:path')

const getRootPath = () => {
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'))
  } else {
    return app.getAppPath()
  }
}

module.exports = {
  getRootPath
}