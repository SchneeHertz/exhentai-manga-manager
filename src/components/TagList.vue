<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="72%"
    destroy-on-close
  >
    <div class="tag-list-container">
      <el-skeleton v-if="loading" :rows="10" animated />
      <template v-else>
        <div v-for="(group, letter) in groupedItems" :key="letter" class="letter-group">
          <div class="letter-header">{{ letter }}</div>
          <div class="tag-cloud">
            <el-tag
              v-for="(item, index) in group"
              :key="`tag-${letter}-${index}`"
              class="tag-item"
              @click="handleTagClick(item)"
            >
              {{ formatTagText(item) }} ({{ item.count }})
            </el-tag>
          </div>
        </div>
      </template>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick } from 'vue'

import { storeToRefs } from 'pinia'
import { useAppStore } from '../pinia.js'
const appStore = useAppStore()
const { setting, resolvedTranslation, displayBookList } = storeToRefs(appStore)

const props = defineProps({
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['search'])

const dialogVisible = ref(false)
const items = ref([])
const loading = ref(false)
const isArtistMode = ref(false)
const groupedItems = ref({})

// 根据标签类型添加前缀
const formatTagText = (item) => {
  const displayName = setting.value.showTranslation
    ? (resolvedTranslation.value[item.name]?.name || item.name)
    : item.name

  if (item.type === 'male') {
    return `m: ${displayName}`
  } else if (item.type === 'female') {
    return `f: ${displayName}`
  }

  return displayName
}


const getBookInfos = () => {
  const filteredBooks = displayBookList.value.filter(book => !book.folderHide && !book.hiddenBook)

  const bookInfos = filteredBooks.map(book => ({
    artists: book?.tags?.artist ? [...book.tags.artist] : [],
    male: book?.tags?.male ? [...book.tags.male] : [],
    female: book?.tags?.female ? [...book.tags.female] : [],
    mtime: book.mtime ? `${new Date(book.mtime).getFullYear()}-${(new Date(book.mtime).getMonth() + 1).toString().padStart(2, 0)}` : '',
  }))

  return bookInfos
}

const collectAllTags = (bookList) => {
  const bookInfos = getBookInfos()

  const allArtists = _(bookInfos.map(book => book.artists))
    .flatten()
    .countBy()
    .toPairs()
    .map(p => ({ name: p[0], count: p[1], type: 'artist' }))
    .sortBy(p => p.name)
    .value()

  const allMaleTags = _(bookInfos.map(book => book.male))
    .flatten()
    .countBy()
    .toPairs()
    .map(p => ({ name: p[0], count: p[1], type: 'male' }))
    .sortBy(p => p.name)
    .value()

  const allFemaleTags = _(bookInfos.map(book => book.female))
    .flatten()
    .countBy()
    .toPairs()
    .map(p => ({ name: p[0], count: p[1], type: 'female' }))
    .sortBy(p => p.name)
    .value()

  const allTags = [...allMaleTags, ...allFemaleTags]

  return {
    allArtists,
    allTags,
    allMaleTags,
    allFemaleTags,
    bookInfos
  }
}

const groupItemsByFirstLetter = (items) => {
  const grouped = {}

  items.forEach(item => {
    const firstLetter = item.name.charAt(0).toUpperCase()
    // 如果是非字母字符，归类到 '#' 组
    const group = /[A-Z]/i.test(firstLetter) ? firstLetter : '#'

    if (!grouped[group]) {
      grouped[group] = []
    }
    grouped[group].push(item)
  })

  return Object.keys(grouped).sort().reduce((acc, key) => {
    acc[key] = grouped[key]
    return acc
  }, {})
}

// 异步处理标签数据
const processTagsAsync = async (tagType) => {
  loading.value = true
  items.value = []
  isArtistMode.value = tagType === 'artist'
  groupedItems.value = {}

  dialogVisible.value = true
  await nextTick()

  setTimeout(() => {
    const { allArtists, allTags } = collectAllTags(displayBookList.value)

    if (tagType === 'artist') {
      items.value = allArtists
      groupedItems.value = groupItemsByFirstLetter(allArtists)
    } else {
      items.value = allTags
      groupedItems.value = groupItemsByFirstLetter(allTags)
    }

    loading.value = false
  }, 100)
}

const showArtistTags = () => {
  processTagsAsync('artist')
}

const showMixedTags = () => {
  processTagsAsync('mixed')
}

const handleTagClick = (item) => {
  let searchQuery = ''

  switch (item.type) {
    case 'artist':
      searchQuery = `a:"${item.name}"$`
      break
    case 'male':
      searchQuery = `m:"${item.name}"$`
      break
    case 'female':
      searchQuery = `f:"${item.name}"$`
      break
  }

  emit('search', searchQuery)
  dialogVisible.value = false
}


defineExpose({
  dialogVisible,
  showArtistTags,
  showMixedTags,
  getBookInfos
})
</script>

<style lang="stylus">
.tag-list-container
  max-height: 60vh
  overflow-y: auto
  padding: 10px

.tag-cloud
  display: flex
  flex-wrap: wrap
  gap: 10px

.tag-item
  margin: 5px
  cursor: pointer
  font-size: 14px

.letter-group
  margin-bottom: 20px

.letter-header
  font-size: 18px
  font-weight: bold
  margin-bottom: 10px
  padding-left: 5px
  padding-bottom: 5px
  text-align: left
</style>
