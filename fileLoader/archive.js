const fs = require('fs')
const path = require('path')
const { globSync } = require('glob')
const { nanoid } = require('nanoid')
const { spawn } = require('child_process')
const _ = require('lodash')
const { getRootPath, naturalSort } = require('../modules/utils.js')

const _7z = path.join(getRootPath(), 'resources/extraResources/7z.exe')

const getArchivelist = async (libraryPath) => {
  const list = globSync('**/*.@(rar|7z|cb7|cbr)', {
    cwd: libraryPath,
    nocase: true,
    nodir: true,
    follow: true,
    absolute: true
  })
  return list
}

const solveBookTypeArchive = async (filepath, TEMP_PATH, COVER_PATH) => {
  const tempFolder = path.join(TEMP_PATH, nanoid(8))
  const output = await spawnPromise(_7z, ['l', filepath, '-slt', '-sccUTF-8', '-p123456'])
  let pathlist = _.filter(output.split(/\r\n/), s => _.startsWith(s, 'Path') && !_.includes(s, '__MACOSX'))
  pathlist = pathlist.map(p => {
    const match = /(?<== ).*$/.exec(p)
    return match ? match[0] : ''
  })
  let imageList = _.filter(pathlist, p => ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(path.extname(p).toLowerCase()))
  imageList = await naturalSort(imageList)

  let targetFile
  let targetFilePath
  let coverFile
  let tempCoverPath
  let coverPath
  if (imageList.length > 8) {
    targetFile = imageList[7]
    coverFile = imageList[0]
    await spawnPromise(_7z, ['x', '-o'+tempFolder, '-p123456', '--', filepath, targetFile])
    await spawnPromise(_7z, ['x', '-o'+tempFolder, '-p123456', '--', filepath, coverFile])
  } else if (imageList.length > 0) {
    targetFile = imageList[0]
    coverFile = imageList[0]
    await spawnPromise(_7z, ['x', '-o'+tempFolder, '-p123456', '--', filepath, targetFile])
  } else {
    throw new Error('compression package isnot include image')
  }
  targetFilePath = path.join(TEMP_PATH, nanoid(8) + path.extname(targetFile))
  await fs.promises.copyFile(path.join(tempFolder, targetFile), targetFilePath)

  tempCoverPath = path.join(TEMP_PATH, nanoid(8) + path.extname(coverFile))
  await fs.promises.copyFile(path.join(tempFolder, coverFile), tempCoverPath)

  coverPath = path.join(COVER_PATH, nanoid() + '.webp')

  const fileStat = await fs.promises.stat(filepath)
  return {targetFilePath, tempCoverPath, coverPath, pageCount: imageList.length, bundleSize: fileStat?.size, mtime: fileStat?.mtime}
}

const getImageListFromArchive = async (filepath, VIEWER_PATH) => {
  const tempFolder = path.join(VIEWER_PATH, nanoid(8))
  await spawnPromise(_7z, ['x', filepath, '-o' + tempFolder, '-p123456'], 2 * 60 * 1000)
  let list = globSync('**/*.@(jpg|jpeg|png|webp|avif|gif)', {
    cwd: tempFolder,
    nocase: true
  })
  list = _.filter(list, s => !_.includes(s, '__MACOSX'))
  list = await naturalSort(list)
  return list.map(f => ({
    relativePath: f,
    absolutePath: path.join(tempFolder, f)
  }))
}

const deleteImageFromArchive = async (filename, filepath) => {
  await spawnPromise(_7z, ['d', '-p123456', '--', filepath, filename])
  return true
}

const spawnPromise = (commmand, argument, timeoutMs = 30 * 1000) => {
  return new Promise((resolve, reject) => {
    const spawned = spawn(commmand, argument)
    const output = []
    const timeout = setTimeout(() => {
      spawned.kill()
      reject('7z return timeout')
    }, timeoutMs) // 默认30s超时

    spawned.on('error', data => {
      clearTimeout(timeout)
      reject(data)
    })
    spawned.on('exit', code => {
      clearTimeout(timeout)
      if (code === 0) {
        setTimeout(() => resolve(String(output)), 50)
      } else {
        reject('close code is ' + code)
      }
    })
    spawned.stdout.on('data', data => {
      output.push(data)
    })
  })
}

module.exports = {
  getArchivelist,
  solveBookTypeArchive,
  getImageListFromArchive,
  deleteImageFromArchive
}