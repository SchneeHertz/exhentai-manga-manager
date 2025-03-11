<template>
  <el-row :gutter="20" class="book-tag-area">
    <el-space size="small" id="random-tags">
      <el-button size="small" plain :icon="MdRefresh" @click="reloadRandomTags"></el-button>
      <el-button size="small" plain :icon="UserMultiple" @click="showArtistList"></el-button>
      <el-button size="small" plain :icon="TagGroup" @click="showTagList"></el-button>
      <el-button
        v-for="tag in randomTags"
        :key="tag.value"
        size="small"
        plain
        @click="handleTagClick(tag.value)"
      >{{ tag.label }}</el-button>
    </el-space>
  </el-row>

  <TagList
    ref="tagListRef"
    :title="tagListTitle"
    @search="handleTagClick"
  />
</template>

<script setup>
import { ref, watch, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { MdRefresh } from '@vicons/ionicons4'
import { TagGroup, UserMultiple } from '@vicons/carbon'
import TagList from './TagList.vue'

import { useAppStore } from '../pinia.js'
import { storeToRefs } from 'pinia'
const appStore = useAppStore()
const { tagList } = storeToRefs(appStore)

const { t } = useI18n()

const emit = defineEmits(['search'])


const randomTags = ref([])
const tagListRef = ref(null)
const tagListTitle = ref('')

const reloadRandomTags = () => {
  randomTags.value = _.sampleSize(tagList.value, 24)
}

const handleTagClick = (value) => {
  emit('search', value)
}

const showArtistList = () => {
  tagListTitle.value = t('c.artist')
  tagListRef.value.showArtistTags()
}

const showTagList = () => {
  tagListTitle.value = t('m.tag')
  tagListRef.value.showMixedTags()
}

defineExpose({
  tagListRef
})

watch(tagList, () => {
  reloadRandomTags()
}, { immediate: false })

reloadRandomTags()
</script>

<style lang="stylus" scoped>
.book-tag-area
  width: 100%
  margin-top: 14px
  #random-tags
    margin: 0 16px
    overflow-x: hidden
</style>
