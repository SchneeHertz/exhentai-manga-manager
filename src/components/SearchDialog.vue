<template>
  <el-dialog v-model="dialogVisibleEhSearch"
    width="60vw"
    :title="$t('m.search')"
    destroy-on-close
    class="dialog-search"
  >
    <el-form :inline="true">
      <el-form-item>
        <el-input
          v-model="searchStringDialog"
          @keyup.enter="getBookListFromWeb(bookDetail.hash.toUpperCase(), searchStringDialog, searchTypeDialog, bookDetail.filepath)"
          class="search-input"
        >
          <template #append>
            <el-select class="search-type-select" v-model="searchTypeDialog">
              <el-option v-for="searchType in searchTypeList" :key="searchType.value" :label="searchType.label" :value="searchType.value" />
            </el-select>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary" plain :icon="Search32Filled"
          @click="getBookListFromWeb(bookDetail.hash.toUpperCase(), searchStringDialog, searchTypeDialog, bookDetail.filepath)"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary" plain :icon="Link"
          @click="redirectSearch(bookDetail.hash.toUpperCase(), searchStringDialog, searchTypeDialog)"
        />
      </el-form-item>
    </el-form>
    <div v-loading="searchResultLoading">
      <div class="search-result" v-if="ehSearchResultList.length > 0">
        <p
          v-for="result in ehSearchResultList"
          :key="result.url"
          @click="resolveSearchResult(bookDetail.id, result.url, result.type)"
          class="search-result-ind"
        >{{result.title}}</p>
      </div>
      <el-empty v-else :description="$t('m.noResults')" :image-size="100" />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Search32Filled } from '@vicons/fluent'
import { Link } from '@element-plus/icons-vue'
import he from 'he'

import { storeToRefs } from 'pinia'
import { useAppStore } from '../pinia.js'
const appStore = useAppStore()
const {
  searchTypeList, categoryOption,
  setting, bookList, serviceAvailable,
  cookie, tag2cat
} = storeToRefs(appStore)
const { printMessage, returnTrimFileName, saveBook } = appStore

const { t } = useI18n()

const dialogVisibleEhSearch = ref(false)
const searchResultLoading = ref(false)
const searchStringDialog = ref('')
const searchTypeDialog = ref('')
const ehSearchResultList = ref([])
const bookDetail = ref({})

const openSearchDialog = (book, server) => {
  if (!searchTypeDialog.value) searchTypeDialog.value = setting.value.defaultScraper || 'exhentai'
  dialogVisibleEhSearch.value = true
  bookDetail.value = _.cloneDeep(book)
  if (server) searchTypeDialog.value = server
  ehSearchResultList.value = []
  searchStringDialog.value = returnTrimFileName(bookDetail.value)
  getBookListFromWeb(bookDetail.value.hash.toUpperCase(), searchStringDialog.value, searchTypeDialog.value, bookDetail.value.filepath)
}



const resolveSearchResult = (bookId, url, type) => {
  const book = _.find(bookList.value, {id: bookId})
  if (type === 'hentag') {
    book.url = url
    getBookInfoFromHentag(book)
  } else if (type === 'e-hentai') {
    book.url = url
    getBookInfoFromEh(book)
  }
  dialogVisibleEhSearch.value = false
}
const getBookInfoFromHentag = async (book) => {
  const data = await fetch(`https://hentag.com/public/api/vault/${book.url.slice(25)}`).then(res => res.json())
  const tags = {}
  data.language === 11 ? tags['language'] = ['chinese','translated'] : ''
  data.parodies.length > 0 ? tags['parody'] = data.parodies.map(parody => parody.name) : ''
  data.characters.length > 0 ? tags['character'] = data.characters.map(character => character.name) : ''
  data.circles.length > 0 ? tags['group'] = data.circles.map(circle => circle.name) : ''
  data.artists.length > 0 ? tags['artist'] = data.artists.map(artist => artist.name) : ''
  data.maleTags.length > 0 ? tags['male'] = data.maleTags.map(maleTag => maleTag.name) : ''
  data.femaleTags.length > 0 ? tags['female'] = data.femaleTags.map(femaleTag => femaleTag.name) : ''
  if (data.otherTags.length > 0) {
    data.otherTags.forEach(({ name }) => {
      const cat = tag2cat.value[name]
      if (cat) {
        if (tags[cat]) {
          tags[cat].push(name)
        } else {
          tags[cat] = [name]
        }
      } else {
        if (tags['misc']) {
          tags['misc'].push(name)
        } else {
          tags['misc'] = [name]
        }
      }
    })
  }
  _.assign(book, {
    title: data.title,
    posted: Math.floor(data.createdAt / 1000),
    category: categoryOption.value[data.category],
    tags
  })
  book.status = 'tagged'
  await saveBook(book)
}
const getBookInfoFromEh = async (book) => {
  const match = /(\d+)\/([a-z0-9]+)/.exec(book.url)
  const res = await ipcRenderer.invoke('post-data-ex', {
    url: 'https://api.e-hentai.org/api.php',
    data: {
      'method': 'gdata',
      'gidlist': [
          [+match[1], match[2]]
      ],
      'namespace': 1
    }
  })
  try {
    _.assign(
      book,
      _.pick(JSON.parse(res).gmetadata[0], ['tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category']),
    )
    book.posted = +book.posted
    book.filecount = +book.filecount
    book.rating = +book.rating
    book.title = he.decode(book.title)
    book.title_jpn = he.decode(book.title_jpn)
    const tagObject = _.groupBy(book.tags, tag => {
      const result = /(.+):/.exec(tag)
      if (result) {
        return /(.+):/.exec(tag)[1]
      } else {
        return 'misc'
      }
    })
    _.forIn(tagObject, (arr, key) => {
      tagObject[key] = arr.map(tag => {
        const result = /:(.+)$/.exec(tag)
        if (result) {
          return /:(.+)$/.exec(tag)[1]
        } else {
          return tag
        }
      })
    })
    book.tags = tagObject
    book.status = 'tagged'
    await saveBook(book)
  } catch (e) {
    console.log(e)
    if (_.includes(res, 'Your IP address has been')) {
      book.status = 'non-tag'
      printMessage('error', t('c.ipBanned'))
      await saveBook(book)
      serviceAvailable.value = false
    } else {
      book.status = 'tag-failed'
      printMessage('error', t('c.getMetadataFailed'))
      await saveBook(book)
    }
  }
}
const getBookInfo = (book) => {
  if (book.url.startsWith('https://hentag.com')) {
    getBookInfoFromHentag(book)
  } else if (book.url.includes('exhentai') || book.url.includes('e-hentai')) {
    getBookInfoFromEh(book)
  }
}
const getBooksMetadata = async (bookList, gap, callback) => {
  const server = setting.value.defaultScraper || 'exhentai'
  serviceAvailable.value = true
  const timer = ms => new Promise(res => setTimeout(res, ms))
  const messageInstance = ElMessage({
    message: t('c.gettingMetadata'),
    type: 'success',
    duration: 0,
    showClose: true,
    onClose: () => {
      serviceAvailable.value = false
    }
  })
  for (let i = 0; i < bookList.length; i++) {
    ipcRenderer.invoke('set-progress-bar', (i + 1) / bookList.length)
    const book = bookList[i]
    try {
      if (serviceAvailable.value) {
        if (!book.url) {
          const resultList = await getBookListFromWeb(
            book.hash.toUpperCase(),
            returnTrimFileName(book),
            server,
            book.filepath
          )
          resolveSearchResult(book.id, resultList[0].url, resultList[0].type)
        } else {
          getBookInfo(book)
        }
        await timer(gap)
      }
    } catch (error) {
      book.status = 'tag-failed'
      await saveBook(book)
      console.error(error)
    }
  }
  messageInstance.close()
  ipcRenderer.invoke('set-progress-bar', -1)
  printMessage('success', t('c.getMetadataComplete'))
  callback()
}

const getBookListFromWeb = async (bookHash, title, server = 'e-hentai', bookPath = '') => {
  let resultList = []
  searchResultLoading.value = true
  if (server === 'e-hentai') {
    resultList = await fetch(`https://e-hentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`)
    .then(res => res.text())
    .then(res => {
      return resolveEhentaiResult(res)
    })
  } else if (server === 'exhentai') {
    resultList = await ipcRenderer.invoke('get-ex-webpage', {
      url: `https://exhentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`,
      cookie: cookie.value
    })
    .then(res => {
      return resolveEhentaiResult(res)
    })
  } else if (server === 'e-search') {
    resultList = await fetch(`https://e-hentai.org/?f_search=${encodeURI(title)}&f_cats=161`)
    .then(res => res.text())
    .then(res => {
      return resolveEhentaiResult(res)
    })
  } else if (server === 'exsearch') {
    resultList = await ipcRenderer.invoke('get-ex-webpage', {
      url: `https://exhentai.org/?f_search=${encodeURI(title)}&f_cats=161`,
      cookie: cookie.value
    })
    .then(res => {
      return resolveEhentaiResult(res)
    })
  } else if (server === 'hentag') {
    resultList = await fetch(`https://hentag.com/public/api/vault-search?t=${encodeURI(title)}`)
    .then(res => res.json())
    .then(res => {
      return resolveHentagResult(res)
    })
  } else if (server === '.ehviewer') {
    const ehviewerData = await ipcRenderer.invoke('get-ehviewer-data', bookPath)

    ehSearchResultList.value = []
    if (ehviewerData) {
      resultList = [{
        title,
        url: `https://exhentai.org/g/${ehviewerData.gid}/${ehviewerData.token}/`,
        type: 'e-hentai'
      }]
      ehSearchResultList.value = resultList
    }
  }
  searchResultLoading.value = false
  return resultList
}

const redirectSearch = (bookHash, title, server = 'e-hentai') => {
  let url
  switch (server) {
    case 'e-hentai':
      url = `https://e-hentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`
      break
    case 'exhentai':
      url = `https://exhentai.org/?f_shash=${bookHash}&fs_similar=on&fs_exp=on&f_cats=161`
      break
    case 'e-search':
      url = `https://e-hentai.org/?f_search=${encodeURI(title)}&f_cats=161`
      break
    case '.ehviewer':
    case 'exsearch':
      url = `https://exhentai.org/?f_search=${encodeURI(title)}&f_cats=161`
      break
    case 'hentag':
      url = `https://hentag.com/?t=${encodeURI(title)}`
      break
  }
  ipcRenderer.invoke('open-url', url)
}

const resolveEhentaiResult = (htmlString) => {
  try {
    const resultNodes = new DOMParser().parseFromString(htmlString, 'text/html').querySelectorAll('.gl3c.glname')
    ehSearchResultList.value = []
    resultNodes.forEach((node) => {
      ehSearchResultList.value.push({
        title: node.querySelector('.glink').innerHTML,
        url: node.querySelector('a').getAttribute('href'),
        type: 'e-hentai'
      })
    })
    return ehSearchResultList.value
  } catch (e) {
    console.log(e)
    if (htmlString.includes('Your IP address has been')) {
      serviceAvailable.value = false
      printMessage('error', t('c.ipBanned'))
    } else {
      printMessage('error', t('c.getMetadataFailed'))
    }
  }
}

const resolveHentagResult = (data) => {
  const resultList = data.works.slice(0, 10)
  ehSearchResultList.value = []
  resultList.forEach((result) => {
    const findExUrl = result.locations.find((location) => location.startsWith('https://exhentai.org'))
    if (findExUrl) {
      ehSearchResultList.value.push({
        title: result.title,
        url: findExUrl,
        type: 'e-hentai'
      })
    } else {
      ehSearchResultList.value.push({
        title: result.title,
        url: `https://hentag.com/vault/${result.id}`,
        type: 'hentag'
      })
    }
  })
  return ehSearchResultList.value
}

defineExpose({
  dialogVisibleEhSearch,
  openSearchDialog,
  getBookInfo,
  getBooksMetadata,
})

</script>

<style lang="stylus">
.dialog-search
  .el-form-item
    margin-right: 4px
  .search-input
    width: calc(60vw - 152px)
  .search-type-select
    width: 160px
  .search-result-ind
    cursor: pointer
    text-align: left
    margin: 8px 0
  .search-result-ind:hover
    background-color: var(--el-fill-color-dark)
</style>