import { defineStore } from 'pinia'
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
    sortValue: undefined,
    editCollectionView: false,
    editTagView: false,
    localeFile: null,
    folderTreeData: [],
  }),
  getters: {
    cookie: (state) => {
      return `igneous=${state.setting.igneous};ipb_pass_hash=${state.setting.ipb_pass_hash};ipb_member_id=${state.setting.ipb_member_id};star=${state.setting.star}`
    },
    pathSep: () => {
      return ipcRenderer.sendSync('get-path-sep')
    },
    displayBookCount (state) {
      if (state.sortValue === 'hidden') {
        return _.sumBy(state.displayBookList, book => book.hiddenBook ? 1 : 0)
      }
      return _.sumBy(state.displayBookList, book => this.isVisibleBook(book) ? 1 : 0)
    },
    tagList (state) {
      const uniqedTagMap = new Map()
      state.bookList.filter(b => {
        return !b.hiddenBook && !b.folderHide
      }).forEach(b => _.forEach(b.tags, (tags, cat) => {
        const tagSet = uniqedTagMap.get(cat) || uniqedTagMap.set(cat, new Set()).get(cat)
        tags.forEach(tag => tagSet.add(tag))
      }))
      const uniqedTagArray = _.flatMap(_.entries(uniqedTagMap), ([cat, tagSet]) => {
        return _.map([...tagSet], tag => `${cat}##${tag}`)
      }).sort()
      return uniqedTagArray.map(combinedTag => {
        const tagArray = _.split(combinedTag, '##')
        const letter = state.cat2letter[tagArray[0]] ? state.cat2letter[tagArray[0]] : tagArray[0]
        let labelHeader = tagArray[0]
        let labelTail = tagArray[1]
        if (state.setting.showTranslation) {
          labelHeader = tagArray[0] === 'group' ? '团队' : state.resolvedTranslation[tagArray[0]]?.name || tagArray[0]
          labelTail = state.resolvedTranslation[tagArray[1]]?.name || tagArray[1]
        }
        return {
          label: `${labelHeader}:${labelTail}`,
          value: `${letter}:"${tagArray[1]}"$`
        }
      })
    },
    tagListRaw (state) {
      const tagArray = _(state.bookList.map(b => {
        return _.map(b.tags, (tags, cat) => {
          return _.map(tags, tag => `${cat}##${tag}`)
        })
      }))
      .flattenDeep().value()
      const uniqedTagArray = [...new Set(tagArray)].sort()
      return uniqedTagArray.map(combinedTag => {
        const tagArray = _.split(combinedTag, '##')
        const letter = state.cat2letter[tagArray[0]] ? state.cat2letter[tagArray[0]] : tagArray[0]
        return {
          id: `${tagArray[0]}:${tagArray[1]}`,
          letter,
          cat: tagArray[0],
          tag: tagArray[1],
        }
      })
    },
    tagListForSelect (state) {
      if (state.setting.showTranslation) {
        return state.tagListRaw.map(({letter, cat, tag}) => {
          const labelHeader = cat === 'group' ? '团队' : state.resolvedTranslation[cat]?.name || cat
          const labelTail = state.resolvedTranslation[tag]?.name || tag
          return {
            label: `${labelHeader}:${labelTail} || ${letter}:"${tag}"$`,
            value: `${letter}:"${tag}"$`
          }
        })
      } else {
        return state.tagListRaw.map(({letter, cat, tag}) => {
          return {
            label: `${cat}:${tag} || ${letter}:"${tag}"$`,
            value: `${letter}:"${tag}"$`
          }
        })
      }
    },
    tag2cat (state) {
      const temp = {}
      const tagArray = _(state.bookList.map(b => {
        return _.map(b.tags, (tags, cat) => {
          return _.map(tags, tag => `${cat}##${tag}`)
        })
      }))
      .flattenDeep().value()
      const uniqedTagArray = [...new Set(tagArray)]
      uniqedTagArray.forEach(combinedTag => {
        const tagArray = _.split(combinedTag, '##')
        temp[tagArray[1]] = tagArray[0]
      })
      return temp
    },
    customOptions (state) {
      return _.compact(_.get(state.setting, 'customOptions', '').split('\n'))
        .map(str => ({label: str.trim(), value: str.trim().replace(/\s+(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)/g, '|||')}))
    },
    visibleChunkDisplayBookList (state) {
      return state.chunkDisplayBookList.filter(book => !book.collectionHide && (state.sortValue === 'hidden' || !book.hiddenBook) && !book.folderHide)
    },
    visibleChunkDisplayBookListForCollectView (state) {
      return state.chunkDisplayBookList.filter(book => !book.isCollection && !book.folderHide && !book.hiddenBook)
    },
    visibleChunkDisplayBookListForEditTagView (state) {
      return state.chunkDisplayBookList.filter(book => !book.isCollection && !book.folderHide)
    },
  },
  actions: {
    isBook (book) {
      // isCollection mean book is collection
      return !book.isCollection
    },
    isVisibleBook (book) {
      // folderHide mean book hide by not selecting at folder tree
      // collectionHide mean book hide because book in collection
      // hiddenBook mean book hide by user operation
      return !book.folderHide && !book.collectionHide && !book.hiddenBook
    },
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
    returnTrimFileName (book) {
      const fileNameWithExtension = this.returnFileNameWithExt(book.filepath)
      let fileNameWithoutExtension = fileNameWithExtension
      try {
        if (book.type !== 'folder') {
          fileNameWithoutExtension = fileNameWithExtension.split('.').slice(0, -1).join('.')
        }
        if (this.setting.trimTitleRegExp) {
          fileNameWithoutExtension = fileNameWithoutExtension.replace(new RegExp(this.setting.trimTitleRegExp, 'g'), '')
        }
        if (this.setting.searchKeySuffix) {
          fileNameWithoutExtension = fileNameWithoutExtension + ' ' + this.setting.searchKeySuffix
        }
      } catch (e) {
        console.log(e)
      }
      return fileNameWithoutExtension
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
    async resetMetadata (book) {
      book.title = this.returnFileName(book)
      book.title_jpn = null
      book.posted = null
      book.filecount = null
      book.rating = null
      book.filesize = null
      book.category = null
      book.tags = {}
      book.status = 'non-tag'
      book.url = null
      await this.saveBook(book)
    },
    saveBook (book) {
      return ipcRenderer.invoke('save-book', _.cloneDeep(book))
    },
    async switchMark (book) {
      book.mark = !book.mark
      await this.saveBook(book)
    },
    isChineseTranslatedManga (book) {
      return _.includes(book?.tags?.language, 'chinese') ? true : false
    },
    copyTagClipboard (book) {
      ipcRenderer.invoke('copy-text-to-clipboard', JSON.stringify(_.pick(book, ['tags', 'status', 'category'])))
    },
    async pasteTagClipboard (book) {
      const text = await ipcRenderer.invoke('read-text-from-clipboard')
      _.assign(book, JSON.parse(text))
      await this.saveBook(book)
    },
    filterFolderMethod (node, keyword) {
      if (!keyword) return true
      const label = node.text || node.label || ''
      return label.toLowerCase().includes(keyword.toLowerCase())
    },
  }
})