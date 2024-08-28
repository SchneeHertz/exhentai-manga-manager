const { Sequelize, DataTypes } = require('sequelize')

const prepareMangaModel = (databasePath) => {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: databasePath,
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
    hiddenBook: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    readCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    exist: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  })
  return Manga
}

const prepareMetadataModel = (databasePath) => {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: databasePath,
    logging: false
  })
  const Metadata = sequelize.define('Metadata', {
    hash: {
      type: DataTypes.TEXT,
      allowNull: false,
      primaryKey: true
    },
    title: DataTypes.TEXT,
    status: DataTypes.TEXT,
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
  })
  return Metadata
}

module.exports = {
  prepareMangaModel,
  prepareMetadataModel
}