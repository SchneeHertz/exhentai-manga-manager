const { Sequelize, DataTypes} = require('sequelize')
const path = require('node:path')
const { app } = require('electron')

let STORE_PATH
try {
  fs.accessSync(path.join(process.cwd(), 'portable'))
  STORE_PATH = process.cwd()
} catch {
  STORE_PATH = app.getPath('userData')
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(STORE_PATH, './database.sqlite'),
  logging: false
})

const Manga = sequelize.define('Manga', {
  id: {
    type: DataTypes.TEXT,
    allowNull: false,
    primaryKey: true
  },
  title: DataTypes.TEXT,
  coverPath: DataTypes.TEXT,
  hash: DataTypes.TEXT,
  filepath: DataTypes.TEXT,
  type: DataTypes.TEXT,
  pageCount: DataTypes.INTEGER,
  bundleSize: DataTypes.INTEGER,
  mtime: DataTypes.TEXT,
  coverHash: DataTypes.TEXT,
  status: DataTypes.TEXT,
  date: DataTypes.INTEGER,
  rating: DataTypes.FLOAT,
  tags: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  title_jpn: DataTypes.TEXT,
  filecount: DataTypes.INTEGER,
  posted: DataTypes.INTEGER,
  filesize: DataTypes.INTEGER,
  category: DataTypes.TEXT,
  url: DataTypes.TEXT,
  mark: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  exist: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
})

;(async()=>{
  await Manga.sync({ alter: true })
})()

module.exports = {
  Manga
}