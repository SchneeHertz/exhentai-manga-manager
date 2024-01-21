const { app, BrowserWindow, ipcMain, session, dialog, shell, screen, Menu, clipboard, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { brotliDecompress } = require('zlib')
const { promisify, format } = require('util')
const _ = require('lodash')
const { nanoid } = require('nanoid')
const sharp = require('sharp')
const { exec } = require('child_process')
const { createHash } = require('crypto')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const fetch = require('node-fetch')
const { HttpsProxyAgent } = require('https-proxy-agent')
const windowStateKeeper = require('electron-window-state')

const { prepareMangaModel, prepareMetadataModel } = require('./modules/database')
const { prepareTemplate } = require('./modules/prepare_menu.js')
const { getBookFilelist, geneCover, getImageListByBook } = require('./fileLoader/index.js')
const { STORE_PATH, TEMP_PATH, COVER_PATH, VIEWER_PATH, prepareSetting, preparePath } = require('./modules/init_folder_setting.js')


preparePath()
let setting = prepareSetting()

const Manga = prepareMangaModel(path.join(STORE_PATH, './database.sqlite'))
let metadataSqliteFile
if (setting.metadataPath) {
  metadataSqliteFile = path.join(setting.metadataPath, './metadata.sqlite')
} else {
  metadataSqliteFile = path.join(STORE_PATH, './metadata.sqlite')
}
let Metadata = prepareMetadataModel(metadataSqliteFile)

const logFile = fs.createWriteStream(path.join(STORE_PATH, 'log.txt'), { flags: 'w' })
const logStdout = process.stdout

console.log = (...message) => {
  logFile.write(format(...message) + '\n')
  logStdout.write(format(...message) + '\n')
}

process
  .on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason)
  })
  .on('uncaughtException', err => {
    console.log(err, 'Uncaught Exception thrown')
    process.exit(1)
  })

const sendMessageToWebContents = (message) => {
  console.log(message)
  mainWindow.webContents.send('send-message', message)
}

let mainWindow
let screenWidth
let sendImageLock = false
const createWindow = () => {
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
    win.loadURL('http://localhost:5374')
  }
  win.setMenuBarVisibility(false)
  win.setAutoHideMenuBar(true)
  let menu = Menu.buildFromTemplate(prepareTemplate(win))
  Menu.setApplicationMenu(menu)
  win.webContents.on('did-finish-load', () => {
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
app.whenReady().then(async () => {
  await Manga.sync()
  await Metadata.sync()
  const primaryDisplay = screen.getPrimaryDisplay()
  screenWidth = Math.floor(primaryDisplay.workAreaSize.width * primaryDisplay.scaleFactor)
  mainWindow = createWindow()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow()
  }
})

app.on('ready', async () => {
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
const loadBookListFromBrFile = async () => {
  try {
    let buffer = await fs.promises.readFile(path.join(STORE_PATH, 'bookList.json.br'))
    let decodeBuffer = await promisify(brotliDecompress)(buffer)
    return JSON.parse(decodeBuffer.toString())
  } catch {
    return JSON.parse(await fs.promises.readFile(path.join(STORE_PATH, 'bookList.json'), { encoding: 'utf-8' }))
  }
}

const loadLegecyBookListFromFile = async () => {
  let bookList = await loadBookListFromBrFile()
  try {
    shell.trashItem(path.join(STORE_PATH, 'bookList.json.br'))
    shell.trashItem(path.join(STORE_PATH, 'bookList.json'))
  } catch {
    console.log('Remove Legecy BookList Failed')
  }
  return bookList
}

const loadBookListFromDatabase = async () => {
  let bookList = await Manga.findAll()
  bookList = bookList.map(b=>b.toJSON())
  if (_.isEmpty(bookList)) {
    bookList = await loadLegecyBookListFromFile()
    await saveBookListToDatabase(bookList)
  }
  let metadataList = await Metadata.findAll()
  metadataList = metadataList.map(m=>m.toJSON())
  let bookListLength = bookList.length
  for (let i = 0; i < bookListLength; i++) {
    let book = bookList[i]
    let findMetadata = metadataList.find(m=>m.hash === book.hash)
    if (findMetadata) {
      Object.assign(book, findMetadata)
    } else {
      setProgressBar((i + 1) / bookListLength)
      await Metadata.upsert(book)
    }
  }
  setProgressBar(-1)
  return bookList
}

const saveBookListToDatabase = async (data) => {
  console.log('Empty Exist BookList and Saved New BookList')
  await Manga.destroy({ truncate: true })
  await Manga.bulkCreate(data)
}

const saveBookToDatabase = async (book) => {
  await Manga.update(book, { where: { id: book.id } })
  await Metadata.update(book, { where: { hash: book.hash } })
  console.log(`Saved ${book.title}`)
}

const setProgressBar = (progress) => {
  mainWindow.setProgressBar(progress)
  mainWindow.webContents.send('send-action', {
    action: 'send-progress',
    progress
  })
}

const clearFolder = async (Folder) => {
  try {
    await fs.promises.rm(Folder, { recursive: true, force: true })
    await fs.promises.mkdir(Folder, { recursive: true })
  } catch (err) {
    console.log(err)
  }
}


// library and metadata
ipcMain.handle('load-book-list', async (event, scan) => {
  if (scan) {
    await Manga.update({ exist: false }, { where: {} })

    sendMessageToWebContents('start loading library')
    let list = await getBookFilelist(setting.library)
    if (!_.isEmpty(setting.excludeFile)) {
      let excludeRe
      try {
        excludeRe = new RegExp(setting.excludeFile)
        list = _.filter(list, file => !excludeRe.test(file.filepath))
      } catch {
        console.log('Illegal regular expressions')
      }
    }
    let listLength = list.length
    sendMessageToWebContents(`load ${listLength} book from library`)

    for (let i = 0; i < listLength; i++) {
      try {
        let { filepath, type } = list[i]
        let foundData = await Manga.findOne({ where: { filepath: filepath } })
        if (foundData === null) {
          let id = nanoid()
          let { targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash } = await geneCover(filepath, type)
          if (targetFilePath && coverPath) {
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
          }
        } else {
          foundData.exist = true
          foundData.coverPath = path.join(COVER_PATH, path.basename(foundData.coverPath))
          await foundData.save()
        }
        setProgressBar(i / listLength)
        if ((i + 1) % 50 === 0) await clearFolder(TEMP_PATH)
      } catch (e) {
        sendMessageToWebContents(`load ${list[i].filepath} failed because ${e}, ${i + 1} of ${listLength}`)
      }
    }
    await clearFolder(TEMP_PATH)

    let existData = await Manga.findAll({ where: { exist: true }, raw: true })
    try {
      let coverList = await fs.promises.readdir(COVER_PATH)
      let existCoverList = existData.map(b => b.coverPath)
      let removeCoverList = _.difference(coverList.map(p => path.join(COVER_PATH, p)), existCoverList)
      for (let coverPath of removeCoverList) {
        await fs.promises.rm(coverPath)
      }
    } catch (err) {
      console.log(err)
    }
    await Manga.destroy({ where: { exist: false } })
    setProgressBar(-1)
  }
  return await loadBookListFromDatabase()
})

ipcMain.handle('force-gene-book-list', async (event, arg) => {
  await Manga.destroy({ truncate: true })
  await clearFolder(TEMP_PATH)
  await clearFolder(COVER_PATH)
  sendMessageToWebContents('start loading library')
  let list = await getBookFilelist(setting.library)
  if (!_.isEmpty(setting.excludeFile)) {
    let excludeRe
    try {
      excludeRe = new RegExp(setting.excludeFile)
      list = _.filter(list, file => !excludeRe.test(file.filepath))
    } catch {
      console.log('Illegal regular expressions')
    }
  }
  let listLength = list.length
  sendMessageToWebContents(`load ${listLength} book from library`)
  for (let i = 0; i < listLength; i++) {
    try {
      let { filepath, type } = list[i]
      let id = nanoid()
      let { targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash } = await geneCover(filepath, type)
      if (targetFilePath && coverPath) {
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
      if ((i + 1) % 50 === 0) await clearFolder(TEMP_PATH)
      setProgressBar(i / listLength)
    } catch (e) {
      sendMessageToWebContents(`load ${list[i].filepath} failed because ${e}, ${i + 1} of ${listLength}`)
    }
  }
  await clearFolder(TEMP_PATH)

  setProgressBar(-1)
  return await loadBookListFromDatabase()
})

ipcMain.handle('patch-local-metadata', async (event, arg) => {
  let bookList = await loadBookListFromDatabase()
  let bookListLength = bookList.length
  await clearFolder(TEMP_PATH)
  await clearFolder(COVER_PATH)

  for (let i = 0; i < bookListLength; i++) {
    try {
      let book = bookList[i]
      let { filepath, type } = book
      if (!type) type = 'archive'
      let { targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash } = await geneCover(filepath, type)
      if (targetFilePath && coverPath) {
        let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
        _.assign(book, { type, coverPath, hash, pageCount, bundleSize, mtime: mtime.toJSON(), coverHash })
        await saveBookToDatabase(book)
      }
      if ((i + 1) % 50 === 0) await clearFolder(TEMP_PATH)
      setProgressBar(i / bookListLength)
    } catch (e) {
      sendMessageToWebContents(`patch ${bookList[i].filepath} failed because ${e}`)
    }
  }

  await clearFolder(TEMP_PATH)
  setProgressBar(-1)
  return bookList
})

ipcMain.handle('patch-local-metadata-by-book', async (event, book) => {
  let { filepath, type } = book
  if (!type) type = 'archive'
  try {
    let { targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash } = await geneCover(filepath, type)
    if (targetFilePath && coverPath) {
      let hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
      await clearFolder(TEMP_PATH)
      return Promise.resolve({ coverPath, hash, pageCount, bundleSize, mtime: mtime.toJSON(), coverHash })
    }
  } catch (e) {
    sendMessageToWebContents(`patch ${book.filepath} failed because ${e}`)
    await clearFolder(TEMP_PATH)
    return Promise.reject()
  }
})

ipcMain.handle('get-ex-webpage', async (event, { url, cookie }) => {
  if (setting.proxy) {
    return await fetch(url, {
      headers: {
        Cookie: cookie
      },
      agent: new HttpsProxyAgent(setting.proxy)
    })
      .then(res=>{
        return res.text()
      })
      .catch(e => {
        sendMessageToWebContents(`get ex page failed because ${e}`)
      })
  } else {
    return await fetch(url, {
      headers: {
        Cookie: cookie
      }
    })
      .then(res=>{
        return res.text()
      })
      .catch(e => {
        sendMessageToWebContents(`get ex page failed because ${e}`)
      })
  }
})

ipcMain.handle('post-data-ex', async (event, { url, data, cookie }) => {
  if (setting.proxy) {
    return await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json'
      },
      agent: new HttpsProxyAgent(setting.proxy)
    })
      .then(res=>{
        return res.text()
      })
      .catch(e => {
        sendMessageToWebContents(`get ex data failed because ${e}`)
      })
  } else {
    return await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json'
      }
    })
      .then(res=>{
        return res.text()
      })
      .catch(e => {
        sendMessageToWebContents(`get ex data failed because ${e}`)
      })
  }
})

ipcMain.handle('save-book', async (event, book) => {
  return await saveBookToDatabase(book)
})

// home
ipcMain.handle('get-folder-tree', async (event, bookList) => {
  let folderList = [...new Set(bookList.map(b => path.dirname(b.filepath)))]
  let librarySplitPathsLength = setting.library.split(path.sep).length - 1
  let bookPathSplitList = folderList.sort().map(fp => fp.split(path.sep).slice(librarySplitPathsLength))
  let folderTreeObject = {}
  for (let folders of bookPathSplitList) {
    _.set(folderTreeObject, folders.map(f => '_' + f), {})
  }
  let resolveTree = (preRoot, tree, initFolder) => {
    _.forIn(tree, (node, label) => {
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

ipcMain.handle('load-collection-list', async (event, arg) => {
  let list
  try {
    list = JSON.parse(fs.readFileSync(path.join(STORE_PATH, 'collectionList.json'), { encoding: 'utf-8' }))
  } catch (err) {
    console.log(err)
    list = []
  }
  return list
})

ipcMain.handle('save-collection-list', async (event, list) => {
  return await fs.promises.writeFile(path.join(STORE_PATH, 'collectionList.json'), JSON.stringify(list, null, '  '), { encoding: 'utf-8' })
})

// detail
ipcMain.handle('open-url', async (event, url) => {
  shell.openExternal(url)
})

ipcMain.handle('show-file', async (event, filepath) => {
  shell.showItemInFolder(filepath)
})

ipcMain.handle('use-new-cover', async (event, filepath) => {
  let copyTempCoverPath = path.join(TEMP_PATH, nanoid(8) + path.extname(filepath))
  let coverPath = path.join(COVER_PATH, nanoid() + path.extname(filepath))
  try {
    await fs.promises.copyFile(filepath, copyTempCoverPath)
    await sharp(copyTempCoverPath)
    .resize(500, 707, {
      fit: 'contain',
      background: '#303133'
    })
    .toFile(coverPath)
    return coverPath
  } catch (e) {
    sendMessageToWebContents(`generate cover from ${filepath} failed because ${e}`)
  }
})

ipcMain.handle('open-local-book', async (event, filepath) => {
  exec(`${setting.imageExplorer} "${filepath}"`)
})

ipcMain.handle('delete-local-book', async (event, filepath) => {
  if (filepath.startsWith(setting.library)) {
    await Manga.destroy({ where: { filepath: filepath } })
    return shell.trashItem(filepath)
  }
})

// viewer
ipcMain.handle('load-manga-image-list', async (event, book) => {
  await clearFolder(VIEWER_PATH)

  let { filepath, type, id: bookId } = book
  let list = await getImageListByBook(filepath, type)

  sendImageLock = true
  ;(async () => {
    // 384 is the default 4K screen width divided by the default number of thumbnail columns
    let thumbnailWidth = _.isFinite(screenWidth / setting.thumbnailColumn) ? Math.floor(screenWidth / setting.thumbnailColumn) : 384
    let widthLimit = _.isNumber(setting.widthLimit) ? Math.ceil(setting.widthLimit) : screenWidth
    for (let index = 1; index <= list.length; index++) {
      if (sendImageLock) {
        let imageFilepath = list[index - 1]
        let extname = path.extname(imageFilepath)
        if (imageFilepath.search(/[%#]/) >= 0 || type === 'folder') {
          let newFilepath = path.join(VIEWER_PATH, `rename_${nanoid(8)}${extname}`)
          await fs.promises.copyFile(imageFilepath, newFilepath)
          imageFilepath = newFilepath
        }
        let { width, height } = await sharp(imageFilepath).metadata()
        if (widthLimit !== 0 && width > widthLimit) {
          height = Math.floor(height * (widthLimit / width))
          width = widthLimit
          let resizedFilepath = path.join(VIEWER_PATH, `resized_${nanoid(8)}.jpg`)
          switch (extname) {
            case '.gif':
              break
            default:
              await sharp(imageFilepath)
                .resize({ width })
                .toFile(resizedFilepath)
              imageFilepath = resizedFilepath
              break
          }
        }
        let thumbnailPath = path.join(VIEWER_PATH, `thumb_${nanoid(8)}.jpg`)
        switch (extname) {
          case '.gif':
            thumbnailPath = imageFilepath
            break
          default:
            await sharp(imageFilepath)
              .resize({ width: thumbnailWidth })
              .toFile(thumbnailPath)
            break
        }
        mainWindow.webContents.send('manga-content', {
          id: `${bookId}_${index}`,
          index,
          filepath: imageFilepath,
          thumbnailPath,
          width, height
        })
      }
    }
  })()

  return list
})

ipcMain.handle('release-sendimagelock', () => {
  sendImageLock = false
})


// setting
ipcMain.handle('select-folder', async (event, type) => {
  let result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (!result.canceled) {
    return result.filePaths[0]
  } else {
    return undefined
  }
})

ipcMain.handle('select-file', async (event, type) => {
  let result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  })
  if (!result.canceled) {
    return result.filePaths[0]
  } else {
    return undefined
  }
})

ipcMain.handle('load-setting', async (event, arg) => {
  return JSON.parse(fs.readFileSync(path.join(STORE_PATH, 'setting.json'), { encoding: 'utf-8' }))
})

ipcMain.handle('save-setting', async (event, receiveSetting) => {
  if (receiveSetting.proxy) {
    await session.defaultSession.setProxy({
      mode: 'fixed_servers',
      proxyRules: receiveSetting.proxy
    })
  }
  if (receiveSetting.metadataPath !== setting.metadataPath) {
    Metadata = prepareMetadataModel(path.join(receiveSetting.metadataPath, './metadata.sqlite'))
    await Metadata.sync()
  }
  setting = receiveSetting
  return await fs.promises.writeFile(path.join(STORE_PATH, 'setting.json'), JSON.stringify(setting, null, '  '), { encoding: 'utf-8' })
})

ipcMain.handle('export-database', async (event, arg) => {
  let bookList = await loadBookListFromDatabase()
  let collectionList = []
  try {
    collectionList = JSON.parse(await fs.promises.readFile(path.join(STORE_PATH, 'collectionList.json'), { encoding: 'utf-8' }))
  } catch (err) {
    console.log(err)
  }
  _.forEach(collectionList, collection => {
    _.forEach(collection.list, (hash_id, index) => {
      let foundBook = _.find(bookList, book => book.id === hash_id || book.hash === hash_id)
      if (foundBook) {
        foundBook.collectionInfo = {
          id: collection.id,
          title: collection.title,
          index
        }
      }
    })
  })
  let database = bookList.map(book => {
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

ipcMain.handle('load-import-database', async (event, arg) => {
  let result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  })
  if (!result.canceled) {
    return JSON.parse(fs.readFileSync(result.filePaths[0], { encoding: 'utf-8' }))
  } else {
    return []
  }
})

ipcMain.handle('import-sqlite', async (event, bookList) => {
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
            _.assign(book, _.pick(metadata, ['tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category', 'url']), { status: 'tagged' })
            await saveBookToDatabase(book)
          }
          setProgressBar(i / bookListLength)
        }
      }
      await db.close()
      setProgressBar(-1)
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

ipcMain.handle('set-progress-bar', async (event, progress) => {
  setProgressBar(progress)
})

ipcMain.handle('get-locale', async (event, arg) => {
  return app.getLocale()
})

ipcMain.handle('copy-image-to-clipboard', async (event, filepath) => {
  clipboard.writeImage(nativeImage.createFromPath(filepath))
})

ipcMain.handle('copy-text-to-clipboard', async (event, text) => {
  clipboard.writeText(text)
})

ipcMain.handle('read-text-from-clipboard', async () => {
  return clipboard.readText()
})

ipcMain.handle('update-window-title', async (event, title) => {
  let name = require('./package.json').name
  let version = require('./package.json').version
  if (title) {
    mainWindow.setTitle(name + ' ' + version + ' | ' + title)
  } else {
    mainWindow.setTitle(name + ' ' + version)
  }
})