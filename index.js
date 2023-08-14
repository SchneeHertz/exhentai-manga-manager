const { app, BrowserWindow, ipcMain, session, dialog, shell, screen, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const process = require('process')
const { brotliCompress, brotliDecompress } = require('zlib')
const { promisify, format } = require('util')
const _ = require('lodash')
const { nanoid } = require('nanoid')
const sharp = require('sharp')
const { exec } = require('child_process')
const { createHash } = require('crypto')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const superagent = require('superagent')
require('superagent-proxy')(superagent)
const windowStateKeeper = require('electron-window-state')
const { Manga } = require('./fileLoader/database')

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
    imageExplorer: '\"C:\\Windows\\explorer.exe\"',
    pageSize: 10,
    loadOnStart: false,
    requireGap: 10000,
    thumbnailColumn: 10,
    showTranslation: false,
    widthLimit: undefined,
    directEnter: 'detail',
    language: 'default',
    advancedSearch: true
  }
  fs.writeFileSync(path.join(STORE_PATH, 'setting.json'), JSON.stringify(setting, null, '  '), {encoding: 'utf-8'})
}

let logFile = fs.createWriteStream(path.join(STORE_PATH, 'log.txt'), {flags: 'w'})
let logStdout = process.stdout

console.log = (...message)=>{
  logFile.write(format(...message) + '\n')
  logStdout.write(format(...message) + '\n')
}

let sendMessageToWebContents = (message)=>{
  console.log(message)
  mainWindow.webContents.send('send-message', message)
}

let mainWindow
let screenWidth
let sendImageLock = false
const createWindow = ()=>{
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1560,
    defaultHeight: 1000
  })
  const win = new BrowserWindow({
    'x': mainWindowState.x,
    'y': mainWindowState.y,
    'width': mainWindowState.width,
    'height': mainWindowState.height,
    webPreferences: {
      webSecurity: app.isPackaged ? true : false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  })
  mainWindowState.manage(win)
  if (app.isPackaged) {
    win.loadFile('dist/index.html')
  } else {
    win.loadURL('http://localhost:3000')
  }
  win.setMenuBarVisibility(false)
  win.setAutoHideMenuBar(true)
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Setting',
          accelerator: 'CommandOrControl+E',
          click: async () => {
            win.webContents.send('send-action', {
              action: 'setting'
            })
          }
        },
        { type: 'separator' },
        {
          role: 'quit',
          accelerator: 'CommandOrControl+Q'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        {
          role: 'toggleDevTools',
          accelerator: 'F12',
          visible: false
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        {
          role: 'zoomIn',
          accelerator: 'CommandOrControl+=',
          visible: false
        },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Shortcut',
      submenu: [
        {
          label: 'Focus SearchBar',
          accelerator: 'CommandOrControl+L',
          click: () => {
            win.webContents.send('send-action', {
              action: 'focus-search'
            })
          }
        },
        {
          label: 'Focus SearchBar (invisible)',
          accelerator: 'F6',
          visible: false,
          click: () => {
            win.webContents.send('send-action', {
              action: 'focus-search'
            })
          }
        },
        {
          label: 'Shuffle Manga',
          accelerator: 'CommandOrControl+S',
          click: () => {
            win.webContents.send('send-action', {
              action: 'shuffle-manga'
            })
          }
        },
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          accelerator: 'F1',
          click: async () => {
            win.webContents.send('send-action', {
              action: 'about'
            })
          }
        }
      ]
    }
  ]
  let menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
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

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=8192')
app.whenReady().then(async ()=>{
  await Manga.sync({ alter: true })
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
    // await session.defaultSession.loadExtension(path.resolve(__dirname,'./devtools'))
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
    await fs.promises.writeFile(path.join(STORE_PATH, 'bookList.json'), decodeBuffer.toString(), {encoding: 'utf-8'})
    return JSON.parse(decodeBuffer.toString())
  } catch {
    return JSON.parse(await fs.promises.readFile(path.join(STORE_PATH, 'bookList.json'), {encoding: 'utf-8'}))
  }
}

const loadBookListFromDatabase = async ()=>{
  let bookList = await Manga.findAll({raw: true})
  if (_.isEmpty(bookList)) {
    bookList = await loadLegecyBookListFromFile()
    await Manga.bulkCreate(bookList)
  }
  _.forEach(bookList, (book)=>{
    try{
      book.tags = JSON.parse(book.tags)
    } catch {
      book.tags = {}
    }
  })
  return bookList
}

const loadLegecyBookListFromFile = async ()=>{
  let bookList = await loadBookListFromBrFile()
  try {
    shell.trashItem(path.join(STORE_PATH, 'bookList.json.br'))
    shell.trashItem(path.join(STORE_PATH, 'bookList.json'))
  } catch {
    console.log('Remove Legecy BookList Failed')
  }
  return bookList
}

let saveBookListToBrFile = async (data)=>{
  console.log('Saved BookList')
  let buffer = await promisify(brotliCompress)(JSON.stringify(data))
  return await fs.promises.writeFile(path.join(STORE_PATH, 'bookList.json.br'), buffer)
}

const saveBookListToDatabase = async (data)=>{
  console.log('Empty Exist BookList and Saved New BookList')
  await Manga.destroy({truncate: true})
  await Manga.bulkCreate(data)
}

const saveBookToDatabase = async (book)=>{
  await Manga.update(book, {where: {id: book.id}})
  console.log(`Saved ${book.title}`)
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
      ;({targetFilePath, coverPath, tempCoverPath, pageCount, bundleSize, mtime} = await solveBookTypeFolder(filepath, TEMP_PATH, COVER_PATH))
      break
    case 'zip':
      try {
        ;({targetFilePath, coverPath, tempCoverPath, pageCount, bundleSize, mtime} = await solveBookTypeArchive(filepath, TEMP_PATH, COVER_PATH))
      } catch (e) {
        console.log(e)
        console.log(`reload ${filepath} use adm-zip`)
        ;({targetFilePath, coverPath, tempCoverPath, pageCount, bundleSize, mtime} = await solveBookTypeZip(filepath, TEMP_PATH, COVER_PATH))
      }
      break
    case 'archive':
      ;({targetFilePath, coverPath, tempCoverPath, pageCount, bundleSize, mtime} = await solveBookTypeArchive(filepath, TEMP_PATH, COVER_PATH))
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
    return {targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash}
  } else {
    return {targetFilePath:undefined, coverPath:undefined}
  }

}


// library and metadata
ipcMain.handle('load-book-list', async (event, scan)=>{
  if (scan) {
    await Manga.update({exist: false}, {where: {}})

    sendMessageToWebContents('start loading library')
    let list = await getBookFilelist()
    if (!_.isEmpty(setting.excludeFile)) {
      let excludeRe
      try {
        excludeRe = new RegExp(setting.excludeFile)
        list = _.filter(list, file=>!excludeRe.test(file.filepath))
      } catch {
        console.log('Illegal regular expressions')
      }
    }
    let listLength = list.length
    sendMessageToWebContents(`load ${listLength} book from library`)

    for (let i = 0; i < listLength; i++) {
      try {
        let {filepath, type} = list[i]
        let foundData = await Manga.findOne({where: {filepath: filepath}})
        if (foundData === null) {
          sendMessageToWebContents(`load ${filepath}, ${i+1} of ${listLength}`)
          let id = nanoid()
          let {targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash} = await geneCover(filepath, type)
          if (targetFilePath && coverPath){
            let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
            await Manga.create({
              title: path.basename(filepath),
              coverPath,
              hash,
              filepath,
              type,
              id,
              pageCount,
              bundleSize,
              mtime: mtime.toJSON(),
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
          await foundData.save()
        }
        if ((i+1) % 100 === 0) {
          sendMessageToWebContents(`load ${i+1} of ${listLength}`)
          try {
            await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
            await fs.promises.mkdir(TEMP_PATH, {recursive: true})
          } catch (err) {
            console.log(err)
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

    let existData = await Manga.findAll({where: {exist: true}, raw: true})
    try {
      let coverList = await fs.promises.readdir(COVER_PATH)
      let existCoverList = existData.map(b=>b.coverPath)
      let removeCoverList = _.difference(coverList.map(p=>path.join(COVER_PATH, p)), existCoverList)
      for (let coverPath of removeCoverList) {
        await fs.promises.rm(coverPath)
      }
    } catch (err) {
      console.log(err)
    }
    await Manga.destroy({where: {exist: false}})
    mainWindow.setProgressBar(-1)
  }
  return await loadBookListFromDatabase()
})

ipcMain.handle('force-gene-book-list', async (event, arg)=>{
  await Manga.destroy({truncate: true})
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
  if (!_.isEmpty(setting.excludeFile)) {
    let excludeRe
    try {
      excludeRe = new RegExp(setting.excludeFile)
      list = _.filter(list, file=>!excludeRe.test(file.filepath))
    } catch {
      console.log('Illegal regular expressions')
    }
  }
  let listLength = list.length
  sendMessageToWebContents(`load ${listLength} book from library`)
  for (let i = 0; i < listLength; i++) {
    try {
      let {filepath, type} = list[i]
      sendMessageToWebContents(`load ${filepath}, ${i+1} of ${listLength}`)
      let id = nanoid()
      let {targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash} = await geneCover(filepath, type)
      if (targetFilePath && coverPath){
        let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
        await Manga.create({
          title: path.basename(filepath),
          coverPath,
          hash,
          filepath,
          type,
          id,
          pageCount,
          bundleSize,
          mtime: mtime.toJSON(),
          coverHash,
          status: 'non-tag',
          date: Date.now()
        })
      }
      mainWindow.setProgressBar(i/listLength)
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

  mainWindow.setProgressBar(-1)
  return await loadBookListFromDatabase()
})

ipcMain.handle('patch-local-metadata', async(event, arg)=>{
  let bookList = await loadBookListFromDatabase()
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
      let {targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash} = await geneCover(filepath, type)
      if (targetFilePath && coverPath){
        let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
        _.assign(book, {type, coverPath, hash, pageCount, bundleSize, mtime: mtime.toJSON(), coverHash})
        await Manga.update(book, {where: {id: book.id}})
        sendMessageToWebContents(`patch ${filepath}, ${i+1} of ${bookListLength}`)
        mainWindow.setProgressBar(i/bookListLength)
      }
    } catch (e) {
      sendMessageToWebContents(`patch ${bookList[i].filepath} failed because ${e}`)
    }
  }

  try {
    await fs.promises.rm(TEMP_PATH, {recursive: true, force: true})
    await fs.promises.mkdir(TEMP_PATH, {recursive: true})
  } catch (err) {
    console.log(err)
  }
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
      sendMessageToWebContents(`get ex page failed because ${e}`)
    })
  } else {
    return await superagent
    .get(url)
    .set('Cookie', cookie)
    .then(res=>{
      return res.text
    })
    .catch(e=>{
      sendMessageToWebContents(`get ex page failed because ${e}`)
    })
  }
})

ipcMain.handle('post-data-ex', async (event, {url, data, cookie})=>{
  if (setting.proxy) {
    return await superagent
    .post(url, data)
    .set('Cookie', cookie)
    .proxy(setting.proxy)
    .then(res=>{
      return res.text
    })
    .catch(e=>{
      sendMessageToWebContents(`get ex data failed because ${e}`)
    })
  } else {
    return await superagent
    .post(url, data)
    .set('Cookie', cookie)
    .then(res=>{
      return res.text
    })
    .catch(e=>{
      sendMessageToWebContents(`get ex data failed because ${e}`)
    })
  }
})

ipcMain.handle('save-book-list', async (event, list)=>{
  return await saveBookListToDatabase(list)
})

ipcMain.handle('save-book', async (event, book)=>{
  return await saveBookToDatabase(book)
})

// home
ipcMain.handle('get-folder-tree', async(event, bookList)=>{
  let folderList = _.uniq(bookList.map(b=>path.dirname(b.filepath)))
  let librarySplitPathsLength = setting.library.split(path.sep).length - 1
  let bookPathSplitList = folderList.sort().map(fp=>fp.split(path.sep).slice(librarySplitPathsLength))
  let folderTreeObject = {}
  for(let folders of bookPathSplitList){
    _.set(folderTreeObject, folders.map(f=>'_'+f), {})
  }
  let resolveTree = (preRoot, tree, initFolder)=>{
    _.forIn(tree, (node, label)=>{
      let trueLabel = label.slice(1)
      if (_.isEmpty(node)) {
        preRoot.push({
          label: trueLabel,
          folderPath: [...initFolder, trueLabel]
        })
      } else {
        preRoot.push({
          label: trueLabel,
          folderPath: [...initFolder, trueLabel],
          children: resolveTree([], node, [...initFolder, trueLabel])
        })
      }
    })
    return preRoot
  }
  return resolveTree([], folderTreeObject, [])
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
  exec(`${setting.imageExplorer} "${filepath}"`)
})

ipcMain.handle('delete-local-book', async (event, filepath)=>{
  if (filepath.startsWith(setting.library)) {
    await Manga.destroy({where: {filepath: filepath}})
    return shell.trashItem(filepath)
  }
})

// viewer
ipcMain.handle('load-manga-image-list', async(event, book)=>{
  try {
    await fs.promises.rm(VIEWER_PATH, {recursive: true, force: true})
    await fs.promises.mkdir(VIEWER_PATH, {recursive: true})
  } catch (err) {
    console.log(err)
  }
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
        if (width > widthLimit) {
          let resizedFilepath = path.join(VIEWER_PATH, `resized_${nanoid(6)}_${path.basename(filepath)}`)
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
  let bookList = await loadBookListFromDatabase()
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
      return _.pick(book, ['hash', 'tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category', 'url', 'collectionInfo', 'mark'])
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
        if (book.status !== 'tagged') {
          let metadata = await db.get('SELECT * FROM gallery WHERE thumb LIKE ?', `%${book.coverHash}%`)
          if (metadata) {
            metadata.tags = {
              language: metadata.language ? JSON.parse(metadata.language.replace(re, '\"')) : undefined,
              parody: metadata.parody ? JSON.parse(metadata.parody.replace(re, '\"')) : undefined,
              character: metadata.character ? JSON.parse(metadata.character.replace(re, '\"')) : undefined,
              group: metadata.group ? JSON.parse(metadata.group.replace(re, '\"')) : undefined,
              artist: metadata.artist ? JSON.parse(metadata.artist.replace(re, '\"')) : undefined,
              male: metadata.male ? JSON.parse(metadata.male.replace(re, '\"')) : undefined,
              female: metadata.female ? JSON.parse(metadata.female.replace(re, '\"')) : undefined,
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
            await Manga.update(book, {where: {id: book.id}})
            sendMessageToWebContents(`${i+1} of ${bookListLength}, found metadata for ${book.filepath}`)
            mainWindow.setProgressBar(i/bookListLength)
          } else {
            sendMessageToWebContents(`${i+1} of ${bookListLength}, metadata not found for ${book.filepath}`)
          }
        }
      }
      await db.close()
      mainWindow.setProgressBar(-1)
    } catch (e) {
      console.log(e)
      await db.close()
    }
    return {
      success: true,
      bookList
    }
  } else {
    return {
      success: false
    }
  }
})

ipcMain.handle('set-progress-bar', async(event, progress)=>{
  mainWindow.setProgressBar(progress)
})

ipcMain.handle('get-locale', async(event, arg)=>{
  return app.getLocale()
})