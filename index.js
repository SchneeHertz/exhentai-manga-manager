const { app, BrowserWindow, ipcMain, session, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const process = require('process')
const { brotliCompress, brotliDecompress } = require('zlib')
const { promisify } = require('util')
const _ = require('lodash')
const { nanoid } = require('nanoid')
const sharp = require('sharp')
const { spawn } = require('child_process')
const { createHash } = require('crypto')
const superagent = require('superagent')
require('superagent-proxy')(superagent)

const {getFolderlist, solveBookTypeFolder, getImageListFromFolder} = require('./fileLoader/folder')
const {getArchivelist, solveBookTypeArchive, getImageListFromArchive} = require('./fileLoader/archive')

let STORE_PATH = app.getPath('userData')
if (!fs.existsSync(STORE_PATH)) {
  fs.mkdirSync(STORE_PATH)
}

try {
  fs.accessSync(path.join(process.cwd(), 'portable'))
  STORE_PATH = process.cwd()
} catch {
  STORE_PATH = app.getPath('userData')
}

const TEMP_PATH = path.join(STORE_PATH, 'tmp')
const COVER_PATH = path.join(STORE_PATH, 'cover')
const VIEWER_PATH = path.join(STORE_PATH, 'viewer')

fs.mkdir(TEMP_PATH, {recursive: true}, (err) => {
  if (err) throw err
})
fs.mkdir(COVER_PATH, {recursive: true}, (err)=>{
  if (err) throw err
})
fs.mkdir(VIEWER_PATH, {recursive: true}, (err)=>{
  if (err) throw err
})

let setting
try {
  setting = JSON.parse(fs.readFileSync(path.join(STORE_PATH, 'setting.json'), {encoding: 'utf-8'}))
} catch {
  setting = {
    proxy: undefined,
    library: app.getPath('downloads'),
    imageExplorer: 'C:\\Windows\\explorer.exe',
    pageSize: 10,
    loadOnStart: false,
    requireGap: 10000,
    thumbnailColumn: 10
  }
  fs.writeFileSync(path.join(STORE_PATH, 'setting.json'), JSON.stringify(setting, null, '  '), {encoding: 'utf-8'})
}


let mainWindow
function createWindow () {
  const win = new BrowserWindow({
    width: 1560,
    height: 1000,
    webPreferences: {
      webSecurity: app.isPackaged ? true : false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  })

  if (app.isPackaged) {
    win.loadFile('dist/index.html')
  } else {
    win.loadURL('http://localhost:3000')
  }
  win.setMenuBarVisibility(false)
  win.webContents.on('did-finish-load', ()=>{
    let name = "EH漫画管理"
    let version = require('./package.json').version
    win.setTitle(name + " " + version)
  })
  win.once('ready-to-show', () => {
    win.show()
  })
  return win
}
app.disableHardwareAcceleration()
app.whenReady().then(()=>{
  mainWindow = createWindow()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow()
  }
})

app.on('ready', async () => {
  if (!app.isPackaged) {
    // await session.defaultSession.loadExtension(path.resolve(__dirname,'./6.0.12_0'))
  }
  if (setting.proxy) {
    await session.defaultSession.setProxy({
      mode: 'fixed_servers',
      proxyRules: setting.proxy
    })
  }
})



let loadBookListFromBrFile = async ()=>{
  try {
    let buffer = await fs.promises.readFile(path.join(STORE_PATH, 'bookList.json.br'))
    let decodeBuffer = await promisify(brotliDecompress)(buffer)
    fs.promises.writeFile(path.join(STORE_PATH, 'bookList.json'), decodeBuffer.toString(), {encoding: 'utf-8'})
    return JSON.parse(decodeBuffer.toString())
  } catch {
    return JSON.parse(await fs.promises.readFile(path.join(STORE_PATH, 'bookList.json'), {encoding: 'utf-8'}))
  }
}

let saveBookListToBrFile = async (data)=>{
  let buffer = await promisify(brotliCompress)(JSON.stringify(data))
  return await fs.promises.writeFile(path.join(STORE_PATH, 'bookList.json.br'), buffer)
}


let getBookFilelist = async ()=>{
  //fileLoader: get fileList
  let folderList = await getFolderlist(setting.library)
  let archiveList = await getArchivelist(setting.library)
  return [
    ...folderList.map(filepath=>({filepath, type: 'folder'})),
    ...archiveList.map(filepath=>({filepath, type: 'archive'})),
  ]
}

let geneCover = async (filepath, type) => {
  let targetFilePath, coverPath, tempCoverPath
  //fileLoader: get targetFile for hash, get tempCover for cover
  switch (type){
    case 'folder':
      ;({targetFilePath, coverPath, tempCoverPath} = await solveBookTypeFolder(filepath, TEMP_PATH, COVER_PATH))
      break
    case 'archive':
      ;({targetFilePath, coverPath, tempCoverPath} = await solveBookTypeArchive(filepath, TEMP_PATH, COVER_PATH))
      break
  }

  let imageResizeResult = await sharp(tempCoverPath)
  .resize(500, 720, {
    fit: 'contain'
  })
  .toFile(coverPath)
  .catch((e)=>{
    console.log(filepath, e)
    mainWindow.webContents.send('send-message', `get ${filepath} failed because ${e}`)
    fs.promises.rm(tempCoverPath, {recursive: true})
    return false
  })
  if (imageResizeResult){
    return {targetFilePath, coverPath}
  } else {
    return {targetFilePath:undefined, coverPath:undefined}
  }

}

ipcMain.handle('load-book-list', async (event, scan)=>{
  if (scan) {

    let existData
    try {
      existData = await loadBookListFromBrFile()
      _.forIn(existData, book=>{
        if (!book.hash && !book.url) {
          try {
            book.hash = createHash('sha1').update(fs.readFileSync(book.tempCoverPath)).digest('hex')
          } catch {
            book.filepath = undefined
          }
        }
      })
    } catch {
      existData = []
    }

    let list = await getBookFilelist()

    for (let i = 0; i < list.length; i++) {
      try {
        let {filepath, type} = list[i]
        let foundData = _.find(existData, {filepath: filepath})
        if (!foundData) {
          let id = nanoid()
          let {targetFilePath, coverPath} = await geneCover(filepath, type)
          if (targetFilePath && coverPath){
            let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
            existData.push({
              title: path.basename(filepath),
              coverPath,
              hash,
              filepath,
              type,
              id,
              status: 'non-tag',
              exist: true,
              date: Date.now()
            })
            mainWindow.webContents.send('send-message', `load ${i+1} of ${list.length}`)
          }
        } else {
          foundData.exist = true
          foundData.coverPath = path.join(COVER_PATH, path.basename(foundData.coverPath))
        }
        if ((i+1) % 100 == 0) mainWindow.webContents.send('send-message', `load ${i+1} of ${list.length}`)
      } catch (e) {
        console.log(e)
        mainWindow.webContents.send('send-message', `load ${list[i].filepath} failed because ${e}`)
      }
    }
    await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
    await fs.promises.mkdir(TEMP_PATH, {recursive: true})

    existData = _.filter(existData, {exist: true})
    _.forIn(existData, b=>b.exist = undefined)
    await saveBookListToBrFile(existData)
    return existData
  } else {
    return await loadBookListFromBrFile()
  }
})


ipcMain.handle('force-gene-book-list', async (event, ...arg)=>{
  await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
  await fs.promises.mkdir(TEMP_PATH, {recursive: true})
  await fs.promises.rm(COVER_PATH, {recursive: true, force: true})
  await fs.promises.mkdir(COVER_PATH, {recursive: true})
  let list = await getBookFilelist()
  let data = []
  for (let i = 0; i < list.length; i++) {
    try {
      let {filepath, type} = list[i]
      let id = nanoid()
      let {targetFilePath, coverPath} = await geneCover(filepath, type)
      if (targetFilePath && coverPath){
        let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
        data.push({
          title: path.basename(filepath),
          coverPath,
          hash,
          filepath,
          type,
          id,
          status: 'non-tag',
          date: Date.now()
        })
      }
      mainWindow.webContents.send('send-message', `load ${i+1} of ${list.length}`)
    } catch (e) {
      console.log(e)
      mainWindow.webContents.send('send-message', `load ${list[i].filepath} failed because ${e}`)
    }
  }
  await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
  await fs.promises.mkdir(TEMP_PATH, {recursive: true})

  await saveBookListToBrFile(data)
  return data
})


ipcMain.handle('load-manga-image-list', async(event, book)=>{
  await fs.promises.rm(VIEWER_PATH, {recursive: true, force: true})
  await fs.promises.mkdir(VIEWER_PATH, {recursive: true})
  let {filepath, type} = book

  let list
  //fileLoader: get imageList from file
  switch (type) {
    case 'folder':
      list = await getImageListFromFolder(filepath, VIEWER_PATH)
      break
    case 'zip':
    case 'archive':
      list = await getImageListFromArchive(filepath, VIEWER_PATH)
      break
    default:
      list = await getImageListFromArchive(filepath, VIEWER_PATH)
      break
  }

  let result = []
  for (let filepath of list) {
    let metadata = await sharp(filepath).metadata()
    result.push({
      id: nanoid(),
      filepath,
      width: metadata.width,
      height: metadata.height
    })
  }
  return result
})





ipcMain.handle('open-local-book', async (event, filepath)=>{
  spawn(setting.imageExplorer, [filepath])
})

ipcMain.handle('delete-local-book', async (event, filepath)=>{
  return shell.trashItem(filepath)
})

ipcMain.handle('get-ex-webpage', async (event, {url, cookie})=>{
  if (setting.proxy) {
    return await superagent
    .get(url)
    .set('Cookie', cookie)
    .proxy(setting.proxy)
    .then(res=>{
      return res.text
    })
    .catch(e=>{
      console.log(e)
      mainWindow.webContents.send('send-message', `get ex comments failed because ${e}`)
    })
  } else {
    return await superagent
    .get(url)
    .set('Cookie', cookie)
    .then(res=>{
      return res.text
    })
    .catch(e=>{
      console.log(e)
      mainWindow.webContents.send('send-message', `get ex comments failed because ${e}`)
    })
  }
})

// ipcMain.handle('get-cover-hash', async (event, filepath)=>{
//   return createHash('sha1').update(fs.readFileSync(filepath)).digest('hex')
// })

ipcMain.handle('save-book-list', async (event, list)=>{
  return await saveBookListToBrFile(list)
})

ipcMain.handle('select-folder', async (event, type)=>{
  let result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (!result.canceled) {
    return result.filePaths[0]
  } else {
    return undefined
  }
})

ipcMain.handle('select-file', async (event, type)=>{
  let result = await dialog.showOpenDialog({
    properties: ['openFile']
  })
  if (!result.canceled) {
    return result.filePaths[0]
  } else {
    return undefined
  }
})

ipcMain.handle('load-setting', async (event, arg)=>{
  return JSON.parse(fs.readFileSync(path.join(STORE_PATH, 'setting.json'), {encoding: 'utf-8'}))
})

ipcMain.handle('save-setting', async (event, receiveSetting)=>{
  setting = receiveSetting
  if (setting.proxy) {
    await session.defaultSession.setProxy({
      mode: 'fixed_servers',
      proxyRules: setting.proxy
    })
  }
  return await fs.promises.writeFile(path.join(STORE_PATH, 'setting.json'), JSON.stringify(setting, null, '  '), {encoding: 'utf-8'})
})

ipcMain.handle('export-database', async (event, arg)=>{
  let bookList = await loadBookListFromBrFile()
  let database = bookList.map(book=>{
    try {
      if (!book.hash) {
        book.hash = createHash('sha1').update(fs.readFileSync(book.tempCoverPath)).digest('hex')
      }
      return _.pick(book, ['hash', 'tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category', 'url'])
    } catch {
      return {}
    }
  })
  return database
})

ipcMain.handle('load-import-database', async (event, arg)=>{
  let result = await dialog.showOpenDialog({
    properties: ['openFile']
  })
  if (!result.canceled) {
    return JSON.parse(fs.readFileSync(result.filePaths[0], {encoding: 'utf-8'}))
  } else {
    return []
  }
})

ipcMain.handle('open-url', async(event, url)=>{
  shell.openExternal(url)
})

ipcMain.handle('show-file', async (event, filepath)=>{
  shell.showItemInFolder(filepath)
})

ipcMain.handle('load-collection-list', async (event, arg)=>{
  let list
  try {
    list = JSON.parse(fs.readFileSync(path.join(STORE_PATH, 'collectionList.json'), {encoding: 'utf-8'}))
  } catch (e) {
    console.log(e)
    list = []
  }
  return list
})

ipcMain.handle('save-collection-list', async (event, list)=>{
  return await fs.promises.writeFile(path.join(STORE_PATH, 'collectionList.json'), JSON.stringify(list, null, '  '), {encoding: 'utf-8'})
})


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

process.on('exit', () => {
  app.quit()
})