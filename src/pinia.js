import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash'
import { ElMessage } from 'element-plus'

export const useAppStore = defineStore('appStore', {
  state: () => ({
    cat2letter: {
      language: 'l',
      parody: 'p',
      character: 'c',
      group: 'g',
      artist: 'a',
      female: 'f',
      male: 'm',
      mixed: 'x',
      other: 'o',
      cosplayer: 'cos'
    },
    keyMap: {
      normal: {
        next: 'ArrowRight',
        prev: 'ArrowLeft',
        click: 1
      },
      reverse: {
        next: 'ArrowLeft',
        prev: 'ArrowRight',
        click: -1
      }
    },
    statusOption: [
      'non-tag',
      'tagged',
      'tag-failed'
    ],
    categoryOption: [
      'Doujinshi',
      'Manga',
      'Artist CG',
      'Game CG',
      'Non-H',
      'Image Set',
      'Western',
      'Cosplay',
      'Asian Porn',
      'Misc',
    ],
    searchTypeList: [
      { label: "exhentai(sha1)", value: "exhentai" },
      { label: "e-hentai(sha1)", value: "e-hentai" },
      { label: "exhentai(keyword)", value: "exsearch" },
      { label: "e-hentai(keyword)", value: "e-search" },
      { label: "hentag(keyword)", value: "hentag" },
      { label: "exhentai(.ehviewer file from EhViewer)", value: ".ehviewer" },
    ],
    setting: {},
    bookDetail: {},
    resolvedTranslation: {},
    bookList: [],
    displayBookList: [],
    chunkDisplayBookList: [],
    collectionList: [],
    openCollectionBookList: [],
    serviceAvailable: true,
  }),
  getters: {
    cookie: (state) => {
      return `igneous=${state.setting.igneous};ipb_pass_hash=${state.setting.ipb_pass_hash};ipb_member_id=${state.setting.ipb_member_id};star=${state.setting.star}`
    },
    pathSep: () => {
      return ipcRenderer.sendSync('get-path-sep')
    },
  },
  actions: {
    printMessage(type, msg) {
      ElMessage.closeAll()
      ElMessage[type]({
        message: msg,
        offset: 50
      })
    },
    returnFileNameWithExt (filepath) {
      return filepath.split(/[/\\]/).pop()
    },
    returnFileName (book) {
      const fileNameWithExtension = this.returnFileNameWithExt(book.filepath)
      if (book.type === 'folder') return fileNameWithExtension
      return fileNameWithExtension.split('.').slice(0, -1).join('.')
    },
    getDisplayTitle (book) {
      switch (this.setting.displayTitle) {
        case 'englishTitle':
          return book.title
        case 'japaneseTitle':
          return book.title_jpn || book.title
        case 'filename':
          return this.returnFileName(book)
        default:
          return book.title_jpn || book.title || this.returnFileName(book)
      }
    },
    saveBook (book) {
      return ipcRenderer.invoke('save-book', cloneDeep(book))
    },
    async switchMark (book) {
      book.mark = !book.mark
      await this.saveBook(book)
    },
  }
})