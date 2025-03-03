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
const express = require('express')

const { prepareMangaModel, prepareMetadataModel } = require('./modules/database')
const { prepareTemplate } = require('./modules/prepare_menu.js')
const { getBookFilelist, geneCover, getImageListByBook, deleteImageFromBook } = require('./fileLoader/index.js')
const { STORE_PATH, isPortable, TEMP_PATH, COVER_PATH, VIEWER_PATH, prepareSetting, prepareCollectionList, preparePath } = require('./modules/init_folder_setting.js')
const { findSameFile } = require('./fileLoader/folder.js')

preparePath()
let setting = prepareSetting()
let collectionList = prepareCollectionList()

const Manga = prepareMangaModel(path.join(STORE_PATH, './database.sqlite'))
let metadataSqliteFile
if (setting.metadataPath) {
  metadataSqliteFile = path.join(setting.metadataPath, './metadata.sqlite')
} else {
  metadataSqliteFile = path.join(STORE_PATH, './metadata.sqlite')
}
let Metadata = prepareMetadataModel(metadataSqliteFile)
const getColumns = async (sequelize, tableName) => {
  const query = `PRAGMA table_info(${tableName})`
  const [results] = await sequelize.query(query)
  return results.map(column => column.name)
}
;(async () => {
  const columns = await getColumns(Manga.sequelize, 'Mangas')
  if (['hiddenBook', 'readCount'].some(c => !columns.includes(c))) {
    await Manga.sync({ alter: true })
  } else {
    await Manga.sync()
  }
  await Metadata.sync()
})()

const logFile = fs.createWriteStream(path.join(STORE_PATH, 'log.txt'), { flags: 'w' })
const logStdout = process.stdout
const logStderr = process.stderr

console.log = (...message) => {
  logFile.write(format(...message) + '\n')
  logStdout.write(format(...message) + '\n')
}

console.error = (...message) => {
  logFile.write(format(...message) + '\n')
  logStderr.write(format(...message) + '\n')
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
  const mainWindowState = windowStateKeeper({
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
  const menu = Menu.buildFromTemplate(prepareTemplate(win))
  Menu.setApplicationMenu(menu)
  win.webContents.on('did-finish-load', () => {
    const name = require('./package.json').name
    const version = require('./package.json').version
    win.setTitle(name + ' ' + version)
  })
  win.once('ready-to-show', () => {
    win.show()
  })
  return win
}

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=65536')
// app.disableHardwareAcceleration()
app.whenReady().then(async () => {
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
  // session.defaultSession.loadExtension(path.join(__dirname, './devtools'))
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
    const buffer = await fs.promises.readFile(path.join(STORE_PATH, 'bookList.json.br'))
    const decodeBuffer = await promisify(brotliDecompress)(buffer)
    return JSON.parse(decodeBuffer.toString())
  } catch {
    try {
      return JSON.parse(await fs.promises.readFile(path.join(STORE_PATH, 'bookList.json'), { encoding: 'utf-8' }))
    } catch {
      return []
    }
  }
}

const loadLegecyBookListFromFile = async () => {
  const bookList = await loadBookListFromBrFile()
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
  bookList = bookList.map(b => b.toJSON())
  if (_.isEmpty(bookList)) {
    bookList = await loadLegecyBookListFromFile()
    await saveBookListToDatabase(bookList)
  }
  let metadataList = await Metadata.findAll()
  metadataList = metadataList.map(m => m.toJSON())
  const bookListLength = bookList.length
  for (let i = 0; i < bookListLength; i++) {
    const book = bookList[i]
    const findMetadata = metadataList.find(m => m.hash === book.hash)
    if (findMetadata) {
      if (book.status === 'non-tag' && findMetadata.status !== 'non-tag') await Manga.update(findMetadata, { where: { id: book.id } })
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
  await Metadata.upsert(book)
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
    sendMessageToWebContents('Start loading library')

    const bookList = await Manga.findAll({ raw: true })
    bookList.forEach(b => b.exist = false)

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
    const listLength = list.length
    sendMessageToWebContents(`Load ${listLength} book from library`)

    for (let i = 0; i < listLength; i++) {
      try {
        const { filepath, type } = list[i]
        const foundData = bookList.find(b => b.filepath === filepath)
        if (foundData === undefined) {
          /*
          * check whether the file is the relocated only
          * return the existing data if and only if there is one match
          * */
          const existingManga = await findSameFile(filepath,type, Manga)
          if (existingManga) {
            // the file is relocated only, so no need to regenerate the cover
            foundPrevBook = bookList.find(b => b.id === existingManga.id)
            // this is necessary otherwise it will be deleted in the next step
            foundPrevBook.exist = true
            // update the Mangas table in database.sqlite
            const newCoverPath = path.join(COVER_PATH, path.basename(foundPrevBook.coverPath))
            foundPrevBook.coverPath = newCoverPath
            await Manga.update(
              { filepath: filepath, coverPath: newCoverPath },
              { where: { id: existingManga.id } }
            )
          } else {
            // this is the new file, so generate the cover
            const id = nanoid()
            const { targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash } = await geneCover(filepath, type)
            if (targetFilePath && coverPath) {
              const hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
              const newBook = {
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
              }
              await Manga.create(newBook)
              bookList.push(newBook)
            }
          }
        } else {
          foundData.exist = true
          if (isPortable) {
            const newCoverPath = path.join(COVER_PATH, path.basename(foundData.coverPath))
            if (foundData.coverPath !== newCoverPath) {
              foundData.coverPath = newCoverPath
              await Manga.update({ coverPath: newCoverPath }, { where: { id: foundData.id } })
            }
          }
        }
        if (i === 0) setProgressBar(0.05)
        if ((i + 1) % 50 === 0) {
          setProgressBar(i / listLength)
          await clearFolder(TEMP_PATH)
        }
      } catch (e) {
        sendMessageToWebContents(`Load ${list[i].filepath} failed because ${e}, ${i + 1} of ${listLength}`)
      }
    }
    await clearFolder(TEMP_PATH)

    const existData = bookList.filter(b => b.exist === true)
    try {
      const coverList = await fs.promises.readdir(COVER_PATH)
      const existCoverList = existData.map(b => b.coverPath)
      const removeCoverList = _.difference(coverList.map(p => path.join(COVER_PATH, p)), existCoverList)
      for (const coverPath of removeCoverList) {
        await fs.promises.rm(coverPath)
      }
    } catch (err) {
      console.log(err)
    }
    const removeData = bookList.filter(b => b.exist === false)
    for (const book of removeData) {
      await Manga.destroy({ where: { id: book.id } })
    }
    setProgressBar(-1)
  }
  return await loadBookListFromDatabase()
})

ipcMain.handle('force-gene-book-list', async (event, arg) => {
  await Manga.destroy({ truncate: true })
  await clearFolder(TEMP_PATH)
  await clearFolder(COVER_PATH)
  sendMessageToWebContents('Start loading library')
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
  const listLength = list.length
  sendMessageToWebContents(`Load ${listLength} book from library`)
  for (let i = 0; i < listLength; i++) {
    try {
      const { filepath, type } = list[i]
      const id = nanoid()
      const { targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash } = await geneCover(filepath, type)
      if (targetFilePath && coverPath) {
        const hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
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
      sendMessageToWebContents(`Load ${list[i].filepath} failed because ${e}, ${i + 1} of ${listLength}`)
    }
  }
  await clearFolder(TEMP_PATH)

  setProgressBar(-1)
  return await loadBookListFromDatabase()
})

ipcMain.handle('patch-local-metadata', async (event, arg) => {
  const bookList = await loadBookListFromDatabase()
  const bookListLength = bookList.length
  await clearFolder(TEMP_PATH)
  await clearFolder(COVER_PATH)

  for (let i = 0; i < bookListLength; i++) {
    try {
      const book = bookList[i]
      let { filepath, type } = book
      if (!type) type = 'archive'
      const { targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash } = await geneCover(filepath, type)
      if (targetFilePath && coverPath) {
        const hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
        _.assign(book, { type, coverPath, hash, pageCount, bundleSize, mtime: mtime.toJSON(), coverHash })
        await saveBookToDatabase(book)
      }
      if ((i + 1) % 50 === 0) await clearFolder(TEMP_PATH)
      setProgressBar(i / bookListLength)
    } catch (e) {
      sendMessageToWebContents(`Patch ${bookList[i].filepath} failed because ${e}`)
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
    const { targetFilePath, coverPath, pageCount, bundleSize, mtime, coverHash } = await geneCover(filepath, type)
    if (targetFilePath && coverPath) {
      const hash = createHash('sha1').update(fs.readFileSync(targetFilePath)).digest('hex')
      await clearFolder(TEMP_PATH)
      return Promise.resolve({ coverPath, hash, pageCount, bundleSize, mtime: mtime.toJSON(), coverHash })
    }
  } catch (e) {
    sendMessageToWebContents(`Patch ${book.filepath} failed because ${e}`)
    await clearFolder(TEMP_PATH)
    return Promise.reject()
  }
})

// Function to read the .ehviewer file
function getEhviewerDataManually(dir) {
  try {
    const filePath = path.join(dir, '.ehviewer')
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const lines = fileContent.split('\n')
      if (lines.length >= 4) {
        const gid = lines[2].trim()
        const token = lines[3].trim()
        return { gid, token }
      }
    }
    return null
  } catch (error) {
    console.error('Failed to read .ehviewer file:', error)
    return null
  }
}

ipcMain.handle('get-ehviewer-data', async (event, dir) => {
  return getEhviewerDataManually(dir)
})

ipcMain.handle('get-ex-webpage', async (event, { url, cookie }) => {
  if (setting.proxy) {
    return await fetch(url, {
      headers: {
        Cookie: cookie
      },
      agent: new HttpsProxyAgent(setting.proxy)
    })
    .then(async res => {
      const result = await res.text()
      if (!result) throw new Error('Empty response, maybe the cookie is expired')
      return result
    })
    .catch(e => {
      sendMessageToWebContents(`Get ex page failed because ${e}`)
    })
  } else {
    return await fetch(url, {
      headers: {
        Cookie: cookie
      }
    })
    .then(async res => {
      const result = await res.text()
      if (!result) throw new Error('Empty response, maybe the cookie is expired')
      return result
    })
    .catch(e => {
      sendMessageToWebContents(`Get ex page failed because ${e}`)
    })
  }
})

ipcMain.handle('post-data-ex', async (event, { url, data }) => {
  if (setting.proxy) {
    return await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
      agent: new HttpsProxyAgent(setting.proxy)
    })
    .then(res => res.text())
    .catch(e => {
      sendMessageToWebContents(`Get ex data failed because ${e}`)
    })
  } else {
    return await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.text())
    .catch(e => {
      sendMessageToWebContents(`Get ex data failed because ${e}`)
    })
  }
})

ipcMain.handle('save-book', async (event, book) => {
  return await saveBookToDatabase(book)
})

// home
ipcMain.handle('get-folder-tree', async (event, bookList) => {
  const folderList = [...new Set(bookList.map(b => path.dirname(b.filepath)))]
  const librarySplitPathsLength = setting.library.split(path.sep).length - 1
  const bookPathSplitList = folderList.sort().map(fp => fp.split(path.sep).slice(librarySplitPathsLength))
  const folderTreeObject = {}
  for (const folders of bookPathSplitList) {
    _.set(folderTreeObject, folders.map(f => '_' + f), {})
  }
  const resolveTree = (preRoot, tree, initFolder) => {
    _.forIn(tree, (node, label) => {
      const trueLabel = label.slice(1)
      if (_.isEmpty(node)) {
        preRoot.push({
          label: trueLabel,
          folderPath: [...initFolder, trueLabel].slice(1).join(path.sep),
        })
      } else {
        preRoot.push({
          label: trueLabel,
          folderPath: [...initFolder, trueLabel].slice(1).join(path.sep),
          children: resolveTree([], node, [...initFolder, trueLabel]),
        })
      }
    })
    return preRoot
  }
  return resolveTree([], folderTreeObject, [])
})

ipcMain.handle('load-collection-list', async (event, arg) => {
  return collectionList
})

ipcMain.handle('save-collection-list', async (event, list) => {
  collectionList = list
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
  const copyTempCoverPath = path.join(TEMP_PATH, nanoid(8) + path.extname(filepath))
  const coverPath = path.join(COVER_PATH, nanoid() + path.extname(filepath))
  try {
    await fs.promises.copyFile(filepath, copyTempCoverPath)
    await sharp(copyTempCoverPath, { failOnError: false })
    .resize(500, 707, {
      fit: 'contain',
      background: '#303133'
    })
    .toFile(coverPath)
    return coverPath
  } catch (e) {
    sendMessageToWebContents(`Generate cover from ${filepath} failed because ${e}`)
  }
})

ipcMain.handle('open-local-book', async (event, filepath) => {
  exec(`${setting.imageExplorer} "${filepath}"`)
})

ipcMain.handle('delete-local-book', async (event, filepath) => {
  if (filepath.startsWith(setting.library)) {
    await Manga.destroy({ where: { filepath: filepath } })
    try {
      try {
        await shell.trashItem(filepath)
      } catch {
        await fs.promises.rm(filepath, { recursive: true, force: true })
      }
    } catch (e) {
      sendMessageToWebContents(`Delete ${filepath} failed because ${e}`)
    }
  }
})

// viewer
ipcMain.handle('load-manga-image-list', async (event, book) => {
  await clearFolder(VIEWER_PATH)

  const { filepath, type, id: bookId } = book
  const list = await getImageListByBook(filepath, type)

  sendImageLock = true
  ;(async () => {
    // 384 is the default 4K screen width divided by the default number of thumbnail columns
    const thumbnailWidth = _.isFinite(screenWidth / setting.thumbnailColumn) ? Math.floor(screenWidth / setting.thumbnailColumn) : 384
    const widthLimit = _.isNumber(setting.widthLimit) ? Math.ceil(setting.widthLimit) : screenWidth
    for (let index = 1; index <= list.length; index++) {
      if (sendImageLock) {
        let imageFilepath = list[index - 1].absolutePath
        const extname = path.extname(imageFilepath)
        if (imageFilepath.search(/[%#]/) >= 0 || type === 'folder') {
          const newFilepath = path.join(VIEWER_PATH, `rename_${nanoid(8)}${extname}`)
          await fs.promises.copyFile(imageFilepath, newFilepath)
          imageFilepath = newFilepath
        }
        let { width, height } = await sharp(imageFilepath, { failOnError: false }).metadata()
        if (widthLimit !== 0 && width > widthLimit) {
          height = Math.floor(height * (widthLimit / width))
          width = widthLimit
          const resizedFilepath = path.join(VIEWER_PATH, `resized_${nanoid(8)}.jpg`)
          switch (extname) {
            case '.gif':
              break
            default:
              await sharp(imageFilepath, { failOnError: false })
                .resize({ width })
                .toFile(resizedFilepath)
              imageFilepath = resizedFilepath
              break
          }
        }
        mainWindow.webContents.send('manga-image', {
          id: `${bookId}_${index}`,
          index,
          relativePath: list[index - 1].relativePath,
          filepath: imageFilepath,
          width, height
        })
        ;(async () => {
          let thumbnailPath = path.join(VIEWER_PATH, `thumb_${nanoid(8)}.jpg`)
          switch (extname) {
            case '.gif':
              thumbnailPath = imageFilepath
              break
            default:
              await sharp(imageFilepath, { failOnError: false })
                .resize({ width: thumbnailWidth })
                .toFile(thumbnailPath)
              break
          }
          mainWindow.webContents.send('manga-thumbnail-image', {
            id: `${bookId}_${index}`,
            index,
            relativePath: list[index - 1].relativePath,
            filepath: imageFilepath,
            thumbnailPath,
          })
        })()
      }
    }
  })()

  return list
})

ipcMain.handle('release-sendimagelock', () => {
  sendImageLock = false
})

ipcMain.handle('delete-image', async (event, filename, filepath, type) => {
  return await deleteImageFromBook(filename, filepath, type)
})

// setting
ipcMain.handle('select-folder', async (event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title,
    properties: ['openDirectory']
  })
  if (!result.canceled) {
    return result.filePaths[0]
  } else {
    return undefined
  }
})

ipcMain.handle('select-file', async (event, title, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title,
    properties: ['openFile'],
    filters
  })
  if (!result.canceled) {
    return result.filePaths[0]
  } else {
    return undefined
  }
})

ipcMain.handle('load-setting', async (event, arg) => {
  return setting
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
  if (receiveSetting.enabledLANBrowsing !== setting.enabledLANBrowsing) {
    if (receiveSetting.enabledLANBrowsing) {
      enableLANBrowsing()
    } else {
      if (LANBrowsingInstance?.listening) {
        LANBrowsingInstance.close(() => {
          sendMessageToWebContents('LAN browsing closed')
        })
      }
    }
  }
  if (receiveSetting.startOnLogin !== setting.startOnLogin) {
    app.setLoginItemSettings({
      openAtLogin: receiveSetting.startOnLogin
    })
  }
  setting = receiveSetting
  return await fs.promises.writeFile(path.join(STORE_PATH, 'setting.json'), JSON.stringify(setting, null, '  '), { encoding: 'utf-8' })
})

ipcMain.handle('export-database', async (event, folder) => {
  if (folder !== STORE_PATH && folder !== setting.metadataPath) {
    await fs.promises.copyFile(path.join(STORE_PATH, 'collectionList.json'), path.join(folder, 'collectionList.json'))
    await fs.promises.copyFile(metadataSqliteFile, path.join(folder, 'metadata.sqlite'))
    return true
  } else {
    sendMessageToWebContents('Export failed because the target folder is the same as the source folder')
    return false
  }
})

ipcMain.handle('import-database', async (event, arg) => {
  const { collectionListPath, metadataSqlitePath } = arg
  await Metadata.sequelize.close()
  await fs.promises.copyFile(collectionListPath, path.join(STORE_PATH, 'collectionList.json'))
  await fs.promises.copyFile(metadataSqlitePath, metadataSqliteFile)
  app.relaunch()
  app.exit(0)
})

ipcMain.handle('import-sqlite', async (event, bookList) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'SQLite', extensions: ['sqlite'] }]
  })
  if (!result.canceled) {
    const db = await open({
      filename: result.filePaths[0],
      driver: sqlite3.Database
    })
    try {
      const re = /'/g
      const bookListLength = bookList.length
      for (let i = 0; i < bookListLength; i++) {
        const book = bookList[i]
        if (book.status !== 'tagged') {
          let metadata
          // 当book type为folder时，尝试获取.ehviewer数据
          if (book.type === 'folder') {
            const dirname = book.filepath
            const ehviewerData = getEhviewerDataManually(dirname)
            const { gid, token } = ehviewerData || {}
            if (gid && token) {
              metadata = await db.get('SELECT * FROM gallery WHERE gid = ? AND token = ?', [gid, token])
            }
          }
          if (metadata === undefined) {
            // remove file extension
            const filename = path.parse(book.title).name
            metadata = await db.get(`SELECT * FROM gallery WHERE torrents LIKE ?
                                                            OR title LIKE ?
                                                            OR title_jpn LIKE ?
                                                            OR thumb LIKE ?`,
              `%${filename}%`,
              `%${filename}%`,
              `%${filename}%`,
              `%${book.coverHash}%`
            )
          }

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


// tools

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
  const name = require('./package.json').name
  const version = require('./package.json').version
  if (title) {
    mainWindow.setTitle(name + ' ' + version + ' | ' + title)
  } else {
    mainWindow.setTitle(name + ' ' + version)
  }
})

ipcMain.handle('switch-fullscreen', async (event, arg) => {
  mainWindow.setFullScreen(!mainWindow.isFullScreen())
})

ipcMain.on('get-path-sep', async (event, arg) => {
  event.returnValue = path.sep
})


// 初始化Express
const LANBrowsing = express()
const port = 23786
const sortkey_map = {
  "date_added": {
    key: "date",
    type: "number"
  },
  "date_modified": {
    key: "mtime",
    type: "date"
  },
  "date_posted": {
    key: "posted",
    type: "number"
  },
  "size": {
    key: "bundleSize",
    type: "number"
  },
  "rating": {
    key: "rating",
    type: "number"
  },
  "read_count": {
    key: "readCount",
    type: "number"
  },
  "random": {}
}

// 设置静态文件夹
const staticFilePath = path.resolve(STORE_PATH, 'public')
fs.mkdirSync(staticFilePath, { recursive: true })
LANBrowsing.use('/static', express.static(staticFilePath))

let mangas = []
let tagTranslation = undefined

// sort
function compareItems(a, b, sortKey, ascending = false) {
  const sortConfig = sortkey_map[sortKey]
  if (!sortConfig) {
    throw new Error(`Invalid sort key: ${sortKey}`)
  }

  const { key, type } = sortConfig

  let valA = a[key]
  let valB = b[key]

  if (type === "number") {
    valA = Number(valA) || 0
    valB = Number(valB) || 0
  } else if (type === "date") {
    valA = new Date(valA).getTime() || 0
    valB = new Date(valB).getTime() || 0
  } else {
    valA = String(valA || "")
    valB = String(valB || "")
  }

  if (valA < valB) return ascending ? -1 : 1
  if (valA > valB) return ascending ? 1 : -1
  return 0
}

// 格式化标签
const formatTags = (tags) => {
  return Object.entries(tags)
    .map(([key, values]) => values.map(value => setting.showTranslation ? `${key}:${tagTranslation?.[value]?.name ?? value}` : `${key}:${value}`).join(', '))
    .join(', ')
}

ipcMain.handle('update-tag-translation', async (event, _tagTranslation) => {
  tagTranslation = _tagTranslation
})

LANBrowsing.get('/api/search', async (req, res) => {
  try {
    const filter = req.query.filter || ''
    const start = parseInt(req.query.start, 10) || 0
    const length = parseInt(req.query.length, 10) || 200
    // 默认使用阅读次数排序, 来匹配 mihon 热门不带 sortby
    let sortKey = req.query.sortby || 'read_count'
    let showAll = false
    if (sortKey.includes("_all")) {
      sortKey = sortKey.replace("_all", "")
      showAll = true
    }

    // 读取并搜索数据库
    mangas = await loadBookListFromDatabase()
    let filterMangas
    if (filter) {
      filterMangas = mangas.filter(manga => {
        return JSON.stringify(_.pick(manga, ['title', 'title_jpn', 'status', 'category', 'filepath', 'url'])).toLowerCase().includes(filter.toLowerCase())
        || formatTags(manga.tags).toLowerCase().includes(filter.toLowerCase())
      })
    } else {
      filterMangas = mangas
    }

    if (sortKey !== 'random') {
      filterMangas = filterMangas.sort((a, b) => compareItems(a, b, sortKey))
    } else {
      filterMangas = _.shuffle(filterMangas)
    }
    filterMangas = showAll ? filterMangas : filterMangas.slice(start, start + length)

    // 格式化响应数据
    const responseData = filterMangas.map(manga => ({
      arcid: manga.hash,
      extension: path.extname(manga.filepath),
      filename: path.basename(manga.filepath),
      isnew: 'true',
      lastreadtime: 0,
      pagecount: manga.pageCount,
      progress: 0,
      size: manga.filesize,
      summary: null,
      tags: manga.tags ? formatTags(manga.tags) : '',
      title: `${manga.title_jpn && manga.title ? `${manga.title_jpn} || ${manga.title}` : manga.title}`,
      url: manga.url
    }))
    const hash = createHash('md5').update(JSON.stringify(responseData)).digest('hex')
    res.json({
      data: responseData,
      hash,
      draw: 0,
      recordsFiltered: responseData.length,
      recordsTotal: filterMangas.length
    })
  } catch (error) {
    res.status(500).send(error.message)
  }
})

LANBrowsing.get('/api/search/random', async (req, res) => {
  try {
    // 从数据库中随机获取指定数量的 Manga 记录
    const count = parseInt(req.query.count, 10) || 1
    const randomMangas = _.sampleSize(await loadBookListFromDatabase(), count)

    const responseData = randomMangas.map(manga => ({
      arcid: manga.hash,
      extension: path.extname(manga.filepath),
      filename: path.basename(manga.filepath),
      isnew: 'true',
      lastreadtime: 0,
      pagecount: manga.pageCount,
      progress: 0,
      size: manga.filesize,
      summary: null,
      tags: manga.tags ? formatTags(manga.tags) : '',
      title: `${manga.title_jpn && manga.title ? `${manga.title_jpn} || ${manga.title}` : manga.title}`
    }))

    res.json({
      data: responseData
    })
  } catch (error) {
    console.error('Failed to fetch random Manga:', error)
    res.status(500).send('Internal Server Error')
  }
})

LANBrowsing.get('/api/archives/:hash/metadata', async (req, res) => {
  try {
    const mangaHash = req.params.hash

    // 从数据库找到对应的漫画
    if (_.isEmpty(mangas)) mangas = await loadBookListFromDatabase()
    const manga = await mangas.find(manga => manga.hash === mangaHash)

    if (!manga) {
      return res.status(404).send('Manga not found')
    }

    // 构造响应数据
    const responseMetadata = {
      arcid: manga.hash,
      extension: path.extname(manga.filepath),
      filename: path.basename(manga.filepath),
      isnew: 'true',
      lastreadtime: 0,
      pagecount: manga.pageCount,
      progress: 0,
      size: manga.filesize,
      summary: null,
      tags: manga.tags ? formatTags(manga.tags) : '',
      title: `${manga.title_jpn && manga.title ? `${manga.title_jpn} || ${manga.title}` : manga.title}`
    }

    res.json(responseMetadata)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

// 处理封面图片请求
LANBrowsing.get('/api/archives/:hash/thumbnail', async (req, res) => {
  const hash = req.params.hash
  const manga = await Manga.findOne({where: {hash: hash}})
  if (!manga || !manga.coverPath) {
    return res.status(404).send('Cover not found')
  }
  const coverFilePath = path.join(staticFilePath, path.basename(manga.coverPath))
  await fs.promises.copyFile(manga.coverPath, coverFilePath)
  if (fs.existsSync(coverFilePath)) {
    res.sendFile(coverFilePath)
  } else {
    res.status(404).send('Cover file not found')
  }
})

let existBook = {
  hash: null,
  imageList: []
}

// 处理章节列表请求
LANBrowsing.get('/api/archives/:hash/files', async (req, res) => {
  try {
    const mangaHash = req.params.hash

    // 从数据库找到对应的漫画
    const manga = await Manga.findOne({where: {hash: mangaHash}})

    if (!manga) {
      return res.status(404).send('Manga not found')
    }

    await clearFolder(VIEWER_PATH)
    await clearFolder(staticFilePath)
    const imageList = await getImageListByBook(manga.filepath, manga.type)

    existBook = {
      hash: manga.hash,
      imageList: imageList.map(p => p.absolutePath)
    }
    // 构造响应数据
    const responseFiles = {
      job: Date.now(), // 示例中的 job 可以是一个随机数或时间戳
      pages: imageList.map((file, index) => `/api/archives/${manga.hash}/page?path=${index + 1}`)
    }

    res.json(responseFiles)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

// 处理章节图片请求
LANBrowsing.get('/api/archives/:hash/page', async (req, res) => {
  const hash = req.params.hash
  const page = parseInt(req.query.path, 10)
  if (isNaN(page) || page < 1) {
    return res.status(400).send('Invalid page number')
  }

  const manga = await Manga.findOne({where: {hash: hash}})
  if (!manga || !manga.filepath) {
    return res.status(404).send('File not found')
  }

  // 获取章节图片列表
  try {
    let imageList
    if (manga.hash === existBook.hash) {
      imageList = existBook.imageList
    } else {
      await clearFolder(VIEWER_PATH)
      await clearFolder(staticFilePath)
      imageList = await getImageListByBook(manga.filepath, manga.type)
      imageList = imageList.map(p => p.absolutePath)
      existBook.hash = manga.hash
      existBook.imageList = imageList
    }
    const imageFilePath = imageList[page - 1]
    if (!imageFilePath) {
      return res.status(404).send('Image not found')
    }

    // 重命名并复制图片文件到静态文件夹
    const imageFileName = `${manga.hash}_${page}${path.extname(imageFilePath)}`
    const imageFile = path.join(staticFilePath, imageFileName)
    await fs.promises.copyFile(imageFilePath, imageFile)

    // 发送图片文件
    if (fs.existsSync(imageFile)) {
      res.sendFile(imageFile)
    } else {
      res.status(404).send('Image file not found')
    }
  } catch (err) {
    console.error(err)
    res.status(500).send('Error processing file')
  }
})

// 处理webview请求
LANBrowsing.get('/reader', async (req, res) => {
  const id = req.query.id
  const manga = await Manga.findOne({where: {hash: id}})

  // 重定向至manga.url
  if (manga && manga.url) {
    res.redirect(manga.url.replace('exhentai', 'e-hentai'))
  } else {
    res.status(404).send('Manga not found')
  }
})

LANBrowsing.get('/', (req, res) => {
  switch (setting.language) {
    case 'en-US':
      res.redirect('https://github.com/SchneeHertz/exhentai-manga-manager/wiki/LAN-Browsing')
      break
    case 'zh-CN':
    case 'zh-TW':
    default:
      res.redirect('https://github.com/SchneeHertz/exhentai-manga-manager/wiki/%E5%B1%80%E5%9F%9F%E7%BD%91%E6%B5%8F%E8%A7%88')
      break
  }
})

let LANBrowsingInstance
// 启动Express服务器
const enableLANBrowsing = () => {
  if (LANBrowsingInstance?.listening) {
    LANBrowsingInstance.close(() => {
      LANBrowsingInstance = LANBrowsing.listen(port, '0.0.0.0', () => {
        sendMessageToWebContents(`LAN browsing restart and listening at http://0.0.0.0:${port}`)
      })
    })
  } else {
    LANBrowsingInstance = LANBrowsing.listen(port, '0.0.0.0', () => {
      sendMessageToWebContents(`LAN browsing listening at http://0.0.0.0:${port}`)
    })
  }
}

ipcMain.handle('enable-LAN-browsing', async (event, arg) => {
  enableLANBrowsing()
})