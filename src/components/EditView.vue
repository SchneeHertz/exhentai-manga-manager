<template>
  <el-col :span="20" v-if="editCollectionView" class="book-collect-view"
    @mousedown="handleMouseDownForSelection" @mouseup="handleMouseUpForSelection('collect')" @mousemove="handleMouseMoveForSelection"
  >
    <div
      v-for="book in visibleChunkDisplayBookListForCollectView" :key="book.id"
      v-lazy:[book.id]="loadBookCardContent"
      class="book-collect-card-frame"
    >
      <transition name="pop">
        <el-badge
          v-if="visibilityMap[book.id]"
          :value="book.collected ? '✓' : '+'"
          :type="book.collected ? 'success' : 'warning'"
          class="book-add-badge"
        >
          <div class="book-collect-card selectable-card" :id="book.id" @click="handleClickCollectBadge(book)">
            <p class="book-collect-title" :title="getDisplayTitle(book)">{{getDisplayTitle(book)}}</p>
            <img class="book-collect-cover" :src="book.coverPath"/>
          </div>
        </el-badge>
      </transition>
    </div>
  </el-col>
  <el-col :span="4" v-if="editCollectionView" class="book-collection">
    <el-select v-model="selectCollection" class="book-collection-select" filterable @change="handleSelectCollectionChange">
      <el-option v-for="collection in collectionList" :key="collection.id" :value="collection.id" :label="collection.title"></el-option>
    </el-select>
    <div>
      <draggable
        v-model="displaySelectCollectionList"
        item-key="id"
        animation="200"
      >
        <template #item="{element}">
          <div class="book-collection-line">
            <img class="book-collection-cover" :src="element.coverPath" />
            <p
              class="book-collection-title"
              :title="getDisplayTitle(element)"
            >{{getDisplayTitle(element)}}</p>
            <el-icon :size="20" color="#FF0000" class="book-collection-remove" @click="handleClickCollectBadge(element)"><IosRemoveCircleOutline /></el-icon>
          </div>
        </template>
      </draggable>
    </div>
  </el-col>
  <el-col :span="20" v-if="editTagView" class="book-tag-edit-view"
    @mousedown="handleMouseDownForSelection" @mouseup="handleMouseUpForSelection('tag')" @mousemove="handleMouseMoveForSelection"
  >
    <div
      v-for="book in visibleChunkDisplayBookListForEditTagView" :key="book.id"
      v-lazy:[book.id]="loadBookCardContent"
      class="book-tag-edit-card-frame"
    >
      <transition name="pop">
        <el-badge
          v-if="visibilityMap[book.id]"
          :value="book.selected ? '✓' : '+'"
          :type="book.selected ? 'success' : 'warning'"
          class="book-add-badge"
        >
          <div class="book-tag-edit-card selectable-card" @contextmenu="$emit('previewManga', book)" :id="book.id" @click="handleSelectBookBadge(book)">
            <p class="book-tag-edit-title" :title="getDisplayTitle(book)">{{getDisplayTitle(book)}}</p>
            <el-popover placement="left" :width="300" trigger="hover" :show-after="1000" :hide-after="100">
              <template #reference>
                <img class="book-tag-edit-cover" :src="book.coverPath"/>
              </template>
              <el-descriptions :column="1" size="small" class="book-tag-edit-popover">
                <el-descriptions-item :label="$t('m.pageCount')+':'">
                  <el-tag class="book-tag" :type="book.pageDiff ? 'danger' : 'info'">{{book.pageCount}} | {{book.filecount}}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('m.metadataStatus')+':'">
                  <el-tag class="book-tag" :type="book.status === 'non-tag' ? 'info' : book.status === 'tagged' ? 'success' : 'warning'"
                  @click="$emit('searchFromTag', book.status)">{{book.status}}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('m.category')+':'">
                  <el-tag type="info" class="book-tag" @click="$emit('searchFromTag', book.category)">{{book.category}}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item v-for="(tagArr, key) in book.tags" :label="key + ':'" :key="key">
                  <el-tag type="info" class="book-tag" v-for="tag in tagArr" :key="tag" @click="$emit('searchFromTag', tag, key)"
                  >{{resolvedTranslation[tag] ? resolvedTranslation[tag].name : tag }}</el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-popover>
          </div>
        </el-badge>
      </transition>
    </div>
  </el-col>
  <el-col :span="4" v-if="editTagView" class="book-tag-edit-operation" v-loading="updateTagsLoading">
    <el-space wrap class="book-tag-edit-buttons">
      <el-button type="primary" plain @click="selectAllForGroupTag">{{$t('m.selectAll')}}</el-button>
      <el-button type="primary" plain @click="unselectAllForGroupTag">{{$t('m.unselectAll')}}</el-button>
    </el-space>
    <el-divider content-position="left">{{$t('m.tag')}}</el-divider>
    <el-select-v2
      v-model="groupTagSelected"
      filterable clearable multiple :reserve-keyword="false" :height="340"
      :options="tagListForSelect"
    ></el-select-v2>
    <el-space wrap class="book-tag-edit-buttons">
      <el-button type="primary" plain @click="addTagToGroup">{{$t('m.addGroupTag')}}</el-button>
      <el-button type="primary" @click="removeTagToGroup" plain>{{$t('m.removeGroupTag')}}</el-button>
    </el-space>
    <el-divider content-position="left">{{$t('m.category')}}</el-divider>
    <el-select v-model="categorySelected" :placeholder="$t('m.category')" clearable>
      <el-option v-for="cat in categoryOption" :value="cat" :key="cat" :label="cat" />
    </el-select>
    <el-space wrap class="book-tag-edit-buttons">
      <el-button type="primary" plain @click="applyCategory">{{$t('m.apply')}}</el-button>
    </el-space>
    <el-divider content-position="left">{{$t('m.metadataStatus')}}</el-divider>
    <el-select v-model="statusSelected" :placeholder="$t('m.metadataStatus')">
      <el-option v-for="status in statusOption" :value="status" :key="status" :label="status" />
    </el-select>
    <el-space wrap class="book-tag-edit-buttons">
      <el-button type="primary" plain @click="applyStatus">{{$t('m.apply')}}</el-button>
    </el-space>
    <el-divider content-position="left">{{$t('m.other')}}</el-divider>
    <el-space wrap class="book-tag-edit-buttons">
      <el-button type="primary" plain @click="groupGetMetadata">{{$t('m.batchGetMetadata')}}</el-button>
      <el-button type="danger" plain @click="groupDeleteLocalBook">{{$t('m.deleteFile')}}</el-button>
      <el-button type="primary" plain @click="groupRescanBook">{{$t('m.rescan')}}</el-button>
      <el-button type="primary" plain @click="groupTriggerHiddenBook(false)">{{$t('m.showManga')}}</el-button>
      <el-button type="primary" plain @click="groupTriggerHiddenBook(true)">{{$t('m.hideManga')}}</el-button>
    </el-space>
  </el-col>
  <div id="selection-box" ref="selectionBox"></div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox } from 'element-plus'
import { IosRemoveCircleOutline } from '@vicons/ionicons4'
import draggable from 'vuedraggable'
import { nanoid } from 'nanoid'

import { storeToRefs } from 'pinia'
import { useAppStore } from '../pinia.js'
const appStore = useAppStore()
const {
  cat2letter,
  statusOption,
  categoryOption,
  setting,
  resolvedTranslation,
  bookList,
  displayBookList,
  chunkDisplayBookList,
  collectionList,
  openCollectionBookList,
  editCollectionView,
  editTagView,
  tagListForSelect,
  visibleChunkDisplayBookListForCollectView,
  visibleChunkDisplayBookListForEditTagView,
 } = storeToRefs(appStore)
const { getDisplayTitle, saveBook, printMessage } = appStore

const { t } = useI18n()

const emit = defineEmits(['previewManga', 'searchFromTag', 'loadBookList', 'getBooksMetadata', 'handleRemoveBookDisplay'])

const visibilityMap = ref({})
const loadBookCardContent = (id) => {
  visibilityMap.value[id] = true
}
const selectBookList = ref([])

const selectCollection = ref(null)
const selectCollectionObject = ref({ list: [] })
const displaySelectCollectionList = computed({
  get () {
    const list = selectCollectionObject.value.list.map(hash_id => _.filter(bookList.value, book => book.hash === hash_id || book.id === hash_id))
    return _.compact(_.flatten(list))
  },
  set (val) {
    const list = [...new Set(val.map(b => b.hash))]
    selectCollectionObject.value.list = list
  }
})

const enterEditCollectionView = () => {
  visibilityMap.value = {}
  editCollectionView.value = true
  if (selectCollection.value) handleSelectCollectionChange(selectCollection.value)
}

const exitCollectionView = () => {
  visibilityMap.value = {}
  editCollectionView.value = false
}

const addCollection = () => {
  ElMessageBox.prompt(t('c.inputCollectionName'), t('m.addCollection'), {})
    .then(({ value }) => {
      const id = nanoid()
      collectionList.value.push({
        id,
        title: value,
        list: []
      })
      selectCollection.value = id
      handleSelectCollectionChange(selectCollection.value)
    })
    .catch(() => {
      printMessage('info', t('c.canceled'))
    })
}

const editCollection = () => {
  if (_.has(selectCollectionObject.value, 'title')) {
    ElMessageBox.prompt(t('c.inputCollectionName'), t('m.editCollection'), {
      inputValue: selectCollectionObject.value.title,
      cancelButtonText: t('c.deleteCollection'),
      distinguishCancelAndClose: true
    })
      .then(({ value }) => {
        selectCollectionObject.value.title = value
      })
      .catch((action) => {
        if (action === 'cancel') {
          deleteCollection()
        } else {
          printMessage('info', t('c.canceled'))
        }
      })
  }
}

const deleteCollection = () => {
  collectionList.value = _.filter(collectionList.value, c => c.id !== selectCollection.value)
  selectCollection.value = undefined
  selectCollectionObject.value = { list: [] }
  _.forEach(displayBookList.value, book => {
    book.collected = false
  })
}

const saveCollection = async () => {
  collectionList.value = _.filter(collectionList.value, c => !_.isEmpty(_.compact(c.list)))
  await ipcRenderer.invoke('save-collection-list', _.cloneDeep(collectionList.value))
  emit('loadBookList', false)
  selectCollection.value = undefined
  selectCollectionObject.value = { list: [] }
  editCollectionView.value = false
}

const handleSelectCollectionChange = (val) => {
  selectCollectionObject.value = _.find(collectionList.value, { id: val })
  _.forEach(displayBookList.value, book => {
    if (!book.isCollection) {
      if (selectCollectionObject.value.list.includes(book.id) || selectCollectionObject.value.list.includes(book.hash)) {
        book.collected = true
      } else {
        book.collected = false
      }
    }
  })
}

const handleClickCollectBadge = (book) => {
  const findBooks = _.filter(displayBookList.value, b => b.id === book.hash || b.hash === book.hash)
  if (book.collected) {
    findBooks.forEach(book => book.collected = false)
    selectCollectionObject.value.list = _.filter(selectCollectionObject.value.list, hash => hash !== book.id && hash !== book.hash)
  } else {
    findBooks.forEach(book => book.collected = true)
    selectCollectionObject.value.list.push(book.hash)
  }
}


const groupTagSelected = ref([])
const categorySelected = ref(null)
const statusSelected = ref('tagged')

// group edit tags viewer
const enterEditTagView = () => {
  visibilityMap.value = {}
  editTagView.value = true
  selectBookList.value = []
  displayBookList.value.forEach(book => book.selected = false)
}

const exitEditTagView = () => {
  visibilityMap.value = {}
  editTagView.value = false
}

const handleSelectBookBadge = (book) => {
  if (book.selected) {
    book.selected = false
    selectBookList.value = _.filter(selectBookList.value, b => b.id !== book.id)
  } else {
    book.selected = true
    selectBookList.value.push(book.id)
  }
}

const selectionBox = ref(null)
const isSelecting = ref(false)
const startX = ref(undefined)
const startY = ref(undefined)

const handleMouseDownForSelection = (e) => {
  isSelecting.value = true
  startX.value = e.pageX
  startY.value = e.pageY
  selectionBox.value.style.left = `${startX.value}px`
  selectionBox.value.style.top = `${startY.value}px`
  selectionBox.value.style.width = `0px`
  selectionBox.value.style.height = `0px`
  selectionBox.value.style.display = 'block'
  e.preventDefault()
}

const handleMouseMoveForSelection = (e) => {
  if (isSelecting.value) {
    const endX = e.pageX
    const endY = e.pageY
    const left = Math.min(endX, startX.value)
    const top = Math.min(endY, startY.value)
    const width = Math.abs(endX - startX.value)
    const height = Math.abs(endY - startY.value)
    selectionBox.value.style.left = `${left}px`
    selectionBox.value.style.top = `${top}px`
    selectionBox.value.style.width = `${width}px`
    selectionBox.value.style.height = `${height}px`
  }
}

const handleMouseUpForSelection = (view) => {
  const rect = selectionBox.value.getBoundingClientRect()
  if (rect.width > 10 || rect.height > 10) {
    document.querySelectorAll('.selectable-card').forEach(item => {
      const itemRect = item.getBoundingClientRect()
      if (
        itemRect.left < rect.right &&
        itemRect.right > rect.left &&
        itemRect.top < rect.bottom &&
        itemRect.bottom > rect.top
      ) {
        const book = chunkDisplayBookList.value.find(book => book.id === item.id)
        if (view === 'tag') {
          if (book.selected) {
            book.selected = false
            selectBookList.value = _.filter(selectBookList.value, id => id !== item.id)
          } else {
            book.selected = true
            selectBookList.value.push(item.id)
          }
        } else if (view === 'collect') {
          const findBooks = _.filter(displayBookList.value, b => b.id === book.hash || b.hash === book.hash)
          if (book.collected) {
            findBooks.forEach(book => book.collected = false)
            selectCollectionObject.value.list = _.filter(selectCollectionObject.value.list, hash => hash !== book.id && hash !== book.hash)
          } else {
            findBooks.forEach(book => book.collected = true)
            selectCollectionObject.value.list.push(book.hash)
          }
        }
      }
    })
  }
  isSelecting.value = false
  selectionBox.value.style.display = 'none'
}

const selectAllForGroupTag = () => {
  displayBookList.value.forEach(book => {
    if (!book.isCollection && !book.folderHide) {
      book.selected = true
      selectBookList.value.push(book.id)
    }
  })
}

const unselectAllForGroupTag = () => {
  displayBookList.value.forEach(book => {
    book.selected = false
  })
  selectBookList.value = []
}

const resolveGroupTagSelected = () => {
  const letter2cat = _.invert(cat2letter.value)
  let tags = groupTagSelected.value.map(tag => {
    const match = tag.match(/^([\p{L}\d]+):"([- ._()\p{L}\d]+)"\$$/u)
    if (match[1] && match[2]) {
      return {
        category: letter2cat[match[1]] ? letter2cat[match[1]] : match[1],
        tag: match[2]
      }
    } else {
      return null
    }
  })
  tags = _.compact(tags)
  return tags
}


const updateTagsLoading = ref(false)
const addTagToGroup = async () => {
  try {
    updateTagsLoading.value = true
    const tags = resolveGroupTagSelected()
    for (const id of selectBookList.value) {
      const book = _.find(displayBookList.value, { id })
      if (!_.has(book, 'tags')) book.tags = {}
      for (const { category, tag } of tags) {
        if (_.has(book.tags, category)) {
          if (!book.tags[category].includes(tag)) {
            book.tags[category].push(tag)
          }
        } else {
          book.tags[category] = [tag]
        }
      }
      await saveBook(book)
    }
    printMessage('success', t('c.addGroupTagSuccess'))
    updateTagsLoading.value = false
  } catch (e) {
    console.error(e)
    printMessage('error', t('c.groupTagError'))
    updateTagsLoading.value = false
  }
}

const removeTagToGroup = async () => {
  try {
    updateTagsLoading.value = true
    const tags = resolveGroupTagSelected()
    for (const id of selectBookList.value) {
      const book = _.find(displayBookList.value, { id })
      for (const { category, tag } of tags) {
        if (_.has(book.tags, category)) {
          book.tags[category] = _.filter(book.tags[category], t => t !== tag)
        }
      }
      await saveBook(book)
    }
    printMessage('success', t('c.removeGroupTagSuccess'))
    updateTagsLoading.value = false
  } catch (e) {
    console.error(e)
    printMessage('error', t('c.groupTagError'))
    updateTagsLoading.value = false
  }
}

const applyCategory = async () => {
  try {
    updateTagsLoading.value = true
    for (const id of selectBookList.value) {
      const book = _.find(displayBookList.value, { id })
      book.category = categorySelected.value
      await saveBook(book)
    }
    printMessage('success', t('c.applied'))
    updateTagsLoading.value = false
  } catch (e) {
    console.error(e)
    printMessage('error', t('c.applyError'))
    updateTagsLoading.value = false
  }
}

const applyStatus = async () => {
  try {
    updateTagsLoading.value = true
    for (const id of selectBookList.value) {
      const book = _.find(displayBookList.value, { id })
      book.status = statusSelected.value
      await saveBook(book)
    }
    printMessage('success', t('c.applied'))
    updateTagsLoading.value = false
  } catch (e) {
    console.error(e)
    printMessage('error', t('c.applyError'))
    updateTagsLoading.value = false
  }
}

const groupGetMetadata = async () => {
  try {
    updateTagsLoading.value = true
    const bookList = _.compact(selectBookList.value.map(id => _.find(displayBookList.value, { id })))
    emit('getBooksMetadata', bookList, setting.value.requireGap || 10000, () => {
      updateTagsLoading.value = false
    })
  } catch (error) {
    console.error(error)
    updateTagsLoading.value = false
  }
}

const groupDeleteLocalBook = () => {
  ElMessageBox.confirm(
    t('c.confirmDelete'),
    '',
    {}
  )
  .then(async () => {
    updateTagsLoading.value = true
    for (const id of selectBookList.value) {
      const book = _.find(displayBookList.value, { id })
      if (book) {
        await ipcRenderer.invoke('delete-local-book', book.filepath)
        .finally(async () => {
          if (book.collectionHide) {
            _.forEach(collectionList.value, (collection) => {
              collection.list = _.filter(collection.list, hash_id => hash_id !== book.id && hash_id !== book.hash)
            })
            openCollectionBookList.value = _.filter(openCollectionBookList.value, bookOfCollection => {
              return bookOfCollection.id !== book.id && bookOfCollection.id !== book.hash
            })
            await saveCollection()
          } else {
            const findBookInBookList = _.findIndex(bookList.value, b => b.filepath === book.filepath)
            bookList.value.splice(findBookInBookList, 1)
            displayBookList.value = _.filter(displayBookList.value, b => b.filepath !== book.filepath)
            emit('handleRemoveBookDisplay')
          }
        })
      }
    }
  })
  .finally(() => {
    unselectAllForGroupTag()
    updateTagsLoading.value = false
  })
}

const groupRescanBook = async () => {
  try {
    updateTagsLoading.value = true
    for (const id of selectBookList.value) {
      const book = _.find(displayBookList.value, { id })
      if (book) {
        const bookInfo = await ipcRenderer.invoke('patch-local-metadata-by-book', _.cloneDeep(book))
        _.assign(book, bookInfo)
        await saveBook(book)
      }
    }
    printMessage('success', t('c.rescanSuccess'))
    updateTagsLoading.value = false
  } catch (error) {
    console.error(error)
    updateTagsLoading.value = false
  }
}

const groupTriggerHiddenBook = async (val) => {
  try {
    updateTagsLoading.value = true
    for (const id of selectBookList.value) {
      const book = _.find(displayBookList.value, { id })
      if (book) {
        book.hiddenBook = val
        await saveBook(book)
      }
    }
    updateTagsLoading.value = false
  } catch (error) {
    console.error(error)
    updateTagsLoading.value = false
  }
}

defineExpose({
  selectCollection,
  selectBookList,
  enterEditCollectionView,
  addCollection,
  editCollection,
  saveCollection,
  exitCollectionView,
  enterEditTagView,
  exitEditTagView,
})
</script>

<style lang="stylus">
.pop-enter-active, .pop-leave-active
  transition: opacity 0.3s ease

.pop-enter-from, .pop-leave-to
  opacity: 0

.book-collect-view, .book-collection, .book-tag-edit-view, .book-tag-edit-operation
    height: calc(100vh - 96px)
    overflow-x: auto
    padding-top: 4px

.book-collect-card-frame, .book-tag-edit-card-frame
  display: inline-block
  min-width: 138px
  min-height: 229px
.book-collect-card, .book-tag-edit-card
  width: 138px
  height: 229px
  border: solid 1px var(--el-border-color)
  border-radius: 4px
  margin: 6px 6px
  position: relative
.book-add-badge
  .el-badge__content.is-fixed
    top: 6px
    right: 17px
    cursor: pointer
.book-collect-title, .book-tag-edit-title
  height: 38px
  overflow-y: hidden
  margin: 4px 2px
  font-size: 10px
.book-collect-cover, .book-tag-edit-cover
  border-radius: 4px
  width: 125px
  height: 177px
  object-fit: cover
.book-collection
  .book-collection-select
    width: 100%
  .book-collection-line
    text-align:left
    width: 100%
    height: 79px
    border: solid 1px var(--el-border-color)
    border-radius: 4px
    margin: 2px 0
    position: relative
    .book-collection-cover
      border-radius: 2px
      width: 50px
      height: 71px
      position: absolute
      top: 4px
      left: 2px
      object-fit: cover
    .book-collection-title
      height: 72px
      overflow-y: hidden
      margin: 4px 4px 4px 54px
      font-size: 12px
    .book-collection-remove
      position: absolute
      bottom: 2px
      right: 2px
      cursor: pointer

.book-tag-edit-operation
  .el-select-v2
    width: 100%
  .book-tag-edit-buttons
    width: 100%
    margin-top: 10px

#selection-box
  position: fixed
  border: 2px dashed #00f
  display: none
  pointer-events: none
  user-select: none
</style>