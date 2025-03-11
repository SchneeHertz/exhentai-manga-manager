<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="80%"
    destroy-on-close
  >
    <div class="tag-list-container">
      <el-tag
        v-for="(item, index) in items"
        :key="index"
        class="tag-item"
        @click="handleTagClick(item)"
      >
        {{ formatTagText(item) }}
        <span class="tag-count">({{ item.count }})</span>
      </el-tag>
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
  max-height 60vh
  overflow-y auto
  display flex
  flex-wrap wrap
  gap 10px

.tag-item
  margin 5px
  cursor pointer

  .tag-count
    margin-left 3px
    font-size 0.9em
    opacity 0.8
</style>
