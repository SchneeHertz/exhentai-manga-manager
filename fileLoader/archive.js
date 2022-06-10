const fs = require('fs')
const path = require('path')
const glob = require('glob')
const { promisify } = require('util')
const { nanoid } = require('nanoid')
const { spawn } = require('child_process')

const _7z = path.join(process.cwd(), 'resources/extraResources/7z.exe')

let getArchivelist = async (libraryPath)=>{
  let list = await promisify(glob)('**/*.@(rar|7z)', {
    cwd: libraryPath,
    nocase: true
  })
  list = list.map(filepath=>path.join(libraryPath, filepath))
  return list
}

let solveBookTypeArchive = async (filepath, TEMP_PATH, COVER_PATH)=>{
  let tempFolder = path.join(TEMP_PATH, nanoid())
  await spawnPromise(_7z, ['x', filepath, '-o' + tempFolder])
  let imageList = await promisify(glob)('**/*.@(jpg|jpeg|png|gif|webp|avif)', {
    cwd: tempFolder,
    nocase: true
  })
  imageList = imageList.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}))
  let targetFile
  let targetFilePath
  let tempCoverPath
  let coverPath
  if (imageList.length > 8) {
    targetFile = imageList[7]
  } else {
    targetFile = imageList[0]
  }
  targetFilePath = path.join(TEMP_PATH, nanoid() + path.extname(targetFile))
  await fs.promises.copyFile(path.join(tempFolder, targetFile), targetFilePath)

  tempCoverPath = path.join(TEMP_PATH, nanoid() + path.extname(imageList[0]))
  await fs.promises.copyFile(path.join(tempFolder, imageList[0]), tempCoverPath)

  coverPath = path.join(COVER_PATH, nanoid() + path.extname(imageList[0]))

  return {targetFilePath, tempCoverPath, coverPath}
}

let getImageListFromArchive = async (filepath, VIEWER_PATH)=>{
  await spawnPromise(_7z, ['x', filepath, '-o' + VIEWER_PATH])
  let list = await promisify(glob)('**/*.@(jpg|jpeg|png|gif|webp|avif)', {
    cwd: VIEWER_PATH,
    nocase: true
  })
  list = list.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).map(f=>path.join(VIEWER_PATH, f))
  return list
}

let spawnPromise = (commmand, argument)=>{
  return new Promise((resolve, reject)=>{
    const spawned = spawn(commmand, argument)
    spawned.on('error', data=>{
      reject(data)
    })
    spawned.on('exit', code=>{
      if (code === 0) {
        return resolve()
      }
      return reject('close code is ' + code)
    })
  })
}

module.exports = {
  getArchivelist,
  solveBookTypeArchive,
  getImageListFromArchive
}