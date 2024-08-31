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
          @keyup.enter="getBookListFromWeb(bookDetail.hash.toUpperCase(), searchStringDialog, searchTypeDialog)"
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
          @click="getBookListFromWeb(bookDetail.hash.toUpperCase(), searchStringDialog, searchTypeDialog)"
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
import { Search32Filled } from '@vicons/fluent'
import { Link } from '@element-plus/icons-vue'

const props = defineProps(['cookie', 'searchTypeList', 'setting'])

const emit = defineEmits(['message', 'resolveSearchResult'])

const dialogVisibleEhSearch = ref(false)
const searchResultLoading = ref(false)
const searchStringDialog = ref('')
const searchTypeDialog = ref('')
const ehSearchResultList = ref([])
const bookDetail = ref({})

const openSearchDialog = (book, server) => {
  if (!searchTypeDialog.value) searchTypeDialog.value = props.setting.defaultScraper || 'exhentai'
  dialogVisibleEhSearch.value = true
  bookDetail.value = _.cloneDeep(book)
  if (server) searchTypeDialog.value = server
  ehSearchResultList.value = []
  searchStringDialog.value = returnTrimFileName(bookDetail.value)
  getBookListFromWeb(bookDetail.value.hash.toUpperCase(), searchStringDialog.value, searchTypeDialog.value)
}

const returnTrimFileName = (book) => {
  const fileNameWithExtension = book.filepath.split(/[/\\]/).pop()
  let fileNameWithoutExtension = fileNameWithExtension
  try {
    if (book.type !== 'folder') {
      fileNameWithoutExtension = fileNameWithExtension.split('.').slice(0, -1).join('.')
    }
    if (props.setting.trimTitleRegExp) {
      return fileNameWithoutExtension.replace(new RegExp(props.setting.trimTitleRegExp, 'g'), '')
    }
  } catch (e) {
    console.log(e)
  }
  return fileNameWithoutExtension
}

const getBookListFromWeb = async (bookHash, title, server = 'e-hentai') => {
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
      cookie: props.cookie
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
      cookie: props.cookie
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
      emit('message', 'error', t('c.ipBanned'))
    } else {
      emit('message', 'error', t('c.getMetadataFailed'))
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
  returnTrimFileName,
  getBookListFromWeb
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