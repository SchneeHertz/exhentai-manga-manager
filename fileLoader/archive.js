const fs = require('fs')
const path = require('path')
const glob = require('glob')
const { promisify } = require('util')
const { nanoid } = require('nanoid')
const _ = require('lodash')


let getArchivelist = async (libraryPath)=>{
  let list = await promisify(glob)('**/*.@(rar|7z)', {
    cwd: libraryPath,
    nocase: true
  })
  list = list.map(filepath=>path.join(libraryPath, filepath))
  return list
}

let solveBookTypeArchive = async (filepath, TEMP_PATH, COVER_PATH)=>{
  const {unpack} = await import('node-unar')
  let tempFolder = path.join(TEMP_PATH, nanoid())
  await unpack(filepath, tempFolder, {forceOverwrite: true})
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
  const {unpack} = await import('node-unar')
  await unpack(filepath, VIEWER_PATH)
  let list = await promisify(glob)('**/*.@(jpg|jpeg|png|gif|webp|avif)', {
    cwd: VIEWER_PATH,
    nocase: true
  })
  list = list.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).map(f=>path.join(VIEWER_PATH, f))
  return list
}

module.exports = {
  getArchivelist,
  solveBookTypeArchive,
  getImageListFromArchive
}