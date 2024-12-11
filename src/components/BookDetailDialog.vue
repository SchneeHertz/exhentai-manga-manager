<template>
  <el-dialog v-model="dialogVisibleBookDetail"
    fullscreen
    class="dialog-detail"
  >
    <template #header>
      <p class="detail-book-title">
        <span class="url-link" @click="openUrl(bookDetail.url)" @contextmenu="onMangaTitleContextMenu($event, bookDetail)">{{getDisplayTitle(bookDetail)}}</span>
      </p>
    </template>
    <el-row :gutter="20" class="book-detail-card">
      <el-col :span="6">
        <el-row class="book-detail-function book-detail-cover-frame">
          <img
            class="book-detail-cover"
            :src="bookDetail.coverPath"
            @click="$emit('openContentView', bookDetail)"
            @contextmenu="$emit('openThumbnailView', bookDetail)"
          />
          <el-icon
            :size="30"
            :color="bookDetail.mark ? '#E6A23C' : '#666666'"
            class="book-detail-star" @click="switchMark(bookDetail)"
          ><BookmarkTwotone /></el-icon>
          <div class="next-manga-pane" @click="$emit('jumpMangeDetail', 1)"><el-icon text><CaretRight20Regular /></el-icon></div>
          <div class="prev-manga-pane" @click="$emit('jumpMangeDetail', -1)"><el-icon text><CaretLeft20Regular /></el-icon></div>
        </el-row>
        <el-row :gutter="20" class="book-detail-rate">
          <el-rate v-model="bookDetail.rating" size="large" allow-half @change="saveBook(bookDetail)"/>
        </el-row>
        <el-row class="book-detail-function">
          <el-descriptions :column="1">
            <el-descriptions-item :label="$t('m.pageCount')+':'" :class-name="bookDetail.pageDiff ? 'text-red' : ''">
              {{bookDetail.pageCount}} | {{bookDetail.filecount}}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('m.fileSize')+':'">
              {{Math.floor(bookDetail.bundleSize / 1048576)}} | {{Math.floor(bookDetail.filesize / 1048576)}} MB
            </el-descriptions-item>
            <el-descriptions-item :label="$t('m.readCount')+':'">{{bookDetail.readCount}}</el-descriptions-item>
            <el-descriptions-item :label="$t('m.mtime')+':'">{{new Date(bookDetail.mtime).toLocaleString("zh-CN")}}</el-descriptions-item>
            <el-descriptions-item :label="$t('m.postTime')+':'">{{new Date(bookDetail.posted * 1000).toLocaleString("zh-CN")}}</el-descriptions-item>
          </el-descriptions>
        </el-row>
        <el-row class="book-detail-function">
          <el-button-group style="margin-right: 12px;">
            <el-button type="success" style="padding-right: 0;" plain @click="openLocalBook(bookDetail)">{{$t('m.re')}}</el-button>
            <el-button type="success" style="padding-left: 0;" plain @click="$emit('openContentView', bookDetail)">{{$t('m.ad')}}</el-button>
          </el-button-group>
          <el-button plain @click="triggerShowComment">{{setting.showComment ? $t('m.hideComment') : $t('m.showComment')}}</el-button>
          <el-button type="primary" plain @click="editTags">{{editingTag ? $t('m.showTag') : $t('m.editTag')}}</el-button>
        </el-row>
        <el-row class="book-detail-function">
          <el-button type="primary" plain
            @click="$emit('openSearchDialog', bookDetail)"
          >{{$t('m.getMetadata')}}</el-button>
          <el-button type="primary" plain @click="triggerHiddenBook(bookDetail)">{{bookDetail.hiddenBook ? $t('m.showManga') : $t('m.hideManga')}}</el-button>
        </el-row>
        <el-row class="book-detail-function">
          <el-button type="danger" plain @click="deleteLocalBook(bookDetail)">{{$t('m.deleteFile')}}</el-button>
          <el-button plain @click="rescanBook(bookDetail)">{{$t('m.rescan')}}</el-button>
          <el-button type="primary" plain @click="showFile(bookDetail.filepath)">{{$t('m.openMangaFileLocation')}}</el-button>
        </el-row>
      </el-col>
      <el-col :span="setting.showComment ? 10 : 18">
        <el-scrollbar class="book-tag-frame">
          <div v-if="editingTag">
            <div class="edit-line">
              <el-input v-model="bookDetail.title_jpn" :placeholder="$t('m.title')" @change="saveBook(bookDetail)"></el-input>
            </div>
            <div class="edit-line">
              <el-input v-model="bookDetail.title" :placeholder="$t('m.englishTitle')" @change="saveBook(bookDetail)"></el-input>
            </div>
            <div class="edit-line">
              <el-select v-model="bookDetail.status" :placeholder="$t('m.metadataStatus')" @change="saveBook(bookDetail)">
                <el-option v-for="status in statusOption" :value="status" :key="status" :label="status" />
              </el-select>
            </div>
            <div class="edit-line">
              <el-input v-model="bookDetail.url" :placeholder="$t('m.ehexAddress')" @change="saveBook(bookDetail)"></el-input>
            </div>
            <div class="edit-line">
              <el-select v-model="bookDetail.category" :placeholder="$t('m.category')" @change="saveBook(bookDetail)" clearable>
                <el-option v-for="cat in categoryOption" :value="cat" :key="cat" :label="cat" />
              </el-select>
            </div>
            <div class="edit-line" v-for="(arr, key) in tagGroup" :key="key">
              <el-select-v2
                v-model="bookDetail.tags[key]" :placeholder="key" @change="saveBookTags(bookDetail)"
                filterable clearable allow-create multiple :reserve-keyword="false" :height="340"
                :options="arr"
              >
              </el-select-v2>
            </div>
            <el-space wrap class="tag-edit-buttons">
              <el-button @click="addTagCat">{{$t('m.addCategory')}}</el-button>
              <el-button @click="$emit('getBookInfo', bookDetail)">{{$t('m.getTagbyUrl')}}</el-button>
              <el-button @click="resetMetadata(bookDetail)">{{$t('m.resetMetadata')}}</el-button>
              <el-button @click="copyTagClipboard(bookDetail)">{{$t('m.copyTagClipboard')}}</el-button>
              <el-button @click="pasteTagClipboard(bookDetail)">{{$t('m.pasteTagClipboard')}}</el-button>
            </el-space>
          </div>
          <div v-else>
            <el-descriptions :column="1">
              <el-descriptions-item :label="$t('m.title')+':'">{{bookDetail.title_jpn}}</el-descriptions-item>
              <el-descriptions-item :label="$t('m.englishTitle')+':'">{{bookDetail.title}}</el-descriptions-item>
              <el-descriptions-item :label="$t('m.filename')+':'">{{returnFileNameWithExt(bookDetail.filepath)}}</el-descriptions-item>
              <el-descriptions-item :label="$t('m.fileLocation')+':'">{{returnDirname(bookDetail.filepath)}}</el-descriptions-item>
              <el-descriptions-item :label="$t('m.category')+':'">
                <el-tag type="info" class="book-tag" @click="$emit('searchFromTag', bookDetail.category)">{{bookDetail.category}}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item v-for="(tagArr, key) in bookDetail.tags" :label="key + ':'" :key="key">
                <el-popover
                  effect="dark"
                  trigger="hover"
                  :content="resolvedTranslation[tag] ? resolvedTranslation[tag].intro : tag"
                  :disabled="!resolvedTranslation[tag]?.intro"
                  placement="top-start"
                  :show-after="500"
                  width="300px"
                  v-for="tag in tagArr" :key="tag"
                >
                  <template #reference>
                    <el-tag
                      type="info"
                      class="book-tag"
                      @click="$emit('searchFromTag', tag, key)"
                    >{{resolvedTranslation[tag] ? resolvedTranslation[tag].name : tag }}</el-tag>
                  </template>
                </el-popover>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-scrollbar>
      </el-col>
      <el-col :span="8" v-if="setting.showComment">
        <el-scrollbar class="book-comment-frame">
          <div class="book-comment" v-for="comment in comments" :key="comment.id">
            <div class="book-comment-postby">{{comment.author}}<span class="book-comment-score">{{comment.score}}</span></div>
            <p class="book-comment-content" @contextmenu="onMangaCommentContextMenu($event, comment.content)">{{comment.content}}</p>
          </div>
        </el-scrollbar>
      </el-col>
    </el-row>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox } from 'element-plus'
import { CaretRight20Regular, CaretLeft20Regular } from '@vicons/fluent'
import { BookmarkTwotone } from '@vicons/material'
import { nanoid } from 'nanoid'
import he from 'he'
import * as linkify from 'linkifyjs'
import ContextMenu from '@imengyu/vue3-context-menu'

import { storeToRefs } from 'pinia'
import { useAppStore } from '../pinia.js'
const appStore = useAppStore()
const {
  setting, bookDetail, resolvedTranslation,
  bookList, displayBookList, collectionList, openCollectionBookList,
  statusOption, categoryOption,
  pathSep,
} = storeToRefs(appStore)
const {
  printMessage,
  saveBook,
  returnFileNameWithExt,
  getDisplayTitle,
  resetMetadata,
  switchMark,
  copyTagClipboard,
  pasteTagClipboard,
} = appStore

const { t } = useI18n()

const emit = defineEmits([
  'openContentView',
  'openThumbnailView',
  'saveCollection',
  'handleRemoveBookDisplay',
  'openSearchDialog',
  'getBookInfo',
  'searchFromTag',
  'jumpMangeDetail',
])

const dialogVisibleBookDetail = ref(false)

const openBookDetail = (book) => {
  bookDetail.value = book
  dialogVisibleBookDetail.value = true
  comments.value = []
  if (setting.value.showComment) getComments(book.url)
}
const openUrl = (url) => {
  ipcRenderer.invoke('open-url', url)
}
const triggerHiddenBook = async (book) => {
  book.hiddenBook = !book.hiddenBook
  await saveBook(book)
}


const returnDirname = (filepath) => {
  return filepath.split(/[/\\]/).slice(0, -1).join(pathSep.value)
}

const showFile = (filepath) => {
  ipcRenderer.invoke('show-file', filepath)
}
const openLocalBook = (book) => {
  bookDetail.value = book
  if (setting.value.imageExplorer) {
    bookDetail.value.readCount += 1
    saveBook(bookDetail.value)
    ipcRenderer.invoke('open-local-book', bookDetail.value.filepath)
  } else {
    emit('openContentView', book)
  }
}
const rescanBook = async (book) => {
  const bookInfo = await ipcRenderer.invoke('patch-local-metadata-by-book', _.cloneDeep(book))
  _.assign(book, bookInfo)
  await saveBook(book)
  printMessage('success', t('c.rescanSuccess'))
}
const deleteBook = async (book) => {
  await ipcRenderer.invoke('delete-local-book', book.filepath)
  .finally(() => {
    dialogVisibleBookDetail.value = false
    if (book.collectionHide) {
      _.forEach(collectionList.value, (collection) => {
        collection.list = _.filter(collection.list, hash_id => hash_id !== book.id && hash_id !== book.hash)
      })
      openCollectionBookList.value = _.filter(openCollectionBookList.value, bookOfCollection => {
        return bookOfCollection.id !== book.id && bookOfCollection.id !== book.hash
      })
      emit('saveCollection')
    } else {
      const findBookInBookList = _.findIndex(bookList.value, b => b.filepath === book.filepath)
      bookList.value.splice(findBookInBookList, 1)
      displayBookList.value = _.filter(displayBookList.value, b => b.filepath !== book.filepath)
      emit('handleRemoveBookDisplay')
    }
  })
}
const deleteLocalBook = (book) => {
  if (setting.value.skipDeleteConfirm) {
    deleteBook(book)
  } else {
    ElMessageBox.confirm(
      t('c.confirmDelete'),
      '',
      {}
    )
    .then(() => deleteBook(book))
  }
}

const comments = ref([])
const triggerShowComment = () => {
  if (setting.value.showComment) {
    setting.value.showComment = false
  } else {
    comments.value = []
    getComments(bookDetail.value.url)
    setting.value.showComment = true
  }
}
const getComments = (url) => {
  if (url) {
    ipcRenderer.invoke('get-ex-webpage', {
      url,
      cookie: appStore.cookie
    })
    .then(res => {
      comments.value = []
      const commentElements = new DOMParser().parseFromString(res, 'text/html').querySelectorAll('#cdiv>.c1')
      commentElements.forEach(e => {
        const author = e.querySelector('.c2 .c3').textContent
        const scoreTail = e.querySelectorAll('.c2 .nosel')
        const score = scoreTail[scoreTail.length - 1].textContent
        let content = e.querySelector('.c6').innerHTML
        content = content.replace(/<br>/gi, '\n')
        content = content.replace(/<.+?>/gi, '')
        content = he.decode(content)
        comments.value.push({
          author, score, content, id: nanoid()
        })
      })
    })
    .catch(err => {
      comments.value = []
      console.log(err)
    })
  } else {
    comments.value = []
  }
}

const editingTag = ref(false)
const tagGroup = ref({})
const editTags = () => {
  editingTag.value = !editingTag.value
  if (editingTag.value) {
    if (!_.has(bookDetail.value, 'tags')) bookDetail.value.tags = {}
    const tempTagGroup = {}
    _.forEach(bookList.value.map(b => b.tags), (tagObject) => {
      _.forIn(tagObject, (tagArray, tagCat) => {
        if (_.isArray(tagArray)) {
          if (_.has(tempTagGroup, tagCat)) {
            tagArray.forEach(tag => tempTagGroup[tagCat].add(tag))
          } else {
            tempTagGroup[tagCat] = new Set(tagArray)
          }
        }
      })
    })
    const showTranslation = setting.value.showTranslation
    _.forIn(tempTagGroup, (tagSet, tagCat) => {
      tempTagGroup[tagCat] = [...tagSet].sort().map(tag => ({
        value: tag,
        label: `${showTranslation ? (resolvedTranslation.value[tag]?.name || tag ) + ' || ' : ''}${tag}`
      }))
    })
    tagGroup.value = tempTagGroup
  } else {
    saveBookTags(bookDetail.value)
  }
}
const saveBookTags = (book) => {
  _.forIn(book.tags, (tagarr, tagCat) => {
    if (_.isEmpty(tagarr)) {
      delete book.tags[tagCat]
    }
  })
  saveBook(book)
}
const addTagCat = () => {
  ElMessageBox.prompt(t('c.inputCategoryName'), t('m.addCategory'), {
    inputPattern: /^[\w\d一-龟]+$/,
    inputErrorMessage: t('c.categoryNameError')
  })
  .then(({ value }) => {
    tagGroup.value[value] = []
  })
  .catch(() => {
    printMessage('info', t('c.canceled'))
  })
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

const onMangaCommentContextMenu = (e, comment) => {
  e.preventDefault()
  const foundLink = linkify.find(comment, 'url')
  if (!_.isEmpty(foundLink)) {
    const items = foundLink.map(l => ({
      label: `${t('c.redirect')} ${l.href}`,
      onClick: () => {
        ipcRenderer.invoke('open-url', l.href)
      }
    }))
    ContextMenu.showContextMenu({
      x: e.x,
      y: e.y,
      items
    })
  }
}

defineExpose({
  dialogVisibleBookDetail,
  editingTag,
  openBookDetail,
  openLocalBook,
  rescanBook,
  getComments,
  showFile,
  deleteLocalBook,
  triggerHiddenBook,
})

</script>

<style lang="stylus">
.el-dialog.is-fullscreen.dialog-detail
  .el-dialog__header
    .el-dialog__headerbtn
      margin: 8px 16px 0 0
      .el-icon
        width: 32px
        svg
          height: 32px
          width: 32px

.text-red
  color: red !important

.detail-book-title
  height: 44px
  overflow-y: hidden
  margin: 0 24px
.url-link
  cursor: pointer
.book-detail-card
  .book-detail-function, .book-detail-rate
    justify-content: center
    margin-bottom: 10px
  .book-detail-cover-frame
    position: relative
    width: 250px
    margin: 0 auto
    margin-bottom: 10px
    .book-detail-cover
      width: 250px
      height: 354px
      object-fit: cover
      border-radius: 4px
    .next-manga-pane, .prev-manga-pane
      position: absolute
      bottom: 80px
      cursor: pointer
      opacity: 0
      transition-delay: 0.5s
      background-color: rgba(0, 0, 0, 0.3)
      .el-icon
        font-size: 34px
        margin: 80px 0
        color: #FFFFFF
    .next-manga-pane
      right: 0
      border-radius: 4px 0 0 4px
    .prev-manga-pane
      left: 0
      border-radius: 0 4px 4px 0
    .next-manga-pane:hover, .prev-manga-pane:hover
      opacity: 1
      transition-delay: 0s
    .book-detail-star
      position: absolute
      cursor: pointer
      right: -6px
      top: -14px
  .edit-line
    margin: 4px 0
    .el-select, .el-select-v2
      width: 100%
  .el-descriptions__label
    display: inline-block
    text-align: right
    width: 80px
.book-tag-edit-popover
  .el-descriptions__cell
    padding-bottom: 0 !important
  .el-descriptions__label
    display: inline-block
    text-align: right
    width: 65px
.book-tag-frame
  height: calc(100vh - 100px)
  overflow-y: auto
  padding-right: 10px
  text-align: left
.book-tag
  margin: 4px 6px
  cursor: pointer
.tag-edit-buttons
  margin-top: 4px
.book-comment-frame
  text-align: left
  height: calc(100vh - 100px)
  overflow-y: auto
  padding-right: 10px
  .book-comment
    .book-comment-postby
      font-size: 12px
      background-color: var(--el-fill-color-dark)
      padding-left: 4px
      color: var(--el-text-color-regular)
    .book-comment-score
      float: right
      margin-right: 4px
    .book-comment-content
      font-size: 14px
      white-space: pre-wrap
      padding-left: 4px
      color: var(--el-text-color-regular)
</style>