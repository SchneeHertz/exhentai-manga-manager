const path = require('path')
const { globIterate, globSync } = require('glob')
const { nanoid } = require('nanoid')
const { readdir, stat } = require('fs/promises')
const { shell } = require('electron')

const dirSize = async dir => {
  const files = await readdir(dir, { withFileTypes: true })
  const filesize = files.map(async file => {
    const filepath = path.join(dir, file.name)
    if (file.isFile()) {
      const { size } = await stat(filepath)
      return size
    }
    return 0
  })
  return (await Promise.all(filesize)).flat(Infinity).reduce((i, size) => i + size, 0)
}

let getFolderlist = async (libraryPath)=>{
  let imageList = globIterate('**/*.@(jpg|jpeg|png|webp|avif|gif)', {
    cwd: libraryPath,
    nocase: true,
    follow: true,
    absolute: true
  })
  let list = new Set()
  for await (image of imageList) {
    list.add(path.dirname(image))
  }
  list = [...list]
  return list
}

let solveBookTypeFolder = async (folderpath, TEMP_PATH, COVER_PATH)=>{
  let list = globSync('*.@(jpg|jpeg|png|webp|avif|gif)', {
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
  let fileStat = await stat(folderpath)
  let bundleSize = await dirSize(folderpath)
  return {targetFilePath, tempCoverPath, coverPath, pageCount: list.length, bundleSize, mtime: fileStat?.mtime}
}

let getImageListFromFolder = async (folderpath, VIEWER_PATH)=>{
  let list = globSync('*.@(jpg|jpeg|png|webp|avif|gif)', {
    cwd: folderpath,
    nocase: true
  })
  list = list.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).map(f=>path.join(folderpath, f))
  return list
}

let deleteImageFromFolder = async (filename, folderpath) => {
  let filepath = path.join(folderpath, filename)
  await shell.trashItem(filepath)
  return true
}

module.exports = {
  getFolderlist,
  solveBookTypeFolder,
  getImageListFromFolder,
  deleteImageFromFolder
}