<template>
  <div class="book-card">
    <p class="book-title"
      @click="$emit('openBookDetail')"
      @contextmenu="onMangaTitleContextMenu($event, book)"
      :title="getDisplayTitle(book)"
    >{{getDisplayTitle(book)}}</p>
    <img
      class="book-cover"
      :src="book.coverPath"
      @click="$emit('handleClickCover')"
      @contextmenu="$emit('onBookContextMenu', $event, book)"
    />
    <el-tag class="book-card-language" size="small"
      :type="isChineseTranslatedManga(book) ? 'danger' : 'info'"
      @click="$emit('handleSearchString', `:count=${book.readCount}`)"
    >{{book.readCount}}</el-tag>
    <el-tag class="book-card-pagecount" size="small" type="danger" v-if="book.pageDiff" @click="$emit('handleSearchString', 'pageDiff')">{{book.pageCount}}|{{book.filecount}}P</el-tag>
    <el-tag class="book-card-pagecount" size="small" type="info" v-else>{{ book.pageCount }}P</el-tag>
    <el-icon
      :size="30"
      :color="book.mark ? '#E6A23C' : '#666666'"
      class="book-card-mark" @click="switchMark(book)"
    ><BookmarkTwotone /></el-icon>
    <div class="collect-tag">
      <el-tag
        v-for="tag in filterCollectTag(book.tags)" :key="tag.id"
        @click="$emit('searchFromTag', tag.tag, tag.cat)"
        class="book-collect-tag"
        :color="tag.color"
        size="small"
        effect="dark"
      >{{tag.letter}}:{{resolvedTranslation[tag.tag]?.name || tag.tag}}</el-tag>
    </div>
    <div>
      <el-button-group class="outer-read-button-group">
        <el-button type="success" size="small" class="outer-read-button" plain @click="$emit('openLocalBook')">{{$t('m.re')}}</el-button>
        <el-button type="success" size="small" class="outer-read-button" plain @click="$emit('viewManga')">{{$t('m.ad')}}</el-button>
      </el-button-group>
      <el-tag
        class="book-status-tag"
        effect="plain"
        :type="book.status === 'non-tag' ? 'info' : book.status === 'tagged' ? 'success' : 'warning'"
        @click="$emit('searchFromTag', book.status)"
      >{{book.status}}</el-tag>
      <el-rate v-model="bookRating" size="small" allow-half @change="saveBook(Object.assign({}, book, {rating: bookRating}))"/>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookmarkTwotone } from '@vicons/material'
import ContextMenu from '@imengyu/vue3-context-menu'

import { storeToRefs } from 'pinia'
import { useAppStore } from '../pinia.js'
const appStore = useAppStore()
const { setting, resolvedTranslation } = storeToRefs(appStore)
const { getDisplayTitle, isChineseTranslatedManga, saveBook, switchMark } = appStore

const { t } = useI18n()

const emit = defineEmits([
  'openBookDetail',
  'handleClickCover',
  'onBookContextMenu',
  'handleSearchString',
  'searchFromTag',
  'openLocalBook',
  'viewManga',
])

const props = defineProps({
  book: Object
})

const bookRating = ref(props.book.rating)

const filterCollectTag = (tagObject) => {
  if (setting.value.showCollectTag) {
    const collectTag = setting.value.collectTag || []
    return collectTag.filter(tag => tagObject[tag.cat] && tagObject[tag.cat].includes(tag.tag))
  } else {
    return []
  }
}

const onMangaTitleContextMenu = (e, book) => {
  e.preventDefault()
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items: [
      {
        label: t('c.copyTitleToClipboard'),
        onClick: () => {
          ipcRenderer.invoke('copy-text-to-clipboard', book.title_jpn || book.title)
        }
      },
      {
        label: t('c.copyLinkToClipboard'),
        onClick: () => {
          ipcRenderer.invoke('copy-text-to-clipboard', book.url)
        }
      },
      {
        label: t('c.copyTitleAndLinkToClipboard'),
        onClick: () => {
          ipcRenderer.invoke('copy-text-to-clipboard', `${book.title_jpn || book.title}\n${book.url}\n`)
        }
      },
    ]
  })
}

</script>

<style lang="stylus">
.book-card
  display: inline-block
  width: 220px
  min-height: 365px
  padding-bottom: 4px
  border: solid 1px var(--el-border-color)
  border-radius: 4px
  margin: 6px 6px
  position: relative
  .collect-tag
    overflow-x: hidden
    margin: 0 0 0 10px
    text-align: left
    .book-collect-tag
      cursor: pointer
      margin-right: 4px
      margin-bottom: 4px
      border-width: 0
      padding-left: 4px
      padding-right: 4px
.book-title
  height: 36px
  overflow-y: hidden
  margin: 8px 6px
  font-size: 14px
  cursor: pointer
  line-height: 18px
.book-card-mark, .book-card-language, .book-card-pagecount
  position: absolute
  cursor: pointer
.book-card-language
  left: 10px
  top: 52px
  border-radius: 3px 0 3px 0
.book-card-pagecount
  left: 10px
  top: 315px
  border-radius: 0 3px 0 3px
.book-card-mark
  right: 4px
  top: 40px
.book-cover
  border-radius: 4px
  width: 200px
  height: 283px
  object-fit: cover
.outer-read-button-group
  margin: 0 6px
.outer-read-button:first-child
  padding: 0 0 0 6px
.outer-read-button + .outer-read-button
  padding: 0 6px 0 0
.book-status-tag
  padding: 0 2px
  margin-right: 6px
  cursor: pointer
  width: 56px
.el-rate
  display: inline-block
  height: 18px
</style>