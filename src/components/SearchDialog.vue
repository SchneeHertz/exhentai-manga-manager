<template>
  <el-dialog v-model="dialogVisibleEhSearch"
    width="60%"
    :title="$t('m.search')"
    destroy-on-close
    class="dialog-search"
  >
    <el-form :inline="true">
      <el-form-item>
        <el-input v-model="searchStringDialog" @keyup.enter="getBookListFromWeb(bookDetail, searchTypeDialog)" class="search-input">
          <template #append>
            <el-select class="search-type-select" v-model="searchTypeDialog">
              <el-option v-for="searchType in props.searchTypeList" :key="searchType.value" :label="searchType.label" :value="searchType.value" />
            </el-select>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" plain :icon="Search32Filled" @click="getBookListFromWeb(bookDetail, searchTypeDialog)"/>
      </el-form-item>
    </el-form>
    <div v-loading="searchResultLoading">
      <div class="search-result" v-if="ehSearchResultList.length > 0">
        <p
          v-for="result in ehSearchResultList"
          :key="result.url"
          @click="$emit('resolveSearchResult', bookDetail.id, result.url, result.type)"
          class="search-result-ind"
        >{{result.title}}</p>
      </div>
      <el-empty v-else :description="$t('m.noResults')" :image-size="100" />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { Search32Filled } from '@vicons/fluent'

const props = defineProps(['cookie', 'searchTypeList'])

const emit = defineEmits(['message', 'resolveSearchResult'])

const dialogVisibleEhSearch = ref(false)
const searchResultLoading = ref(false)
const searchStringDialog = ref('')
const searchTypeDialog = ref('exhentai')
const ehSearchResultList = ref([])
const bookDetail = ref({})

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

defineExpose({
  dialogVisibleEhSearch,
  openSearchDialog
})

</script>

<style lang="stylus">
.dialog-search
  .el-dialog__body
    padding: 5px 20px 16px
  .el-form-item
    margin-right: 4px
  .search-input
    width: calc(60vw - 96px)
  .search-type-select
    width: 160px
  .search-result-ind
    cursor: pointer
    text-align: left
    margin: 8px 0
  .search-result-ind:hover
    background-color: var(--el-fill-color-dark)
</style>