const fs = require('fs')
const path = require('path')
const glob = require('glob')
const {promisify} = require('util')
const AdmZip = require('adm-zip')
const { nanoid } = require('nanoid')
const _ = require('lodash')

let getZipFilelist = async (libraryPath)=>{
  let list = await promisify(glob)('**/*.zip', {
    cwd: libraryPath,
    nocase: true
  })
  list = list.map(filepath=>path.join(libraryPath, filepath))
  return list
}

let solveBookTypeZip = async (filepath, TEMP_PATH, COVER_PATH)=>{
  let zip = new AdmZip(filepath)
  let zipFileList = zip.getEntries()
  let targetFile
  let targetFilePath
  let tempCoverPath
  let coverPath
  let tempFolder = path.join(TEMP_PATH, nanoid())
  let findZFile = (entryName)=>{
    return _.find(zipFileList, zFile=>zFile.entryName == entryName)
  }
  let fileList = zipFileList.map(zFile=>zFile.entryName)
  let imageList = _.filter(fileList, filepath=>_.includes(['.jpg', ',jpeg', '.png', '.gif', '.webp', '.avif'], path.extname(filepath).toLowerCase()))
  imageList = imageList.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}))

  if (imageList.length > 8) {
    targetFile = imageList[7]
    zip.extractEntryTo(findZFile(targetFile), tempFolder, true, true)
    zip.extractEntryTo(findZFile(imageList[0]), tempFolder, true, true)
  } else {
    targetFile = imageList[0]
    zip.extractEntryTo(findZFile(imageList[0]), tempFolder, true, true)
  }

  targetFilePath = path.join(TEMP_PATH, nanoid() + path.extname(targetFile))
  await fs.promises.copyFile(path.join(tempFolder, targetFile), targetFilePath)
  
  tempCoverPath = path.join(TEMP_PATH, nanoid() + path.extname(imageList[0]))
  await fs.promises.copyFile(path.join(tempFolder, imageList[0]), tempCoverPath)

  coverPath = path.join(COVER_PATH, nanoid() + path.extname(imageList[0]))

  return {targetFilePath, tempCoverPath, coverPath}


  // if (zipFileList[0].isDirectory) {
  //   zip.extractEntryTo(zipFileList[0], TEMP_PATH)
  //   let subFileList = await fs.promises.readdir(path.join(TEMP_PATH, zipFileList[0].entryName))
  //   subFileList = subFileList.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}))
  //   if (subFileList.length > 8) {
  //     targetFile = subFileList[7]
  //   } else {
  //     targetFile = subFileList[0]
  //   }
  //   targetFilePath = path.join(TEMP_PATH, nanoid() + path.extname(targetFile))
  //   await fs.promises.copyFile(path.join(TEMP_PATH, zipFileList[0].entryName, targetFile), targetFilePath)
  //   tempCoverPath = path.join(TEMP_PATH, nanoid() + path.extname(subFileList[0]))
  //   await fs.promises.copyFile(path.join(TEMP_PATH, zipFileList[0].entryName, subFileList[0]), tempCoverPath)

  //   await fs.promises.rm(path.join(TEMP_PATH, zipFileList[0].entryName), {recursive: true})
  //   coverPath = path.join(COVER_PATH, nanoid() + path.extname(subFileList[0]))
  // } else {
  //   zipFileList = zipFileList.sort((a,b)=>a.entryName.localeCompare(b.entryName, undefined, {numeric: true, sensitivity: 'base'}))
  //   if (zipFileList.length > 8) {
  //     targetFile = zipFileList[7]
  //   } else {
  //     targetFile = zipFileList[0]
  //   }
  //   zip.extractEntryTo(targetFile, TEMP_PATH)
  //   targetFilePath = path.join(TEMP_PATH, nanoid() + path.extname(targetFile.entryName))
  //   await fs.promises.rename(path.join(TEMP_PATH, targetFile.entryName), targetFilePath)
  //   zip.extractEntryTo(zipFileList[0], TEMP_PATH)
  //   tempCoverPath = path.join(TEMP_PATH, nanoid() + path.extname(zipFileList[0].entryName))
  //   await fs.promises.rename(path.join(TEMP_PATH, zipFileList[0].entryName), tempCoverPath)
  //   coverPath = path.join(COVER_PATH, nanoid() + path.extname(zipFileList[0].entryName))
  // }

  // return {targetFilePath, tempCoverPath, coverPath}
}

let getImageListFromZip = async (filepath, VIEWER_PATH)=>{
  let zip = new AdmZip(filepath)
  zip.extractAllTo(VIEWER_PATH, true)
  let list = await promisify(glob)('**/*.@(jpg|jpeg|png|gif|webp|avif)', {
    cwd: VIEWER_PATH,
    nocase: true
  })
  list = list.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).map(f=>path.join(VIEWER_PATH, f))
  return list
}

module.exports = {
  getZipFilelist,
  solveBookTypeZip,
  getImageListFromZip
}