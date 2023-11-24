<template>
  <el-dialog v-model="dialogVisibleEhSearch"
    width="60%"
    :title="$t('m.search')"
    destroy-on-close
    class="dialog-search"
  >
    <el-input v-model="searchStringDialog" :disabled="disabledSearchString" @keyup.enter="getBookListFromWeb(bookDetail, searchTypeDialog)">
      <template #prepend>
        <el-select class="search-type-select" v-model="searchTypeDialog">
          <el-option label="exhentai(sha1)" value="exhentai" />
          <el-option label="e-hentai(sha1)" value="e-hentai" />
          <el-option label="exhentai(keyword)" value="exsearch" />
          <el-option label="e-hentai(keyword)" value="e-search" />
          <el-option label="chaika(keyword)" value="chaika" />
          <el-option label="hentag(keyword)" value="hentag" />
        </el-select>
      </template>
      <template #append>
        <el-button :icon="Search32Filled" @click="getBookListFromWeb(bookDetail, searchTypeDialog)"/>
      </template>
    </el-input>
    <div v-loading="searchResultLoading">
      <div class="search-result" v-if="ehSearchResultList.length > 0">
        <p
          v-for="result in ehSearchResultList"
          :key="result.url"
          @click="resolveSearchResult(bookDetail, result.url, result.type)"
          class="search-result-ind"
        >{{result.title}}</p>
      </div>
      <el-empty v-else :description="$t('m.noResults')" :image-size="100" />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { Search32Filled } from '@vicons/fluent'

const props = defineProps(['cookie'])

const emit = defineEmits(['message', 'saveBook', 'getBookInfoFromEh'])

const dialogVisibleEhSearch = ref(false)
const searchResultLoading = ref(false)
const searchStringDialog = ref('')
const searchTypeDialog = ref('exhentai')
const ehSearchResultList = ref([])
const bookDetail = ref({})

const disabledSearchString = computed(() => {
  return ['exhentai', 'e-hentai'].includes(searchTypeDialog.value)
})

const openSearchDialog = (book, server) => {
  dialogVisibleEhSearch.value = true
  bookDetail.value = _.cloneDeep(book)
  if (server) searchTypeDialog.value = server
  ehSearchResultList.value = []
  searchStringDialog.value = returnFileName(bookDetail.value)
  getBookListFromWeb(bookDetail.value, searchTypeDialog.value)
}

const returnFileName = (book) => {
  // Windows only
  if (book.type === 'folder') {
    return book.filepath.replace(/^.*\\/g, '')
  } else {
    return book.filepath.replace(/^.*\\|\.[^.]*$/g, '')
  }
}

const getBookListFromWeb = (book, server = 'e-hentai') => {
  searchResultLoading.value = true
  if (server === 'e-hentai') {
    axios.get(`https://e-hentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`)
    .then(res=>{
      resolveEhentaiResult(res.data)
    })
    .finally(()=>{
      searchResultLoading.value = false
    })
  } else if (server === 'exhentai') {
    ipcRenderer.invoke('get-ex-webpage', {
      url: `https://exhentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`,
      cookie: props.cookie
    })
    .then(res=>{
      resolveEhentaiResult(res)
    })
    .finally(()=>{
      searchResultLoading.value = false
    })
  } else if (server === 'e-search') {
    axios.get(`https://e-hentai.org/?f_search=${encodeURI(searchStringDialog.value)}&f_cats=689`)
    .then(res=>{
      resolveEhentaiResult(res.data)
    })
    .finally(()=>{
      searchResultLoading.value = false
    })
  } else if (server === 'exsearch') {
    ipcRenderer.invoke('get-ex-webpage', {
      url: `https://exhentai.org/?f_search=${encodeURI(searchStringDialog.value)}&f_cats=689`,
      cookie: props.cookie
    })
    .then(res=>{
      resolveEhentaiResult(res)
    })
    .finally(()=>{
      searchResultLoading.value = false
    })
  } else if (server === 'chaika') {
    axios.get(`https://panda.chaika.moe/search/?title=${encodeURI(searchStringDialog.value)}`)
    .then(res=>{
      resolveChaikaResult(res.data)
    })
    .finally(()=>{
      searchResultLoading.value = false
    })
  } else if (server === 'hentag') {
    axios.get(`https://hentag.com/public/api/vault-search?t=${encodeURI(searchStringDialog.value)}`)
    .then(res=>{
      resolveHentagResult(res.data)
    })
    .finally(()=>{
      searchResultLoading.value = false
    })
  }
}

const resolveEhentaiResult = (htmlString) => {
  try {
    let resultNodes = new DOMParser().parseFromString(htmlString, 'text/html').querySelectorAll('.gl3c.glname')
    ehSearchResultList.value = []
    resultNodes.forEach((node)=>{
      ehSearchResultList.value.push({
        title: node.querySelector('.glink').innerHTML,
        url: node.querySelector('a').getAttribute('href')
      })
    })
  } catch (e) {
    console.log(e)
    if (htmlString.includes('Your IP address has been')) {
      emit('message', 'error', 'Your IP address has been temporarily banned')
    } else {
      emit('message', 'error', 'Get tag failed')
    }
  }
}
const resolveChaikaResult = (htmlString) => {
  let resultNodes = new DOMParser().parseFromString(htmlString, 'text/html').querySelectorAll('.result-list')
  ehSearchResultList.value = []
  resultNodes.forEach((node)=>{
    ehSearchResultList.value.push({
      title: node.querySelector('td a').innerHTML,
      url: node.querySelector('a').getAttribute('href'),
      type: 'chaika'
    })
  })
}
const resolveHentagResult = (data) => {
  let resultList = data.works.slice(0, 10)
  ehSearchResultList.value = []
  resultList.forEach((result)=>{
    let findExUrl = result.locations.find((location) => location.startsWith('https://exhentai.org'))
    if (findExUrl) {
      ehSearchResultList.value.push({
        title: result.title,
        url: findExUrl
      })
    } else {
      ehSearchResultList.value.push({
        title: result.title,
        url: `https://hentag.com/vault/${result.id}`,
        type: 'hentag'
      })
    }
  })
}

const resolveSearchResult = (book, url, type) => {
  if (type === 'chaika') {
    book.url = `https://panda.chaika.moe${url}`
    getBookInfoFromChaika(book)
  } else if (type === 'hentag') {
    book.url = url
    getBookInfoFromHentag(book)
  } else {
    book.url = url
    getBookInfoFromEh(book)
  }
  dialogVisibleEhSearch.value = false
}

const getBookInfoFromChaika = (book) => {
  let archiveNo = /\d+/.exec(book.url)[0]
  axios.get(`https://panda.chaika.moe/api?archive=${archiveNo}`)
  .then(async res=>{
    _.assign(
      book,
      _.pick(res.data, ['tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category']),
    )
    book.posted = +book.posted
    book.filecount = +book.filecount
    book.rating = +book.rating
    book.title = he.decode(book.title)
    book.title_jpn = he.decode(book.title_jpn)
    let tagObject = _.groupBy(book.tags, tag=>{
      let result = /(.+):/.exec(tag)
      if (result) {
        return /(.+):/.exec(tag)[1]
      } else {
        return 'misc'
      }
    })
    _.forIn(tagObject, (arr, key)=>{
      tagObject[key] = arr.map(tag=>{
        let result = /:(.+)$/.exec(tag)
        if (result) {
          return /:(.+)$/.exec(tag)[1].replaceAll('_', ' ')
        } else {
          return tag.replaceAll('_', ' ')
        }
      })
    })
    book.tags = tagObject
    book.status = 'tagged'
    emit('saveBook', book)
  })
}
const getBookInfoFromHentag = async (book) => {
  let { data } = await axios.get(`https://hentag.com/public/api/vault/${book.url.slice(25)}`)
  let tags = {}
  data.language === 11 ? tags['language'] = ['chinese','translated'] : ''
  data.parodies.length > 0 ? tags['parody'] = data.parodies.map(parody=>parody.name) : ''
  data.characters.length > 0 ? tags['character'] = data.characters.map(character=>character.name) : ''
  data.circles.length > 0 ? tags['group'] = data.circles.map(circle=>circle.name) : ''
  data.artists.length > 0 ? tags['artist'] = data.artists.map(artist=>artist.name) : ''
  data.maleTags.length > 0 ? tags['male'] = data.maleTags.map(maleTag=>maleTag.name) : ''
  data.femaleTags.length > 0 ? tags['female'] = data.femaleTags.map(femaleTag=>femaleTag.name) : ''
  if (data.otherTags.length > 0) {
    data.otherTags.forEach(({ name }) => {
      let cat = this.tag2cat[name]
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
    category: this.categoryOption[data.category],
    tags
  })
  book.status = 'tagged'
  emit('saveBook', book)
}
const getBookInfo = (book) => {
  if (book.url.startsWith('https://panda.chaika.moe')) {
    getBookInfoFromChaika(book)
  } else if (book.url.startsWith('https://hentag.com')) {
    getBookInfoFromHentag(book)
  } else {
    emit('getBookInfoFromEh', book)
  }
}

defineExpose({
  dialogVisibleEhSearch,
  openSearchDialog,
  getBookInfo
})

</script>

<style lang="stylus">
.dialog-search
  .el-dialog__body
    padding: 5px 20px 16px
  .search-type-select
    width: 160px
  .search-result-ind
    cursor: pointer
    text-align: left
    margin: 8px 0
  .search-result-ind:hover
    background-color: var(--el-fill-color-dark)
</style>