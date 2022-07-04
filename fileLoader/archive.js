const fs = require('fs')
const path = require('path')
const glob = require('glob')
const { promisify } = require('util')
const { nanoid } = require('nanoid')
const { spawn } = require('child_process')
const _ = require('lodash')
const iconv = require('iconv-lite')

const _7z = path.join(process.cwd(), 'resources/extraResources/7z.exe')

let getArchivelist = async (libraryPath)=>{
  let list = await promisify(glob)('**/*.@(rar|7z|zip|cbz|cb7|cbr)', {
    cwd: libraryPath,
    nocase: true
  })
  list = list.map(filepath=>path.join(libraryPath, filepath))
  return list
}

let solveBookTypeArchive = async (filepath, TEMP_PATH, COVER_PATH)=>{
  let tempFolder = path.join(TEMP_PATH, nanoid())
  let output = await spawnPromise(_7z, ['l', filepath, '-slt'])
  let pathlist = _.filter(output.split(/\r\n/), s=>_.startsWith(s, 'Path') && !_.includes(s, '__MACOSX'))
  pathlist = pathlist.map(p=>{
    let match = /(?<== ).*$/.exec(p)
    return match ? match[0] : ''
  })
  let imageList = _.filter(pathlist, p=>['.jpg','.jpeg','.png','.gif','.webp','.avif'].includes(path.extname(p).toLowerCase()))
  imageList = imageList.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}))
  let targetFile
  let targetFilePath
  let tempCoverPath
  let coverPath
  if (imageList.length > 8) {
    targetFile = imageList[7]
    await spawnPromise(_7z, ['x', filepath, '-o'+tempFolder, targetFile])
    await spawnPromise(_7z, ['x', filepath, '-o'+tempFolder, imageList[0]])
  } else {
    targetFile = imageList[0]
    await spawnPromise(_7z, ['x', filepath, '-o'+tempFolder, imageList[0]])
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
  list = _.filter(list, s=>!_.includes(s, '__MACOSX'))
  list = list.sort((a,b)=>a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).map(f=>path.join(VIEWER_PATH, f))
  return list
}

let spawnPromise = (commmand, argument)=>{
  return new Promise((resolve, reject)=>{
    const spawned = spawn(commmand, argument)
    let output = []
    spawned.on('error', data=>{
      reject(data)
    })
    spawned.on('exit', code=>{
      if (code === 0) {
        return resolve(output.join('\r\n'))
      }
      return reject('close code is ' + code)
    })
    spawned.stdout.on('data', data=>{
      output.push(iconv.decode(data, 'gbk'))
    })
  })
}

module.exports = {
  getArchivelist,
  solveBookTypeArchive,
  getImageListFromArchive
}