const path = require('path')
const glob = require('glob')
const { promisify } = require('util')
const { nanoid } = require('nanoid')
const _ = require('lodash')

let getFolderlist = async (libraryPath)=>{
  let imageList = await promisify(glob)('**/*.@(jpg|jpeg|png|webp|avif)', {
    cwd: libraryPath,
    nocase: true
  })
  let list = _.sortedUniq(_.sortBy(imageList.map(filepath=>path.dirname(filepath))))
  list = list.map(filepath=>path.join(libraryPath, filepath))
  return list
}

let solveBookTypeFolder = async (folderpath, TEMP_PATH, COVER_PATH)=>{
  let list = await promisify(glob)('*.@(jpg|jpeg|png|webp|avif)', {
    cwd: folderpath,
    nocase: true
  })
  list = list.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).map(f=>path.join(folderpath, f))
  let targetFilePath
  if (list.length > 8) {
    targetFilePath = list[7]
  } else {
    targetFilePath = list[0]
  }
  let tempCoverPath = list[0]
  let coverPath = path.join(COVER_PATH, nanoid() + '.webp')
  return {targetFilePath, tempCoverPath, coverPath, pageCount: list.length}
}

let getImageListFromFolder = async (folderpath, VIEWER_PATH)=>{
  let list = await promisify(glob)('*.@(jpg|jpeg|png|webp|avif)', {
    cwd: folderpath,
    nocase: true
  })
  list = list.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).map(f=>path.join(folderpath, f))
  return list
}

module.exports = {
  getFolderlist,
  solveBookTypeFolder,
  getImageListFromFolder
}