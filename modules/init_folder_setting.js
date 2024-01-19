const { app } = require('electron')
const fs = require('fs')
const path = require('path')
const { getRootPath } = require('./utils.js')


let STORE_PATH = app.getPath('userData')
if (!fs.existsSync(STORE_PATH)) {
  fs.mkdirSync(STORE_PATH)
}
let rootPath = getRootPath()
try {
  let dataPath = path.join(rootPath, 'data')
  fs.accessSync(dataPath)
  STORE_PATH = dataPath
} catch {
  try {
    fs.accessSync(path.join(rootPath, 'portable'))
    STORE_PATH = rootPath
  } catch {
    STORE_PATH = app.getPath('userData')
  }
}

const TEMP_PATH = path.join(STORE_PATH, 'tmp')
const COVER_PATH = path.join(STORE_PATH, 'cover')
const VIEWER_PATH = path.join(STORE_PATH, 'viewer')

const preparePath = () => {
  fs.mkdirSync(TEMP_PATH, { recursive: true })
  fs.mkdirSync(COVER_PATH, { recursive: true })
  fs.mkdirSync(VIEWER_PATH, { recursive: true })
}

const prepareSetting = () => {
  let setting
  try {
    setting = JSON.parse(fs.readFileSync(path.join(STORE_PATH, 'setting.json'), { encoding: 'utf-8' }))
  } catch {
    setting = {
      proxy: undefined,
      library: app.getPath('downloads'),
      metadataPath: undefined,
      imageExplorer: '\"C:\\Windows\\explorer.exe\"',
      pageSize: 10,
      loadOnStart: false,
      igneous: '',
      ipb_pass_hash: '',
      ipb_member_id: '',
      star: '',
      showComment: true,
      requireGap: 10000,
      thumbnailColumn: 10,
      showTranslation: false,
      theme: 'dark',
      widthLimit: undefined,
      directEnter: 'detail',
      language: 'default',
      folderTreeWidth: '',
      advancedSearch: true,
      autoCheckUpdates: false,
      customOptions: '',
      defaultExpandTree: true,
      hidePageNumber: false,
      skipDeleteConfirm: false,
      displayTitle: 'japaneseTitle',
      keepReadingProgress: true,
    }
    fs.writeFileSync(path.join(STORE_PATH, 'setting.json'), JSON.stringify(setting, null, '  '), { encoding: 'utf-8' })
  }
  return setting
}

module.exports = {
  STORE_PATH,
  TEMP_PATH,
  COVER_PATH,
  VIEWER_PATH,
  prepareSetting,
  preparePath
}