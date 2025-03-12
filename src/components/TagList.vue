<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="80%"
    destroy-on-close
  >
    <div class="tag-list-container">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="tag-card"
        @click="handleTagClick(item)"
      >
        <div class="tag-image">
          <img v-if="findCoverForTag(item)" :src="findCoverForTag(item)" alt="cover" />
          <el-empty v-else description="无封面" :image-size="80" />
        </div>
        <div class="tag-info">
          <div class="tag-name">{{ formatTagText(item) }}</div>
          <div class="tag-count">({{ item.count }})</div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'

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

// 根据标签查找一本包含该标签的书籍封面
const findCoverForTag = (item) => {
  const books = displayBookList.value.filter(book => {
    if (item.type === 'artist' && book.tags?.artist) {
      return book.tags.artist.includes(item.name)
    } else if (item.type === 'male' && book.tags?.male) {
      return book.tags.male.includes(item.name)
    } else if (item.type === 'female' && book.tags?.female) {
      return book.tags.female.includes(item.name)
    }
    return false
  })

  // 返回找到的第一本书的封面，如果没有找到则返回null
  return books.length > 0 && books[0].coverPath ? books[0].coverPath : null
}

// 收集所有标签数据
const collectAllTags = (bookList) => {
  const filteredBooks = bookList.filter(book => !book.folderHide && !book.hiddenBook)

  const bookInfos = filteredBooks.map(book => ({
    artists: book?.tags?.artist ? [...book.tags.artist] : [],
    male: book?.tags?.male ? [...book.tags.male] : [],
    female: book?.tags?.female ? [...book.tags.female] : [],
    mtime: `${new Date(book.mtime).getFullYear()}-${(new Date(book.mtime).getMonth() + 1).toString().padStart(2, 0)}`,
  }))

  const allArtists = _(bookInfos.map(book => book.artists))
    .flatten()
    .countBy()
    .toPairs()
    .map(p => ({ name: p[0], count: p[1], type: 'artist' }))
    .sortBy(p => -p.count)
    .value()

  const allMaleTags = _(bookInfos.map(book => book.male))
    .flatten()
    .countBy()
    .toPairs()
    .map(p => ({ name: p[0], count: p[1], type: 'male' }))
    .sortBy(p => -p.count)
    .value()

  const allFemaleTags = _(bookInfos.map(book => book.female))
    .flatten()
    .countBy()
    .toPairs()
    .map(p => ({ name: p[0], count: p[1], type: 'female' }))
    .sortBy(p => -p.count)
    .value()

  const allTags = _.sortBy([...allMaleTags, ...allFemaleTags], p => -p.count)

  return {
    allArtists,
    allTags,
    allMaleTags,
    allFemaleTags,
    bookInfos
  }
}

// 显示艺术家列表
const showArtistTags = () => {
  const { allArtists } = collectAllTags(displayBookList.value)
  items.value = allArtists
  dialogVisible.value = true
}

// 显示混合标签列表 (male 和 female)
const showMixedTags = () => {
  const { allTags } = collectAllTags(displayBookList.value)
  items.value = allTags
  dialogVisible.value = true
}

// 点击标签执行搜索
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

// 获取处理后的书籍信息，供图表使用
const getBookInfos = () => {
  return collectAllTags(displayBookList.value).bookInfos
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
  display: flex
  flex-wrap: wrap
  gap: 10px

.tag-card
  width: 120px
  margin: 10px
  cursor: pointer
  border-radius: 5px
  overflow: hidden
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
  border: 1px solid var(--el-border-color)

  .tag-image
    width: 100%
    height: 160px
    overflow: hidden
    display: flex
    align-items: center
    justify-content: center

    img
      width: 100%
      height: 100%
      object-fit: cover
      object-position: center

    .el-empty
      padding: 0

  .tag-info
    padding: 8px

    .tag-name
      font-size: 12px
      white-space: nowrap
      overflow: hidden
      text-overflow: ellipsis

    .tag-count
      font-size: 11px
      color: var(--el-text-color-regular)
      margin-top: 3px
</style>
