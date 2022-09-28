const { app, BrowserWindow, ipcMain, session, dialog, shell, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const process = require('process')
const { brotliCompress, brotliDecompress } = require('zlib')
const { promisify, format } = require('util')
const _ = require('lodash')
const { nanoid } = require('nanoid')
const sharp = require('sharp')
const { spawn } = require('child_process')
const { createHash } = require('crypto')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const superagent = require('superagent')
require('superagent-proxy')(superagent)

const {getFolderlist, solveBookTypeFolder, getImageListFromFolder} = require('./fileLoader/folder')
const {getArchivelist, solveBookTypeArchive, getImageListFromArchive} = require('./fileLoader/archive')
const {getZipFilelist, solveBookTypeZip} = require('./fileLoader/zip')

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
    thumbnailColumn: 10,
    showTranslation: false,
    widthLimit: undefined,
    directEnter: false,
    language: 'default'
  }
  fs.writeFileSync(path.join(STORE_PATH, 'setting.json'), JSON.stringify(setting, null, '  '), {encoding: 'utf-8'})
}

let logFile = fs.createWriteStream(path.join(STORE_PATH, 'log.txt'), {flags: 'w'})
let logStdout = process.stdout

console.log = (message)=>{
  logFile.write(format(message) + '\n')
  logStdout.write(format(message) + '\n')
}

let sendMessageToWebContents = (message)=>{
  console.log(message)
  mainWindow.webContents.send('send-message', message)
}

let mainWindow
let screenWidth
let sendImageLock = false
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
    let name = require('./package.json').name
    let version = require('./package.json').version
    win.setTitle(name + ' ' + version)
  })
  win.once('ready-to-show', () => {
    win.show()
  })
  return win
}

app.disableHardwareAcceleration()
app.whenReady().then(()=>{
  const primaryDisplay = screen.getPrimaryDisplay()
  screenWidth = primaryDisplay.workAreaSize.width * primaryDisplay.scaleFactor
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

process.on('exit', () => {
  app.quit()
})

// base function
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
  let zipList = await getZipFilelist(setting.library)
  return [
    ...folderList.map(filepath=>({filepath, type: 'folder'})),
    ...archiveList.map(filepath=>({filepath, type: 'archive'})),
    ...zipList.map(filepath=>({filepath, type: 'zip'})),
  ]
}

let geneCover = async (filepath, type)=>{
  let targetFilePath, coverPath, tempCoverPath, pageCount, bundleSize
  //fileLoader: get targetFile for hash, get tempCover for cover
  switch (type){
    case 'folder':
      ;({targetFilePath, coverPath, tempCoverPath, pageCount} = await solveBookTypeFolder(filepath, TEMP_PATH, COVER_PATH))
      break
    case 'zip':
      try {
        ;({targetFilePath, coverPath, tempCoverPath, pageCount, bundleSize} = await solveBookTypeArchive(filepath, TEMP_PATH, COVER_PATH))
      } catch (e) {
        console.log(e)
        console.log(`reload ${filepath} use adm-zip`)
        ;({targetFilePath, coverPath, tempCoverPath, pageCount, bundleSize} = await solveBookTypeZip(filepath, TEMP_PATH, COVER_PATH))
      }
      break
    case 'archive':
      ;({targetFilePath, coverPath, tempCoverPath, pageCount, bundleSize} = await solveBookTypeArchive(filepath, TEMP_PATH, COVER_PATH))
      break
  }

  let coverHash = createHash('sha1').update(fs.readFileSync(tempCoverPath)).digest('hex')
  let imageResizeResult = await sharp(tempCoverPath)
  .resize(500, 707, {
    fit: 'contain'
  })
  .toFile(coverPath)
  .catch((e)=>{
    sendMessageToWebContents(`get ${filepath} failed because ${e}`)
    fs.promises.rm(tempCoverPath, {recursive: true})
    return false
  })
  if (imageResizeResult){
    return {targetFilePath, coverPath, pageCount, bundleSize, coverHash}
  } else {
    return {targetFilePath:undefined, coverPath:undefined}
  }

}


// library and metadata
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

    sendMessageToWebContents('start loading library')
    let list = await getBookFilelist()
    let listLength = list.length
    sendMessageToWebContents(`load ${listLength} book from library`)

    let foundNewBook = false
    for (let i = 0; i < listLength; i++) {
      try {
        let {filepath, type} = list[i]
        let foundData = _.find(existData, {filepath: filepath})
        if (!foundData) {
          sendMessageToWebContents(`load ${filepath}, ${i+1} of ${listLength}`)
          foundNewBook = true
          let id = nanoid()
          let {targetFilePath, coverPath, pageCount, bundleSize, coverHash} = await geneCover(filepath, type)
          if (targetFilePath && coverPath){
            let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
            existData.push({
              title: path.basename(filepath),
              coverPath,
              hash,
              filepath,
              type,
              id,
              pageCount,
              bundleSize,
              coverHash,
              status: 'non-tag',
              exist: true,
              date: Date.now()
            })
            mainWindow.setProgressBar(i/listLength)
          }
        } else {
          foundData.exist = true
          foundData.coverPath = path.join(COVER_PATH, path.basename(foundData.coverPath))
        }
        if ((i+1) % 200 == 0) {
          sendMessageToWebContents(`load ${i+1} of ${listLength}`)
          if (foundNewBook) {
            let tempExistData = _.cloneDeep(existData)
            _.forIn(tempExistData, b=>b.exist = undefined)
            await saveBookListToBrFile(tempExistData)
            foundNewBook = false
          }
        }
      } catch (e) {
        sendMessageToWebContents(`load ${list[i].filepath} failed because ${e}, ${i+1} of ${listLength}`)
      }
    }
    try {
      await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
      await fs.promises.mkdir(TEMP_PATH, {recursive: true})
    } catch (err) {
      console.log(err)
    }

    existData = _.filter(existData, {exist: true})
    _.forIn(existData, b=>b.exist = undefined)
    await saveBookListToBrFile(existData)
    mainWindow.setProgressBar(-1)
    return existData
  } else {
    return await loadBookListFromBrFile()
  }
})

ipcMain.handle('force-gene-book-list', async (event, arg)=>{
  try {
    await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
    await fs.promises.mkdir(TEMP_PATH, {recursive: true})
    await fs.promises.rm(COVER_PATH, {recursive: true, force: true})
    await fs.promises.mkdir(COVER_PATH, {recursive: true})
  } catch (err) {
    console.log(err)
  }
  sendMessageToWebContents('start loading library')
  let list = await getBookFilelist()
  let listLength = list.length
  sendMessageToWebContents(`load ${listLength} book from library`)
  let data = []
  for (let i = 0; i < listLength; i++) {
    try {
      let {filepath, type} = list[i]
      sendMessageToWebContents(`load ${filepath}, ${i+1} of ${listLength}`)
      let id = nanoid()
      let {targetFilePath, coverPath, pageCount, bundleSize, coverHash} = await geneCover(filepath, type)
      if (targetFilePath && coverPath){
        let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
        data.push({
          title: path.basename(filepath),
          coverPath,
          hash,
          filepath,
          type,
          id,
          pageCount,
          bundleSize,
          coverHash,
          status: 'non-tag',
          date: Date.now()
        })
      }
      mainWindow.setProgressBar(i/listLength)
      if ((i+1) % 100 == 0) {
        await saveBookListToBrFile(data)
      }
    } catch (e) {
      sendMessageToWebContents(`load ${list[i].filepath} failed because ${e}, ${i+1} of ${listLength}`)
    }
  }
  try {
    await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
    await fs.promises.mkdir(TEMP_PATH, {recursive: true})
  } catch (err) {
    console.log(err)
  }

  await saveBookListToBrFile(data)
  mainWindow.setProgressBar(-1)
  return data
})

ipcMain.handle('patch-local-metadata', async(event, arg)=>{
  let bookList = await loadBookListFromBrFile()
  let bookListLength = bookList.length
  try {
    await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
    await fs.promises.mkdir(TEMP_PATH, {recursive: true})
    await fs.promises.rm(COVER_PATH, {recursive: true, force: true})
    await fs.promises.mkdir(COVER_PATH, {recursive: true})
  } catch (err) {
    console.log(err)
  }

  for (let i = 0; i < bookListLength; i++) {
    try {
      let book = bookList[i]
      let {filepath, type} = book
      if (!type) type = 'archive'
      let {targetFilePath, coverPath, pageCount, bundleSize, coverHash} = await geneCover(filepath, type)
      if (targetFilePath && coverPath){
        let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
        _.assign(book, {type, coverPath, hash, pageCount, bundleSize, coverHash})
        sendMessageToWebContents(`patch ${filepath}, ${i+1} of ${bookListLength}`)
        mainWindow.setProgressBar(i/bookListLength)
      }
    } catch (e) {
      sendMessageToWebContents(`patch ${book.filepath} failed because ${e}`)
    }
  }

  try {
    await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
    await fs.promises.mkdir(TEMP_PATH, {recursive: true})
  } catch (err) {
    console.log(err)
  }

  await saveBookListToBrFile(bookList)
  mainWindow.setProgressBar(-1)
  return bookList
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
      sendMessageToWebContents(`get ex comments failed because ${e}`)
    })
  } else {
    return await superagent
    .get(url)
    .set('Cookie', cookie)
    .then(res=>{
      return res.text
    })
    .catch(e=>{
      sendMessageToWebContents(`get ex comments failed because ${e}`)
    })
  }
})

ipcMain.handle('save-book-list', async (event, list)=>{
  return await saveBookListToBrFile(list)
})

// home
ipcMain.handle('get-folder-tree', async(event, bookList)=>{
  let folderList = _.uniq(bookList.map(b=>path.dirname(b.filepath)))
  folderList.sort()
  let librarySplitPaths = setting.library.split(path.sep)
  librarySplitPaths.pop()
  let bookPathSplitList = folderList.map(fp=>fp.split(path.sep).filter(p=>!librarySplitPaths.includes(p)))
  let treeData = []
  let addToTree = (treeLevel, parent, parentPath, child, childPath, rootLevel)=>{
    rootLevel ??= treeLevel
    if (_.isEmpty(rootLevel)) {
      rootLevel.push({label: parent, folderPath: parentPath, children: [{label: child, folderPath: childPath, children: []}]})
      return true
    }
    let foundParent = _.find(treeLevel, {label: parent})
    if (foundParent) {
      let foundChild = _.find(foundParent.children, {label: child})
      if (!foundChild) {
        foundParent.children.push({label: child, folderPath: childPath, children: []})
      }
      return true
    } else {
      if (!_.isEmpty(treeLevel)) {
        let results = treeLevel.map(node=>addToTree(node.children, parent, parentPath, child, childPath, rootLevel))
        if (_.isEmpty(_.compact(results)) && treeLevel == rootLevel) {
          rootLevel.push({label: parent, folderPath: parentPath, children: [{label: child, folderPath: childPath, children: []}]})
          return true
        } else {
          return !_.isEmpty(_.compact(results))
        }
      } else {
        return false
      }
    }
  }
  _.forIn(bookPathSplitList, bookPath=>{
    let length = bookPath.length
    for (let i = 0; i < length-1; i++) {
      addToTree(treeData, bookPath[i], path.join(...bookPath.slice(1, i+1)), bookPath[i+1], path.join(...bookPath.slice(1, i+2)))
    }
  })
  return treeData
})

ipcMain.handle('load-collection-list', async (event, arg)=>{
  let list
  try {
    list = JSON.parse(fs.readFileSync(path.join(STORE_PATH, 'collectionList.json'), {encoding: 'utf-8'}))
  } catch (err) {
    console.log(err)
    list = []
  }
  return list
})

ipcMain.handle('save-collection-list', async (event, list)=>{
  return await fs.promises.writeFile(path.join(STORE_PATH, 'collectionList.json'), JSON.stringify(list, null, '  '), {encoding: 'utf-8'})
})

// detail
ipcMain.handle('open-url', async(event, url)=>{
  shell.openExternal(url)
})

ipcMain.handle('show-file', async (event, filepath)=>{
  shell.showItemInFolder(filepath)
})

ipcMain.handle('use-new-cover', async(event, filepath)=>{
  let coverPath = path.join(COVER_PATH, nanoid() + path.extname(filepath))
  let imageResizeResult = await sharp(filepath)
  .resize(500, 707, {
    fit: 'contain'
  })
  .toFile(coverPath)
  .catch((e)=>{
    sendMessageToWebContents(`generate cover from ${filepath} failed because ${e}`)
    return false
  })
  if (imageResizeResult) {
    return coverPath
  }
})

ipcMain.handle('open-local-book', async (event, filepath)=>{
  spawn(setting.imageExplorer, [filepath])
})

ipcMain.handle('delete-local-book', async (event, filepath)=>{
  return shell.trashItem(filepath)
})

// viewer
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

  sendImageLock = true
  ;(async ()=>{
    // 384 is the default 4K screen width divided by the default number of thumbnail columns
    let thumbnailWidth = _.isFinite(screenWidth / setting.thumbnailColumn) ? Math.floor(screenWidth / setting.thumbnailColumn) : 384
    let widthLimit = setting.widthLimit || screenWidth
    for (let index = 1; index <= list.length; index++) {
      if (sendImageLock) {
        let filepath = list[index-1]
        if (filepath.search(/[%#]/) >= 0) {
          let newFilepath = path.join(VIEWER_PATH, `rename_${nanoid(6)}_${path.basename(filepath).replace(/[%#]/, '_')}`)
          await fs.promises.copyFile(filepath, newFilepath)
          filepath = newFilepath
        }
        let {width, height} = await sharp(filepath).metadata()
        let resizedFilepath = path.join(VIEWER_PATH, `resized_${nanoid(6)}_${path.basename(filepath)}`)
        if (width > widthLimit) {
          await sharp(filepath)
            .resize({width: widthLimit})
            .toFile(resizedFilepath)
          filepath = resizedFilepath
        }
        let thumbnailPath = path.join(VIEWER_PATH, `thumb_${nanoid(6)}_${path.basename(filepath)}`)
        await sharp(filepath)
          .resize({width: thumbnailWidth})
          .toFile(thumbnailPath)
        mainWindow.webContents.send('manga-content', {
          id: nanoid(),
          index,
          filepath,
          thumbnailPath,
          width, height
        })
      }
    }
  })()

  return list
})

ipcMain.handle('release-sendimagelock', ()=>{
  sendImageLock = false
})


// setting
ipcMain.handle('select-folder', async (event, type)=>{
  let result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (!result.canceled) {
    return result.filePaths[0]
  } else {
    return undefined
  }
})

ipcMain.handle('select-file', async (event, type)=>{
  let result = await dialog.showOpenDialog(mainWindow, {
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
  let collectionList = []
  try {
    collectionList = JSON.parse(await fs.promises.readFile(path.join(STORE_PATH, 'collectionList.json'), {encoding: 'utf-8'}))
  } catch (err) {
    console.log(err)
  }
  _.forIn(collectionList, collection=>{
    _.forIn(collection.list, id=>{
      let foundBook = _.find(bookList, {id})
      if (foundBook) {
        foundBook.collectionInfo = {
          id: collection.id,
          title: collection.title
        }
      }
    })
  })
  let database = bookList.map(book=>{
    try {
      if (!book.hash) {
        book.hash = createHash('sha1').update(fs.readFileSync(book.tempCoverPath)).digest('hex')
      }
      return _.pick(book, ['hash', 'tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category', 'url', 'collectionInfo'])
    } catch {
      return {}
    }
  })
  return database
})

ipcMain.handle('load-import-database', async (event, arg)=>{
  let result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  })
  if (!result.canceled) {
    return JSON.parse(fs.readFileSync(result.filePaths[0], {encoding: 'utf-8'}))
  } else {
    return []
  }
})

ipcMain.handle('import-sqlite', async(event, bookList)=>{
  let result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  })
  if (!result.canceled) {
    const db = await open({
      filename: result.filePaths[0],
      driver: sqlite3.Database
    })
    try {
      let re = /'/g
      let bookListLength = bookList.length
      for (let i = 0; i < bookListLength; i++) {
        let book = bookList[i]
        let metadata = await db.get('SELECT * FROM gallery WHERE thumb LIKE ?', `%${book.coverHash}%`)
        if (metadata) {
          metadata.tags = {
            artist: metadata.artist ? JSON.parse(metadata.artist.replace(re, '\"')) : undefined,
            group: metadata.group ? JSON.parse(metadata.group.replace(re, '\"')) : undefined,
            parody: metadata.parody ? JSON.parse(metadata.parody.replace(re, '\"')) : undefined,
            character: metadata.character ? JSON.parse(metadata.character.replace(re, '\"')) : undefined,
            female: metadata.female ? JSON.parse(metadata.female.replace(re, '\"')) : undefined,
            male: metadata.male ? JSON.parse(metadata.male.replace(re, '\"')) : undefined,
            language: metadata.language ? JSON.parse(metadata.language.replace(re, '\"')) : undefined,
            mixed: metadata.mixed ? JSON.parse(metadata.mixed.replace(re, '\"')) : undefined,
            other: metadata.other ? JSON.parse(metadata.other.replace(re, '\"')) : undefined,
            cosplayer: metadata.cosplayer ? JSON.parse(metadata.cosplayer.replace(re, '\"')) : undefined,
            rest: metadata.rest ? JSON.parse(metadata.rest.replace(re, '\"')) : undefined,
          }
          metadata.filecount = +metadata.filecount
          metadata.rating = +metadata.rating
          metadata.posted = +metadata.posted
          metadata.filesize = +metadata.filesize
          metadata.url = `https://exhentai.org/g/${metadata.gid}/${metadata.token}/`
          _.assign(book, _.pick(metadata, ['tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category', 'url']), {status: 'tagged'})
          sendMessageToWebContents(`${i+1} of ${bookListLength}, found metadata for ${book.filepath}`)
          mainWindow.setProgressBar(i/bookListLength)
        } else {
          sendMessageToWebContents(`${i+1} of ${bookListLength}, metadata not found for ${book.filepath}`)
        }
      }
      await db.close()
      mainWindow.setProgressBar(-1)
    } catch (e) {
      console.log(e)
      await db.close()
    }
  }
  return bookList
})

ipcMain.handle('set-progress-bar', async(event, progress)=>{
  mainWindow.setProgressBar(progress)
})

ipcMain.handle('get-locale', async(event, arg)=>{
  return app.getLocale()
})