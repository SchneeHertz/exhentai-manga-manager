<template>
  <div class="book-card">
    <el-tag effect="dark" type="warning" class="book-collection-tag">{{$t('m.collection')}}</el-tag>
    <p class="book-title" :title="book.title">{{book.title}}</p>
    <img class="book-cover" :src="book.coverPath" @click="$emit('openCollection')"/>
    <el-tag class="book-card-language" size="small"
      :type="isChineseTranslatedManga(book) ? 'danger' : 'info'"
      @click="$emit('handleSearchString', `:count=${book.readCount}`)"
    >{{book.readCount}}</el-tag>
    <el-icon :size="30" :color="book.mark ? '#E6A23C' : '#666666'" class="book-card-mark"><BookmarkTwotone /></el-icon>
    <el-tag class="book-card-pagecount" size="small" type="info">{{ book.chapterCount }}C</el-tag>
    <el-rate v-model="book.rating" size="small" allow-half disabled/>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { BookmarkTwotone } from '@vicons/material'

import { useAppStore } from '../pinia.js'
const appStore = useAppStore()
const { isChineseTranslatedManga } = appStore

const emit = defineEmits(['handleSearchString', 'openCollection'])

const props = defineProps({
  initBook: Object
})

const book = ref(props.initBook)

</script>

<style lang="stylus">
.book-collection-tag
  position: absolute
  right: 1px
  top: 1px
</style>