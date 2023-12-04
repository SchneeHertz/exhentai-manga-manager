<template>
  <el-config-provider :locale="locale">
    <div id="progressbar" :style="{ width: progress + '%' }"></div>
    <el-row :gutter="20" class="book-search-bar">
      <el-col :span="1" :offset="2">
        <el-button type="primary" :icon="TreeViewAlt" plain @click="geneFolderTree" :title="$t('m.folderTree')"></el-button>
      </el-col>
      <el-col :span="8">
        <el-autocomplete
          :model-value="searchString"
          :fetch-suggestions="querySearch"
          @keyup.enter="searchBook"
          @change="handleSearchStringChange"
          @select="handleSearchBoxSelect"
          @input="handleInput"
          clearable
          class="search-input"
          v-if="setting.advancedSearch"
        >
          <template #default="{ item }">
            <span class="autocomplete-label">{{ item.label }}</span>
            <span class="autocomplete-value">{{ item.value }}</span>
          </template>
        </el-autocomplete>
        <el-autocomplete
          v-model="searchString"
          :fetch-suggestions="querySearchLegacy"
          @keyup.enter="searchBook"
          @change="handleSearchStringChange"
          clearable
          class="search-input"
          v-else
        >
          <template #default="{ item }">
            <span class="autocomplete-label">{{ item.label }}</span>
            <span class="autocomplete-value">{{ item.value }}</span>
          </template>
        </el-autocomplete>
      </el-col>
      <el-col :span="1">
        <el-button type="primary" :icon="Search32Filled" plain @click="searchBook" :title="$t('m.search')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button :icon="MdShuffle" plain @click="shuffleBook" :title="$t('m.shuffle')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button type="primary" :icon="MdRefresh" plain @click="loadBookList(true)" :title="$t('m.manualScan')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button type="primary" :icon="MdCodeDownload" plain @click="getBookListMetadata('exhentai')" :title="$t('m.batchGetExMetadata')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button :icon="MdBulb" plain @click="$refs.TagGraphRef.displayTagGraph()" :title="$t('m.tagAnalysis')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button :icon="SettingIcon" plain @click="$refs.SettingRef.dialogVisibleSetting = true" :title="$t('m.setting')"></el-button>
      </el-col>
      <el-col :span="3">
        <el-select :placeholder="$t('m.sort')" @change="handleSortChange" clearable v-model="sortValue">
          <el-option :label="$t('m.bookmarkOnly')" value="mark"></el-option>
          <el-option :label="$t('m.collectionOnly')" value="collection"></el-option>
          <el-option :label="$t('m.hiddenOnly')" value="hidden"></el-option>
          <el-option :label="$t('m.shuffle')" value="shuffle"></el-option>
          <el-option :label="$t('m.addTimeAscend')" value="addAscend"></el-option>
          <el-option :label="$t('m.addTimeDescend')" value="addDescend"></el-option>
          <el-option :label="$t('m.mtimeAscend')" value="mtimeAscend"></el-option>
          <el-option :label="$t('m.mtimeDescend')" value="mtimeDescend"></el-option>
          <el-option :label="$t('m.postTimeAscend')" value="postAscend"></el-option>
          <el-option :label="$t('m.postTimeDescend')" value="postDescend"></el-option>
          <el-option :label="$t('m.ratingAscend')" value="scoreAscend"></el-option>
          <el-option :label="$t('m.ratingDescend')" value="scoreDescend"></el-option>
          <el-option :label="$t('m.artistAscend')" value="artistAscend"></el-option>
          <el-option :label="$t('m.artistDescend')" value="artistDescend"></el-option>
          <el-option :label="$t('m.titleAscend')" value="titleAscend"></el-option>
          <el-option :label="$t('m.titleDescend')" value="titleDescend"></el-option>
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-row :gutter="20">
          <el-col :span="6"  v-if="!editCollectionView">
            <el-button plain @click="createCollection" :icon="CicsSystemGroup" :title="$t('m.manageCollection')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editCollectionView">
            <el-button type="primary" plain @click="addCollection" :icon="Collections20Filled" :title="$t('m.addCollection')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editCollectionView">
            <el-button type="primary" plain @click="renameCollection" :icon="Rename16Regular" :title="$t('m.renameCollection')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editCollectionView">
            <el-button type="primary" plain @click="saveCollection" :icon="MdSave" :title="$t('m.save')"></el-button>
          </el-col>
        </el-row>
      </el-col>
    </el-row>
    <el-row :gutter="20" class="book-card-area">
      <el-col :span="24" v-show="!editCollectionView" class="book-card-list">
        <div
          v-for="(book, index) in visibleChunkDisplayBookList"
          :key="book.id"
          class="book-card-frame"
        >
          <!-- show book card when book isn't a collection, book isn't hidden because collected,
            and book isn't hidden by user except sorting by onlyHiddenBook
            and book isn't hidden by folder select -->
          <div
            class="book-card"
            v-if="!book.isCollection && !book.collectionHide && (sortValue === 'hidden' || !book.hiddenBook) && !book.folderHide"
            :tabindex="index + 1"
          >
            <p class="book-title"
              @click="openBookDetail(book)"
              @contextmenu="onMangaTitleContextMenu($event, book)"
              :title="getDisplayTitle(book)"
            >{{getDisplayTitle(book)}}</p>
            <img
              class="book-cover"
              :src="book.coverPath"
              @click="handleClickCover(book)"
              @contextmenu="onBookContextMenu($event, book)"
            />
            <el-tag class="book-card-language" size="small" type="danger" v-show="isChineseTranslatedManga(book)">ZH</el-tag>
            <el-tag class="book-card-pagecount" size="small" type="info">{{ book.pageCount }}P</el-tag>
            <el-icon
              :size="30"
              :color="book.mark ? '#E6A23C' : '#666666'"
              class="book-card-mark" @click="switchMark(book)"
            ><BookmarkTwotone /></el-icon>
            <el-button-group class="outer-read-button-group">
              <el-button type="success" size="small" class="outer-read-button" plain @click="openLocalBook(book)">{{$t('m.re')}}</el-button>
              <el-button type="success" size="small" class="outer-read-button" plain @click="$refs.InternalViewerRef.viewManga(book)">{{$t('m.ad')}}</el-button>
            </el-button-group>
            <el-tag
              class="book-status-tag"
              effect="plain"
              :type="book.status === 'non-tag' ? 'info' : book.status === 'tagged' ? 'success' : 'warning'"
              @click="searchFromTag(book.status)"
            >{{book.status}}</el-tag>
            <el-rate v-model="book.rating" size="small" allow-half @change="saveBook(book)"/>
          </div>
          <div
            class="book-card"
            v-if="book.isCollection && !book.folderHide"
            :tabindex="index + 1"
          >
            <el-tag effect="dark" type="warning" class="book-collection-tag">{{$t('m.collection')}}</el-tag>
            <p class="book-title" :title="book.title">{{book.title}}</p>
            <img class="book-cover" :src="book.coverPath" @click="openCollection(book)"/>
            <el-icon :size="30" :color="book.mark ? '#E6A23C' : '#666666'" class="book-card-mark"><BookmarkTwotone /></el-icon>
            <el-rate v-model="book.rating" size="small" allow-half disabled/>
          </div>
        </div>
      </el-col>
      <el-col :span="18" v-show="editCollectionView" class="book-collect">
        <el-badge
          :value="book.collected ? '✓' : '+'"
          :type="book.collected ? 'success' : 'warning'"
          v-for="book in chunkDisplayBookList" :key="book.id"
          class="book-add-badge"
          @click="handleClickCollectBadge(book)"
          v-show="!book.isCollection && !book.folderHide && !book.hiddenBook"
        >
          <div class="book-collect-card">
            <p class="book-collect-title" :title="getDisplayTitle(book)">{{getDisplayTitle(book)}}</p>
            <img class="book-collect-cover" :src="book.coverPath"/>
          </div>
        </el-badge>
      </el-col>
      <el-col :span="6" v-show="editCollectionView" class="book-collection">
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
    </el-row>
    <el-row class="pagination-bar">
      <el-pagination
        v-model:currentPage="currentPage"
        v-model:page-size="setting.pageSize"
        :page-sizes="[10, 12, 16, 24, 60, 600, 6000]"
        :small="true"
        layout="total, sizes, prev, pager, next, jumper"
        :total="displayBookCount"
        @size-change="handleSizeChange"
        @current-change="handleCurrentPageChange"
        background
      />
    </el-row>
    <InternalViewer
      ref="InternalViewerRef"
      :setting="setting"
      :key-map="keyMap"
      :book-detail="bookDetail"
      @handle-stop-read-manga="handleStopReadManga"
      @to-next-manga="toNextManga"
      @to-next-manga-random="toNextMangaRandom"
      @use-new-cover="useNewCover"
      @message="printMessage"
    ></InternalViewer>
    <el-drawer v-model="sideVisibleFolderTree"
      direction="ltr"
      :size="setting.folderTreeWidth ? setting.folderTreeWidth : '20%'"
      modal-class="side-tree-modal"
    >
      <el-tree
        :data="folderTreeData"
        :default-expand-all="setting.defaultExpandTree"
        :expand-on-click-node="false"
        @current-change="selectFolderTreeNode"
      ></el-tree>
    </el-drawer>
    <Graph
      ref="TagGraphRef"
      :book-list="bookList"
      :cat2letter="cat2letter"
      :resolved-translation="resolvedTranslation"
      @search="handleSearchTags"
    ></Graph>
    <el-drawer v-model="drawerVisibleCollection"
      direction="btt"
      size="80vh"
      destroy-on-close
      class="collection-drawer"
    >
      <template #header><p class="open-collection-title">{{openCollectionTitle}}</p></template>
      <div
        v-for="(book, index) in openCollectionBookList"
        :key="book.id"
        class="book-card-frame"
      >
        <div class="book-card" :tabindex="index + 1">
          <p
            class="book-title"
            @click="openBookDetail(book)"
            @contextmenu="onMangaTitleContextMenu($event, book)"
            :title="getDisplayTitle(book)"
          >{{getDisplayTitle(book)}}</p>
          <img
            class="book-cover"
            :src="book.coverPath"
            @click="handleClickCover(book)"
            @contextmenu="onBookContextMenu($event, book)"
          />
          <el-tag class="book-card-language" size="small" type="danger" v-show="isChineseTranslatedManga(book)">ZH</el-tag>
          <el-tag class="book-card-pagecount" size="small" type="info">{{ book.pageCount }}P</el-tag>
          <el-icon
            :size="30"
            :color="book.mark ? '#E6A23C' : '#666666'"
            class="book-card-mark"
            @click="switchMark(book)"
          ><BookmarkTwotone /></el-icon>
          <el-button-group class="outer-read-button-group">
            <el-button type="success" size="small" class="outer-read-button" plain @click="openLocalBook(book)">{{$t('m.re')}}</el-button>
            <el-button type="success" size="small" class="outer-read-button" plain @click="$refs.InternalViewerRef.viewManga(book)">{{$t('m.ad')}}</el-button>
          </el-button-group>
          <el-tag
            class="book-status-tag"
            effect="plain"
            :type="book.status === 'non-tag' ? 'info' : book.status === 'tagged' ? 'success' : 'warning'"
            @click="searchFromTag(book.status)"
          >{{book.status}}</el-tag>
          <el-rate v-model="book.rating"  v-if="!book.isCollection" size="small" allow-half @change="saveBook(book)"/>
        </div>
      </div>
    </el-drawer>
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
              @click="openContentView(bookDetail)"
              @contextmenu="openThumbnailView(bookDetail)"
            />
            <el-icon
              :size="30"
              :color="bookDetail.mark ? '#E6A23C' : '#666666'"
              class="book-detail-star" @click="switchMark(bookDetail)"
            ><BookmarkTwotone /></el-icon>
            <div class="next-manga-pane" @click="jumpMangeDetail(1)"><el-icon text><CaretRight20Regular /></el-icon></div>
            <div class="prev-manga-pane" @click="jumpMangeDetail(-1)"><el-icon text><CaretLeft20Regular /></el-icon></div>
          </el-row>
          <el-row :gutter="20" class="book-detail-rate">
            <el-rate v-model="bookDetail.rating" size="large" allow-half @change="saveBook(bookDetail)"/>
          </el-row>
          <el-row class="book-detail-function">
            <el-descriptions :column="1">
              <el-descriptions-item :label="$t('m.pageCount')+':'">
                {{bookDetail.pageCount}} | {{bookDetail.filecount}}
              </el-descriptions-item>
              <el-descriptions-item :label="$t('m.fileSize')+':'">
                {{Math.floor(bookDetail.bundleSize / 1048576)}} | {{Math.floor(bookDetail.filesize / 1048576)}} MB
              </el-descriptions-item>
              <el-descriptions-item :label="$t('m.mtime')+':'">{{new Date(bookDetail.mtime).toLocaleString("zh-CN")}}</el-descriptions-item>
              <el-descriptions-item :label="$t('m.postTime')+':'">{{new Date(bookDetail.posted * 1000).toLocaleString("zh-CN")}}</el-descriptions-item>
            </el-descriptions>
          </el-row>
          <el-row class="book-detail-function">
            <el-button-group style="margin-right: 12px;">
              <el-button type="success" style="padding-right: 0;" plain @click="openLocalBook(bookDetail)">{{$t('m.re')}}</el-button>
              <el-button type="success" style="padding-left: 0;" plain @click="$refs.InternalViewerRef.viewManga(bookDetail)">{{$t('m.ad')}}</el-button>
            </el-button-group>
            <!-- <el-button type="success" plain @click="openLocalBook(bookDetail)">{{$t('m.read')}}</el-button> -->
            <el-button plain @click="triggerShowComment">{{setting.showComment ? $t('m.hideComment') : $t('m.showComment')}}</el-button>
            <el-button type="primary" plain @click="editTags">{{editingTag ? $t('m.showTag') : $t('m.editTag')}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button type="primary" plain
              @click="$refs.SearchDialogRef.openSearchDialog(bookDetail)"
            >{{$t('m.getMetadata')}}</el-button>
            <el-button type="primary" plain @click="triggerHiddenBook(bookDetail)">{{bookDetail.hiddenBook ? $t('m.showManga') : $t('m.hideManga')}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button plain type="danger" @click="deleteLocalBook(bookDetail)">{{$t('m.delete')}}</el-button>
            <el-button plain @click="rescanBook(bookDetail)">{{$t('m.rescan')}}</el-button>
            <el-button plain @click="showFile(bookDetail.filepath)">{{$t('m.openMangaFileLocation')}}</el-button>
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
                  <el-option value="non-tag">non-tag</el-option>
                  <el-option value="tagged">tagged</el-option>
                  <el-option value="tag-failed">tag-failed</el-option>
                </el-select>
              </div>
              <div class="edit-line">
                <el-input v-model="bookDetail.url" :placeholder="$t('m.ehexAddress')" @change="saveBook(bookDetail)"></el-input>
              </div>
              <div class="edit-line">
                <el-select v-model="bookDetail.category" :placeholder="$t('m.category')" @change="saveBook(bookDetail)">
                  <el-option v-for="cat in categoryOption" :value="cat" :key="cat">{{cat}}</el-option>
                </el-select>
              </div>
              <div class="edit-line" v-for="(arr, key) in tagGroup" :key="key">
                <el-select v-model="bookDetail.tags[key]" :placeholder="key" @change="saveBook(bookDetail)"
                  filterable allow-create multiple :filter-method="editTagsFetch(arr)" @focus="editTagFocus($event, arr)">
                  <el-option v-for="tag in editTagOptions" :key="tag.value" :value="tag.value" >{{tag.label}}</el-option>
                </el-select>
              </div>
              <el-button class="tag-edit-button" @click="addTagCat">{{$t('m.addCategory')}}</el-button>
              <el-button class="tag-edit-button" @click="getBookInfo(bookDetail)">{{$t('m.getTagbyUrl')}}</el-button>
              <el-button class="tag-edit-button" @click="copyTagClipboard(bookDetail)">{{$t('m.copyTagClipboard')}}</el-button>
              <el-button class="tag-edit-button" @click="pasteTagClipboard(bookDetail)">{{$t('m.pasteTagClipboard')}}</el-button>
            </div>
            <div v-else>
              <el-descriptions :column="1">
                <el-descriptions-item :label="$t('m.title')+':'">{{bookDetail.title_jpn}}</el-descriptions-item>
                <el-descriptions-item :label="$t('m.englishTitle')+':'">{{bookDetail.title}}</el-descriptions-item>
                <el-descriptions-item :label="$t('m.filename')+':'">{{returnFileNameWithExt(bookDetail.filepath)}}</el-descriptions-item>
                <el-descriptions-item :label="$t('m.category')+':'">
                  <el-tag type="info" class="book-tag" @click="searchFromTag(bookDetail.category)">{{bookDetail.category}}</el-tag>
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
                        @click="searchFromTag(tag, key)"
                      >{{resolvedTranslation[tag] ? resolvedTranslation[tag].name : tag }}</el-tag>
                    </template>
                  </el-popover>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-scrollbar>
        </el-col>
        <el-col :span="8" v-show="setting.showComment">
          <el-scrollbar class="book-comment-frame">
            <div class="book-comment" v-for="comment in comments" :key="comment.id">
              <div class="book-comment-postby">{{comment.author}}<span class="book-comment-score">{{comment.score}}</span></div>
              <p class="book-comment-content" @contextmenu="onMangaCommentContextMenu($event, comment.content)">{{comment.content}}</p>
            </div>
          </el-scrollbar>
        </el-col>
      </el-row>
    </el-dialog>
    <SearchDialog
      ref="SearchDialogRef"
      :cookie="cookie"
      @message="printMessage"
      @resolve-search-result="resolveSearchResult"
    ></SearchDialog>
    <Setting
      ref="SettingRef"
      @update-setting="updateSetting"
      @handle-language-set="handleLanguageSet"
      @message="printMessage"
      @load-book-list="loadBookList"
      @get-book-list-metadata="getBookListMetadata"
      @force-gene-book-list="forceGeneBookList"
      @patch-local-metadata="patchLocalMetadata"
      @export-database="exportDatabase"
      @import-database="importDatabase"
      @import-metadata-from-sqlite="importMetadataFromSqlite"
      @handle-resolve-translation-update="handleResolveTranslationUpdate"
    ></Setting>
  </el-config-provider>
</template>

<script>
import { defineComponent } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting as SettingIcon } from '@element-plus/icons-vue'
import { Collections20Filled, Search32Filled, Rename16Regular, CaretRight20Regular, CaretLeft20Regular } from '@vicons/fluent'
import { MdShuffle, MdBulb, MdSave, IosRemoveCircleOutline, MdInformationCircleOutline, MdRefresh, MdCodeDownload } from '@vicons/ionicons4'
import { BookmarkTwotone } from '@vicons/material'
import { TreeViewAlt, CicsSystemGroup } from '@vicons/carbon'
import he from 'he'
import { nanoid } from 'nanoid'
import draggable from 'vuedraggable'
import * as linkify from 'linkifyjs'

import { getWidth } from './utils.js'

import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import en from 'element-plus/dist/locale/en.mjs'

import NameFormItem from './components/NameFormItem.vue'
import Setting from './components/Setting.vue'
import Graph from './components/Graph.vue'
import InternalViewer from './components/InternalViewer.vue'
import SearchDialog from './components/SearchDialog.vue'

export default defineComponent({
  components: {
    BookmarkTwotone, IosRemoveCircleOutline, CaretRight20Regular, CaretLeft20Regular,
    draggable,
    NameFormItem,
    Setting,
    Graph,
    InternalViewer,
    SearchDialog
  },
  setup () {
    return {
      SettingIcon, Collections20Filled, Search32Filled, MdShuffle, MdBulb, MdSave, MdRefresh, MdCodeDownload,
      TreeViewAlt, CicsSystemGroup, MdInformationCircleOutline, Rename16Regular,
    }
  },
  data () {
    return {
      dialogVisibleBookDetail: false,
      sideVisibleFolderTree: false,
      editCollectionView: false,
      drawerVisibleCollection: false,
      // home
      bookList: [],
      displayBookList: [],
      chunkDisplayBookList: [],
      resolvedTranslation: {},
      locale: zhCn,
      searchString: undefined,
      sortValue: undefined,
      _currentPage: 1,
      folderTreeData: [],
      progress: 0,
      // collection
      selectCollection: undefined,
      selectCollectionObject: {list:[]},
      collectionList: [],
      openCollectionTitle: undefined,
      openCollectionBookList: [],
      // detail
      bookDetail: {},
      comments: [],
      tagGroup: {},
      editingTag: false,
      editTagOptions: [],
      // setting
      setting: {},
      serviceAvailable: true,
      // dict
      cat2letter: {
        language: 'l',
        parody: 'p',
        character: 'c',
        group: 'g',
        artist: 'a',
        female: 'f',
        male: 'm',
        mixed: 'x',
        other: 'o',
        cosplayer: 'cos'
      },
      categoryOption: [
        'Doujinshi',
        'Manga',
        'Artist CG',
        'Game CG',
        'Non-H',
        'Image Set',
        'Western',
        'Cosplay',
        'Asian Porn',
        'Misc',
      ],
      keyMap: {
        normal: {
          next: 'ArrowRight',
          prev: 'ArrowLeft',
          click: 1
        },
        reverse: {
          next: 'ArrowLeft',
          prev: 'ArrowRight',
          click: -1
        }
      }
    }
  },
  computed: {
    displayBookCount () {
      if (this.sortValue === 'hidden') {
        return _.sumBy(this.displayBookList, book => book.hiddenBook ? 1 : 0)
      }
      return _.sumBy(this.displayBookList, book => this.isVisibleBook(book) ? 1 : 0)
    },
    displaySelectCollectionList: {
      get () {
        let list = this.selectCollectionObject.list.map(hash_id=>{
          let findBook = _.find(this.bookList, book => book.hash === hash_id || book.id === hash_id)
          if (findBook) {
            return findBook
          } else {
            return undefined
          }
        })
        return _.compact(list)
      },
      set (val) {
        let list = val.map(b=>b.hash)
        this.selectCollectionObject.list = list
      }
    },
    tagList () {
      return _(this.bookList.map(b=>{
        return _.map(b.tags, (tags, cat)=>{
          return _.map(tags, tag=>`${cat}##${tag}`)
        })
      }))
      .flattenDeep().uniq().sort()
      .map(combinedTag=>{
        let tagArray = _.split(combinedTag, '##')
        let letter = this.cat2letter[tagArray[0]] ? this.cat2letter[tagArray[0]] : tagArray[0]
        let labelHeader = tagArray[0] === 'group' ? '团队' : this.resolvedTranslation[tagArray[0]]?.name || tagArray[0]
        return {
          label: `${labelHeader}:${this.resolvedTranslation[tagArray[1]]?.name || tagArray[1]}`,
          value: `${letter}:"${tagArray[1]}"`
        }
      })
      .value()
    },
    tag2cat () {
      let temp = {}
      _(this.bookList.map(b=>{
        return _.map(b.tags, (tags, cat)=>{
          return _.map(tags, tag=>`${cat}##${tag}`)
        })
      }))
      .flattenDeep().uniq().sort()
      .value()
      .forEach(combinedTag=>{
        let tagArray = _.split(combinedTag, '##')
        temp[tagArray[1]] = tagArray[0]
      })
      return temp
    },
    customOptions () {
      return _.compact(_.get(this.setting, 'customOptions', '').split('\n'))
        .map(str=>({label: str.trim(), value: str.trim().replace(/\s+(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)/g, '|||')}))
    },

    cookie () {
      return `igneous=${this.setting.igneous};ipb_pass_hash=${this.setting.ipb_pass_hash};ipb_member_id=${this.setting.ipb_member_id};star=${this.setting.star}`
    },
    currentPage: {
      get () {
        return this._currentPage
      },
      set (val) {
        let pageLimit = Math.ceil(this.displayBookCount / this.setting.pageSize)
        if (Number.isInteger(val)) {
          if (val < 1) {
            this._currentPage = 1
          } else if (val > pageLimit) {
            this._currentPage = pageLimit
          } else {
            this._currentPage = val
          }
        }
      }
    },
    visibleChunkDisplayBookList () {
      return this.chunkDisplayBookList.filter(book => !book.collectionHide && (this.sortValue === 'hidden' || !book.hiddenBook) && !book.folderHide)
    }
  },
  mounted () {
    ipcRenderer.on('send-message', (event, arg)=>{
      this.printMessage('info', arg)
      if (arg.includes('failed')) {
        console.error(arg)
      } else {
        console.log(arg)
      }
    })
    ipcRenderer.invoke('load-setting')
    .then(async (res) => {
      this.setting = res
      if (this.setting.loadOnStart) {
        await this.loadBookList()
        this.loadBookList(true)
      } else {
        this.loadBookList()
      }
    })
    this.sortValue = localStorage.getItem('sortValue')
    window.addEventListener('keydown', this.resolveKey)
    window.addEventListener('wheel', this.resolveWheel)
    window.addEventListener('mousedown', this.resolveMouseDown)
    ipcRenderer.on('send-action', (event, arg)=>{
      switch (arg.action) {
        case 'setting':
          this.$refs.SettingRef.dialogVisibleSetting = true
          this.$refs.SettingRef.activeSettingPanel = 'general'
          break
        case 'about':
          this.$refs.SettingRef.dialogVisibleSetting = true
          this.$refs.SettingRef.activeSettingPanel = 'about'
          break
        case 'accelerator':
          this.$refs.SettingRef.dialogVisibleSetting = true
          this.$refs.SettingRef.activeSettingPanel = 'accelerator'
          break
        case 'send-progress':
          this.progress = +arg.progress > 1 ? 100 : +arg.progress < 0 ? 0 : +arg.progress * 100
          break
        case 'tag-fail-non-tag-book':
          if (this.currentUI() === 'home') {
            this.displayBookList.forEach(book => {
              if (book.status === 'non-tag' && this.isBook(book) && this.isVisibleBook(book)) {
                book.status = 'tag-failed'
                this.saveBook(book)
              }
            })
          }
          break
      }
    })
  },
  beforeUnmount () {
    window.removeEventListener('keydown', this.resolveKey)
    window.removeEventListener('wheel', this.resolveWheel)
    window.removeEventListener('mousedown', this.resolveMouseDown)
  },
  methods: {
    // base function
    currentUI () {
      if (document.activeElement.tagName === 'INPUT') {
        return 'inputing'
      }
      if (!!document.querySelector('.is-message-box')) {
        return 'message-box'
      }
      if (this.$refs.SettingRef.dialogVisibleSetting) {
        return 'setting'
      }
      if (this.$refs.SearchDialogRef.dialogVisibleEhSearch) {
        return 'search-dialog'
      }
      if (this.$refs.InternalViewerRef.drawerVisibleViewer) {
        if (this.$refs.InternalViewerRef.showThumbnail) {
          return 'viewer-thumbnail'
        } else {
          return 'viewer-content'
        }
      }
      if (this.dialogVisibleBookDetail) {
        if (this.editingTag) {
          return 'edit-tag'
        } else {
          return 'bookdetail'
        }
      }
      if (this.$refs.TagGraphRef.dialogVisibleGraph) {
        return 'tag-graph'
      }
      if (this.sideVisibleFolderTree) {
        return 'folder-tree'
      }
      if (this.editCollectionView) {
        return 'edit-collection'
      }
      if (this.drawerVisibleCollection) {
        return 'collection'
      }
      return 'home'
    },
    jumpBookByTabindex (step, container) {
      try {
        let activeElement = document.activeElement
        if (!document.querySelector(container).contains(activeElement) || !activeElement.classList.contains('book-card')) {
          throw new Error('active element not in container or not book-card')
        }
        let tabIndexNow = activeElement.getAttribute('tabindex')
        let tabIndexNext = parseInt(tabIndexNow) + step
        if (!(tabIndexNext >= 1)) throw new Error('detect illegal tabindex')
        document.querySelector(`${container} div[tabindex="${tabIndexNext}"]`).focus()
      } catch (error) {
        console.log(error)
        document.querySelector(`${container} div[tabindex="1"]`).focus()
      }
    },
    resolveKey (event) {
      let next, prev
      if (this.setting.reverseLeftRight) {
        ;({ next, prev } = this.keyMap.reverse)
      } else {
        ;({ next, prev } = this.keyMap.normal)
      }
      if (this.currentUI() !== 'inputing') {
        if (event.key === 'Backspace') {
          document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))
        }
      }
      if (this.currentUI() === 'viewer-content') {
        if (this.$refs.InternalViewerRef.imageStyleType === 'single' || this.$refs.InternalViewerRef.imageStyleType === 'double') {
          if (event.key === next || event.key === 'ArrowDown') {
            this.$refs.InternalViewerRef.currentImageIndex += 1
          }
          if (event.key === prev || event.key === 'ArrowUp') {
            this.$refs.InternalViewerRef.currentImageIndex -= 1
          }
          if (event.key === 'Home') {
            this.$refs.InternalViewerRef.currentImageIndex = 0
          }
          if (event.key === 'End') {
            if (this.$refs.InternalViewerRef.imageStyleType === 'single') {
              this.$refs.InternalViewerRef.currentImageIndex = this.$refs.InternalViewerRef.viewerImageList.length - 1
            } else if (this.$refs.InternalViewerRef.imageStyleType === 'double') {
              this.$refs.InternalViewerRef.currentImageIndex = this.$refs.InternalViewerRef.viewerImageListDouble.length - 1
            }
          }
        }
        if (this.$refs.InternalViewerRef.imageStyleType === 'double') {
          if (event.key === "/") {
            this.$refs.InternalViewerRef.insertEmptyPageIndex = this.$refs.InternalViewerRef.currentImageIndex
            this.$refs.InternalViewerRef.insertEmptyPage = !this.$refs.InternalViewerRef.insertEmptyPage
          }
        }
        if (this.$refs.InternalViewerRef.imageStyleType === 'scroll') {
          if (event.key === prev || event.key === 'ArrowUp') {
            if (event.ctrlKey) {
              document.querySelector('.viewer-drawer .el-drawer__body').scrollBy(0, - window.innerHeight / 10)
            } else {
              document.querySelector('.viewer-drawer .el-drawer__body').scrollBy(0, - window.innerHeight / 1.2)
            }
          }
          if (event.key === next || event.key === 'ArrowDown') {
            if (event.ctrlKey) {
              document.querySelector('.viewer-drawer .el-drawer__body').scrollBy(0, window.innerHeight / 10)
            } else {
              document.querySelector('.viewer-drawer .el-drawer__body').scrollBy(0, window.innerHeight / 1.2)
            }
          }
          if (event.key === 'Home') {
            document.querySelector('.viewer-drawer .el-drawer__body').scrollTop = 0
          }
          if (event.key === 'End') {
            document.querySelector('.viewer-drawer .el-drawer__body').scrollTop = document.querySelector('.viewer-drawer .el-drawer__body').scrollHeight
          }
        }
      }
      if (this.currentUI() === 'viewer-content' || this.currentUI() === 'viewer-thumbnail') {
        if (event.key === 'PageDown') {
          if (event.shiftKey) {
            this.toNextMangaRandom()
          } else {
            this.toNextManga(1)
          }
        }
        if (event.key === 'PageUp') {
          this.toNextManga(-1)
        }
      }
      if (this.currentUI() === 'bookdetail') {
        if (event.key === 'Enter') {
          event.preventDefault()
          this.$refs.InternalViewerRef.viewManga(this.bookDetail)
        }
        if (event.key === 'Delete') {
          this.deleteLocalBook(this.bookDetail)
        }
        if (event.key === 'PageDown') {
          if (event.shiftKey) {
            this.jumpMangeDetailRandom()
          } else {
            this.jumpMangeDetail(1)
          }
        }
        if (event.key === 'PageUp') {
          this.jumpMangeDetail(-1)
        }
      }
      let bookEachLine = Math.floor(getWidth(document.querySelector('.book-card-area div:first-child'), 'width') / getWidth(document.querySelector('.book-card'), 'full'))
      if (this.currentUI() === 'home') {
        if (event.key === 'Enter') {
          event.preventDefault()
          document.activeElement.querySelector('.book-cover').click()
        }
        if (event.key === 'F5') {
          this.loadBookList(true)
        }
        if (event.key === 'F6' || (event.ctrlKey && event.key === 'l')) {
          document.querySelector('.search-input .el-input__inner').select()
        }
        if (event.ctrlKey && event.key === 's') {
          this.shuffleBook()
        }
        if (event.key === 'PageUp') {
          event.preventDefault()
          this.currentPage -= 1
          this.handleCurrentPageChange(this.currentPage)
        }
        if (event.key === 'PageDown') {
          event.preventDefault()
          this.currentPage += 1
          this.handleCurrentPageChange(this.currentPage)
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          this.jumpBookByTabindex(bookEachLine, '.book-card-area')
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          this.jumpBookByTabindex(-bookEachLine, '.book-card-area')
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          this.jumpBookByTabindex(-1, '.book-card-area')
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          this.jumpBookByTabindex(1, '.book-card-area')
        }
      } else if (this.currentUI() === 'collection') {
        if (event.key === 'Enter') {
          document.activeElement.querySelector('.book-cover').click()
        }
        if (event.key === 'ArrowDown') {
          this.jumpBookByTabindex(bookEachLine, '.collection-drawer')
        }
        if (event.key === 'ArrowUp') {
          this.jumpBookByTabindex(-bookEachLine, '.collection-drawer')
        }
        if (event.key === 'ArrowLeft') {
          this.jumpBookByTabindex(-1, '.collection-drawer')
        }
        if (event.key === 'ArrowRight') {
          this.jumpBookByTabindex(1, '.collection-drawer')
        }
      }
    },
    resolveWheel (event) {
      if (event.ctrlKey) {
        let level = electronFunction['get-zoom-level']()
        if (event.deltaY > 0) {
          electronFunction['set-zoom-level'](level - 1)
        } else {
          electronFunction['set-zoom-level'](level + 1)
        }
      } else if (this.currentUI() === 'viewer-content') {
        if (this.$refs.InternalViewerRef.imageStyleType === 'single' || this.$refs.InternalViewerRef.imageStyleType === 'double') {
          let element = document.querySelector('.viewer-drawer .el-drawer__body')
          if (event.deltaY > 0 && element.scrollTop + element.clientHeight >= element.scrollHeight - 2) {
            this.$refs.InternalViewerRef.currentImageIndex += 1
            element.scrollTop = 0
          } else if (event.deltaY < 0 && element.scrollTop <= 0) {
            this.$refs.InternalViewerRef.currentImageIndex += -1
          }
        }
      }
    },
    resolveMouseDown (event) {
      if (event.button === 3) {
        document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))
      }
    },
    customChunk (list, size, index) {
      let result = []
      let count = 0
      let countIndex = 0
      _.forEach(list, book=>{
        if (countIndex === index) result.push(book)
        if (this.isVisibleBook(book)) count++
        if (count >= size) {
          countIndex++
          count = 0
        }
        if (countIndex > index) return false
      })
      return result
    },
    returnFileName (book) {
      // Windows only
      if (book.type === 'folder') {
        return book.filepath.replace(/^.*\\/g, '')
      } else {
        return book.filepath.replace(/^.*\\|\.[^.]*$/g, '')
      }
    },
    returnFileNameWithExt (filepath) {
      // Windows only
      let matched = /[^\\]+$/.exec(filepath)
      if (matched) {
        return matched[0]
      }
    },
    sortList(label) {
      return (a, b)=>{
        if (_.get(a, label) && _.get(b, label)) {
          if (_.get(a, label) > _.get(b, label)) {
            return -1
          } else if (_.get(a, label) < _.get(b, label)) {
            return 1
          } else {
            return 0
          }
        } else if (_.get(a, label)) {
          return -1
        } else if (_.get(b, label)) {
          return 1
        } else {
          return 0
        }
      }
    },
    printMessage(type, msg) {
      ElMessage.closeAll()
      ElMessage[type]({
        message: msg,
        offset: 50
      })
    },
    async loadBookList (scan) {
      return await ipcRenderer.invoke('load-book-list', scan)
        .then(res => {
          if (this.sortValue) {
            this.bookList = res
          } else {
            this.bookList = res.sort(this.sortList('date'))
          }
          this.loadCollectionList()
        })
    },
    saveBook (book) {
      return ipcRenderer.invoke('save-book', _.cloneDeep(book))
    },
    getDisplayTitle (book) {
      switch (this.setting.displayTitle) {
        case 'englishTitle':
          return book.title
        case 'japaneseTitle':
          return book.title_jpn || book.title
        case 'filename':
          return this.returnFileName(book)
        default:
          return book.title_jpn || book.title || this.returnFileName(book)
      }
    },
    isBook (book) {
      // isCollection mean book is collection
      return !book.isCollection
    },
    isVisibleBook (book) {
      // folderHide mean book hide by not selecting at folder tree
      // collectionHide mean book hide because book in collection
      // hiddenBook mean book hide by user operation
      return !book.folderHide && !book.collectionHide && !book.hiddenBook
    },

    // metadata
    resolveSearchResult (bookId, url, type) {
      let book = _.find(this.bookList, {id: bookId})
      if (type === 'chaika') {
        book.url = `https://panda.chaika.moe${url}`
        this.getBookInfoFromChaika(book)
      } else if (type === 'hentag') {
        book.url = url
        this.getBookInfoFromHentag(book)
      } else {
        book.url = url
        this.getBookInfoFromEh(book)
      }
      this.$refs.SearchDialogRef.dialogVisibleEhSearch = false
    },
    getBookInfoFromChaika (book) {
      let archiveNo = /\d+/.exec(book.url)[0]
      axios.get(`https://panda.chaika.moe/api?archive=${archiveNo}`)
      .then(async res=>{
        _.assign(
          book,
          _.pick(res.data, ['tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category']),
        )
        book.posted = +book.posted
        book.filecount = +book.filecount
        book.rating = +book.rating
        book.title = he.decode(book.title)
        book.title_jpn = he.decode(book.title_jpn)
        let tagObject = _.groupBy(book.tags, tag=>{
          let result = /(.+):/.exec(tag)
          if (result) {
            return /(.+):/.exec(tag)[1]
          } else {
            return 'misc'
          }
        })
        _.forIn(tagObject, (arr, key)=>{
          tagObject[key] = arr.map(tag=>{
            let result = /:(.+)$/.exec(tag)
            if (result) {
              return /:(.+)$/.exec(tag)[1].replaceAll('_', ' ')
            } else {
              return tag.replaceAll('_', ' ')
            }
          })
        })
        book.tags = tagObject
        book.status = 'tagged'
        await this.saveBook(book)
      })
    },
    async getBookInfoFromHentag (book) {
      let { data } = await axios.get(`https://hentag.com/public/api/vault/${book.url.slice(25)}`)
      let tags = {}
      data.language === 11 ? tags['language'] = ['chinese','translated'] : ''
      data.parodies.length > 0 ? tags['parody'] = data.parodies.map(parody=>parody.name) : ''
      data.characters.length > 0 ? tags['character'] = data.characters.map(character=>character.name) : ''
      data.circles.length > 0 ? tags['group'] = data.circles.map(circle=>circle.name) : ''
      data.artists.length > 0 ? tags['artist'] = data.artists.map(artist=>artist.name) : ''
      data.maleTags.length > 0 ? tags['male'] = data.maleTags.map(maleTag=>maleTag.name) : ''
      data.femaleTags.length > 0 ? tags['female'] = data.femaleTags.map(femaleTag=>femaleTag.name) : ''
      if (data.otherTags.length > 0) {
        data.otherTags.forEach(({ name }) => {
          let cat = this.tag2cat[name]
          if (cat) {
            if (tags[cat]) {
              tags[cat].push(name)
            } else {
              tags[cat] = [name]
            }
          } else {
            if (tags['misc']) {
              tags['misc'].push(name)
            } else {
              tags['misc'] = [name]
            }
          }
        })
      }
      _.assign(book, {
        title: data.title,
        posted: Math.floor(data.createdAt / 1000),
        category: this.categoryOption[data.category],
        tags
      })
      book.status = 'tagged'
      await this.saveBook(book)
    },
    getBookInfo (book) {
      if (book.url.startsWith('https://panda.chaika.moe')) {
        this.getBookInfoFromChaika(book)
      } else if (book.url.startsWith('https://hentag.com')) {
        this.getBookInfoFromHentag(book)
      } else {
        this.getBookInfoFromEh(book)
      }
    },
    async getBookInfoFromEh (book) {
      let match = /(\d+)\/([a-z0-9]+)/.exec(book.url)
      ipcRenderer.invoke('post-data-ex', {
        url: 'https://api.e-hentai.org/api.php',
        data: {
          'method': 'gdata',
          'gidlist': [
              [+match[1], match[2]]
          ],
          'namespace': 1
        },
        cookie: this.cookie
      })
      .then(async res=>{
        try {
          _.assign(
            book,
            _.pick(JSON.parse(res).gmetadata[0], ['tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category']),
          )
          book.posted = +book.posted
          book.filecount = +book.filecount
          book.rating = +book.rating
          book.title = he.decode(book.title)
          book.title_jpn = he.decode(book.title_jpn)
          let tagObject = _.groupBy(book.tags, tag=>{
            let result = /(.+):/.exec(tag)
            if (result) {
              return /(.+):/.exec(tag)[1]
            } else {
              return 'misc'
            }
          })
          _.forIn(tagObject, (arr, key)=>{
            tagObject[key] = arr.map(tag=>{
              let result = /:(.+)$/.exec(tag)
              if (result) {
                return /:(.+)$/.exec(tag)[1]
              } else {
                return tag
              }
            })
          })
          book.tags = tagObject
          book.status = 'tagged'
          await this.saveBook(book)
        } catch (e) {
          console.log(e)
          if (_.includes(res, 'Your IP address has been')) {
            book.status = 'non-tag'
            this.printMessage('error', 'Your IP address has been temporarily banned')
            await this.saveBook(book)
            this.serviceAvailable = false
          } else {
            book.status = 'tag-failed'
            this.printMessage('error', 'Get tag failed')
            await this.saveBook(book)
          }
        }
      })
    },
    async getBookInfoFromEhFirstResult (book, server = 'e-hentai') {
      let resolveEhFirstResult = async (book, htmlString)=>{
        try {
          let bookUrl = new DOMParser().parseFromString(htmlString, 'text/html').querySelector('.gl3c.glname>a').getAttribute('href')
          book.url = bookUrl
          await this.getBookInfoFromEh(book)
        } catch (e) {
          console.log(e)
          if (htmlString.includes('Your IP address has been')) {
            book.status = 'non-tag'
            this.printMessage('error', 'Your IP address has been temporarily banned')
            await this.saveBook(book)
            this.serviceAvailable = false
          } else {
            book.status = 'tag-failed'
            this.printMessage('error', 'Get tag failed')
            await this.saveBook(book)
          }
        }
      }
      if (server === 'e-hentai') {
        axios.get(`https://e-hentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`)
        .then(async res=>{
          await resolveEhFirstResult(book, res.data)
        })
      } else if (server === 'exhentai') {
        ipcRenderer.invoke('get-ex-webpage', {
          url: `https://exhentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`,
          cookie: this.cookie
        })
        .then(async res=>{
          await resolveEhFirstResult(book, res)
        })
      }
    },
    getBookListMetadata (server) {
      this.$refs.SettingRef.dialogVisibleSetting = false
      this.serviceAvailable = true
      const timer = ms => new Promise(res => setTimeout(res, ms))
      let bookList
      if (this.setting.batchTagfailedBook) {
        bookList = this.bookList.filter(book=>book.status === 'tag-failed' || book.status === 'non-tag')
      } else {
        bookList = this.bookList.filter(book=>book.status === 'non-tag')
      }
      let load = async (gap) => {
        for (let i = 0; i < bookList.length; i++) {
          ipcRenderer.invoke('set-progress-bar', (i + 1) / bookList.length)
          if (this.serviceAvailable) {
            await this.getBookInfoFromEhFirstResult(bookList[i], server)
            // this.printMessage('info', `Get Metadata ${i+1} of ${this.bookList.length}`)
            await timer(gap)
          }
        }
        ipcRenderer.invoke('set-progress-bar', -1)
      }
      load(this.setting.requireGap || 10000)
    },

    // home header
    shuffleBook () {
      this.sortValue = 'shuffle'
      this.displayBookList = _.shuffle(this.displayBookList)
      this.chunkList()
    },
    handleSortChange (val, isSearch) {
      let bookList = this.bookList
      if (isSearch) bookList = this.displayBookList
      switch(val){
        case 'mark':
          this.displayBookList = _.filter(bookList, 'mark')
          this.chunkList()
          break
        case 'collection':
          this.displayBookList = _.filter(bookList, 'isCollection')
          this.chunkList()
          break
        case 'hidden':
          this.displayBookList = _.filter(bookList, 'hiddenBook')
          this.chunkList()
          break
        case 'shuffle':
          this.displayBookList = _.shuffle(bookList)
          this.chunkList()
          break
        case 'addAscend':
          this.displayBookList = _.reverse(bookList.sort(this.sortList('date')))
          this.chunkList()
          break
        case 'addDescend':
          this.displayBookList = bookList.sort(this.sortList('date'))
          this.chunkList()
          break
        case 'mtimeAscend':
          this.displayBookList = _.reverse(bookList.sort(this.sortList('mtime')))
          this.chunkList()
          break
        case 'mtimeDescend':
          this.displayBookList = bookList.sort(this.sortList('mtime'))
          this.chunkList()
          break
        case 'postAscend':
          this.displayBookList = _.reverse(bookList.sort(this.sortList('posted')))
          this.chunkList()
          break
        case 'postDescend':
          this.displayBookList = bookList.sort(this.sortList('posted'))
          this.chunkList()
          break
        case 'scoreAscend':
          this.displayBookList = _.reverse(bookList.sort(this.sortList('rating')))
          this.chunkList()
          break
        case 'scoreDescend':
          this.displayBookList = bookList.sort(this.sortList('rating'))
          this.chunkList()
          break
        case 'artistAscend':
          this.displayBookList = _.reverse(bookList.sort(this.sortList('tags.artist')))
          this.chunkList()
          break
        case 'artistDescend':
          this.displayBookList = bookList.sort(this.sortList('tags.artist'))
          this.chunkList()
          break
        case 'titleAscend':
          this.displayBookList = _.reverse(bookList.sort((a, b) => this.getDisplayTitle(b).localeCompare(this.getDisplayTitle(a))))
          this.chunkList()
          break
        case 'titleDescend':
          this.displayBookList = bookList.sort((a, b) => this.getDisplayTitle(b).localeCompare(this.getDisplayTitle(a)))
          this.chunkList()
          break
        default:
          this.displayBookList = bookList
          this.chunkList()
          break
      }
      localStorage.setItem('sortValue', val)
    },
    // home search
    querySearch (queryString, callback) {
      let result = []
      let options = this.customOptions.concat(this.tagList)
      if (queryString) {
        let keywords = [...queryString.matchAll(/\s+(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)/g)]
        if (!_.isEmpty(keywords)) {
          let nextKeyword = queryString.slice(_.last(keywords).index).trim()
          if (nextKeyword[0] === '-' || nextKeyword[0] === '~') {
            result = _.filter(options, str=>{
              return _.includes(str.value.toLowerCase(), nextKeyword.slice(1).toLowerCase())
              || _.includes(str.label.toLowerCase(), nextKeyword.slice(1).toLowerCase())
            })
          } else {
            result = _.filter(options, str=>{
              return _.includes(str.value.toLowerCase(), nextKeyword.toLowerCase())
              || _.includes(str.label.toLowerCase(), nextKeyword.toLowerCase())
            })
          }
        } else {
          if (queryString[0] === '-' || queryString[0] === '~') {
            result = _.filter(options, str=>{
              return _.includes(str.value.toLowerCase(), queryString.slice(1).toLowerCase())
              || _.includes(str.label.toLowerCase(), queryString.slice(1).toLowerCase())
            })
          } else {
            result = _.filter(options, str=>{
              return _.includes(str.value.toLowerCase(), queryString.toLowerCase())
              || _.includes(str.label.toLowerCase(), queryString.toLowerCase())
            })
          }
        }
      } else {
        result = options
      }
      callback(result)
    },
    querySearchLegacy (queryString, callback) {
      let result = []
      let options = this.customOptions.concat(this.tagList)
      if (queryString) {
        result = _.filter(options, str=>{
          return _.includes(str.value.toLowerCase(), queryString.toLowerCase())
          || _.includes(str.label.toLowerCase(), queryString.toLowerCase())
        })
      } else {
        result = options
      }
      result.map(obj=>obj.value = obj.value.replace(/\|{3}/, ' '))
      callback(result)
    },
    handleSearchStringChange (val) {
      if (!val) {
        this.searchString = ''
        this.handleSortChange(this.sortValue)
        setTimeout(() => document.querySelector('.search-input .el-input__inner').blur(), 100)
      }
    },
    handleInput (val) {
      if (!this.searchString || val.search(this.searchString) !== -1 || this.searchString.search(val) !== -1) {
        this.searchString = val
      }
    },
    handleSearchBoxSelect (item) {
      let keywords = [...this.searchString.matchAll(/\s+(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)/g)]
      if (!_.isEmpty(keywords)) {
        let keywordIndex = _.last(keywords).index
        if (this.searchString[keywordIndex+1] === '-') {
          this.searchString = this.searchString.slice(0, keywordIndex) + ' -' + item.value
        } else if (this.searchString[keywordIndex+1] === '~') {
          this.searchString = this.searchString.slice(0, keywordIndex) + ' ~' + item.value
        }else {
          this.searchString = this.searchString.slice(0, keywordIndex) + ' ' + item.value
        }
      } else {
        if (this.searchString[0] === '-') {
          this.searchString = '-' + item.value
        } else if (this.searchString[0] === '~') {
          this.searchString = '~' + item.value
        } else {
          this.searchString = item.value
        }
      }
      this.searchString = this.searchString.replace(/\|{3}/, ' ')
    },
    searchBook () {
      let searchStringArray = this.searchString ? this.searchString.split(/\s+(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)/) : []
      this.displayBookList = _.filter(this.bookList, (book)=>{
        let bookString = JSON.stringify(
          _.assign(
            {},
            _.pick(book, ['title', 'title_jpn', 'status', 'category', 'filepath', 'url']),
            {
              tags: _.map(book.tags, (tags, cat)=>{
                let letter = this.cat2letter[cat] ? this.cat2letter[cat] : cat
                return _.map(tags, tag=>`${letter}:${tag}`)
              })
            }
          )
        ).toLowerCase()
        let orCondition = _.filter(searchStringArray, str=>str.startsWith('~'))
        let andCondition = _.filter(searchStringArray, str=>!str.startsWith('~'))
        return _.some([andCondition, ...orCondition], (condition)=>{
          if (_.isArray(condition)) {
            return _.every(condition, (str)=>{
              if (_.startsWith(str, '-')) {
                return !bookString.includes(str.slice(1).replace(/["'$]/g, '').toLowerCase())
              } else {
                return bookString.includes(str.replace(/["'$]/g, '').toLowerCase())
              }
            })
          } else {
            return bookString.includes(condition.slice(1).replace(/["'$]/g, '').toLowerCase())
          }
        })
      })
      this.handleSortChange(this.sortValue, true)
    },
    searchFromTag (tag, cat) {
      this.dialogVisibleBookDetail = false
      this.drawerVisibleCollection = false
      if (cat) {
        let letter = this.cat2letter[cat] ? this.cat2letter[cat] : cat
        this.searchString = `${letter}:"${tag}"`
      } else {
        this.searchString = `"${tag}"`
      }
      this.searchBook()
    },
    // home main
    openBookDetail (book) {
      this.bookDetail = book
      this.dialogVisibleBookDetail = true
      if (this.setting.showComment) this.getComments(book.url)
    },
    handleClickCover (book) {
      switch (this.setting.directEnter) {
        case 'internalViewer':
          this.$refs.InternalViewerRef.viewManga(book)
          break
        case 'externalViewer':
          this.openLocalBook(book)
          break
        default:
          this.openBookDetail(book)
          break
      }
    },
    switchMark (book) {
      book.mark = !book.mark
      this.saveBook(book)
    },
    isChineseTranslatedManga (book) {
      return _.includes(book?.tags?.language, 'chinese') ? true : false
    },
    // home page
    chunkList () {
      this.currentPage = 1
      this.chunkDisplayBookList = this.customChunk(this.displayBookList, this.setting.pageSize, 0)
      this.scrollMainPageTop()
    },
    handleSizeChange () {
      this.chunkList()
      this.saveSetting()
      this.scrollMainPageTop()
    },
    handleCurrentPageChange (currentPage) {
      this.chunkDisplayBookList = this.customChunk(this.displayBookList, this.setting.pageSize, currentPage - 1)
      this.scrollMainPageTop()
    },
    scrollMainPageTop () {
      document.getElementsByClassName('book-card-area')[0].scrollTop = 0
    },


    // folder tree
    geneFolderTree () {
      this.sideVisibleFolderTree = !this.sideVisibleFolderTree
      if (this.sideVisibleFolderTree) {
        let bookList = _.filter(_.cloneDeep(this.bookList), book=>!book.isCollection)
        ipcRenderer.invoke('get-folder-tree', bookList)
        .then(data=>{
          this.folderTreeData = data
        })
      }
    },
    selectFolderTreeNode (selectNode) {
      if (selectNode.folderPath.length <= 1) {
        this.bookList.map(book=>book.folderHide = false)
      } else {
        let clickLibraryPath = this.setting.library + '\\' + selectNode.folderPath.slice(1).join('\\')
        this.bookList.map(book=>book.folderHide = !book.filepath.startsWith(clickLibraryPath))
      }
      this.handleSortChange(this.sortValue)
    },

    // tag analysis and recommand search
    handleSearchTags (string) {
      this.searchString = string
      this.searchBook()
    },

    // collection view function
    loadCollectionList () {
      ipcRenderer.invoke('load-collection-list')
      .then(res=>{
        this.collectionList = res
        _.forEach(this.collectionList, collection=>{
          let collectBook = _.compact(collection.list.map(hash_id=>{
            return _.find(this.bookList, book=>book.id === hash_id || book.hash === hash_id)
          }))
          collection.list = collectBook.map(book=>book.hash)
          collectBook.map(book=>book.collectionHide = true)
          let date = _.last(_.compact(_.sortBy(collectBook.map(book=>book.date))))
          let posted = _.last(_.compact(_.sortBy(collectBook.map(book=>book.posted))))
          let rating = _.last(_.compact(_.sortBy(collectBook.map(book=>book.rating))))
          let mtime = _.last(_.compact(_.sortBy(collectBook.map(book=>book.mtime))))
          let mark = _.some(collectBook, 'mark')
          let tags = _.mergeWith({}, ...collectBook.map(book=>book.tags), (obj, src)=>{
            if (_.isArray(obj) && _.isArray(src)) {
              return _.uniq(obj.concat(src))
            } else {
              return src
            }
          })
          let title_jpn = collectBook.map(book=>book.title+book.title_jpn).join(',')
          let filepath = collectBook.map(book=>book.filepath).join(',')
          let category = _.uniq(collectBook.map(book=>book.category)).join(',')
          let status = _.uniq(collectBook.map(book=>book.status)).join(',')
          if (!_.isEmpty(collectBook)) {
            this.bookList.push({
              title: collection.title,
              id: collection.id,
              coverPath: collectBook?.[0]?.coverPath,
              date, posted, rating, mtime, mark, tags, title_jpn, category, status,
              list: collection.list,
              filepath,
              isCollection: true
            })
          }
        })
        this.handleSortChange(this.sortValue)
      })
    },
    createCollection () {
      this.editCollectionView = true
      if (this.selectCollection) this.handleSelectCollectionChange(this.selectCollection)
    },
    addCollection () {
      ElMessageBox.prompt(this.$t('c.inputCollectionName'), this.$t('m.addCollection'), {})
      .then(({ value }) => {
        let id = nanoid()
        this.collectionList.push({
          id,
          title: value,
          list: []
        })
        this.selectCollection = id
        this.handleSelectCollectionChange(this.selectCollection)
      })
      .catch(() => {
        this.printMessage('info', this.$t('c.canceled'))
      })
    },
    renameCollection () {
      if (_.has(this.selectCollectionObject, 'title')) {
        ElMessageBox.prompt(this.$t('c.inputCollectionName'), this.$t('m.renameCollection'), {
          inputValue: this.selectCollectionObject.title
        })
        .then(({ value }) => {
          this.selectCollectionObject.title = value
        })
        .catch(() => {
          this.printMessage('info', this.$t('c.canceled'))
        })
      }
    },
    saveCollection () {
      this.collectionList = _.filter(this.collectionList, c=>!_.isEmpty(_.compact(c.list)))
      ipcRenderer.invoke('save-collection-list', _.cloneDeep(this.collectionList))
      .then(()=>{
        this.loadBookList(false)
        this.selectCollection = undefined,
        this.selectCollectionObject = {list:[]}
      })
      this.editCollectionView = false
    },
    handleSelectCollectionChange (val) {
      this.selectCollectionObject= _.find(this.collectionList, {id: val})
      _.forEach(this.bookList, book=>{
        if (!book.isCollection) {
          if (this.selectCollectionObject.list.includes(book.id) || this.selectCollectionObject.list.includes(book.hash)) {
            book.collected = true
          } else {
            book.collected = false
          }
        }
      })
    },
    handleClickCollectBadge (book) {
      if (book.collected) {
        book.collected = false
        this.selectCollectionObject.list = _.filter(this.selectCollectionObject.list, id=>id !== book.id && id !== book.hash)
      } else {
        this.selectCollectionObject.list.push(book.hash)
        book.collected = true
      }
    },
    openCollection (collection) {
      this.drawerVisibleCollection = true
      this.openCollectionBookList = _.compact(collection.list.map(hash_id=>{
        return _.find(this.bookList, book => book.id === hash_id || book.hash === hash_id)
      }))
      this.openCollectionTitle = collection.title
    },

    // detail view function
    openUrl (url) {
      ipcRenderer.invoke('open-url', url)
    },
    triggerHiddenBook (book) {
      book.hiddenBook = !book.hiddenBook
      this.saveBook(book)
    },
    showFile(filepath) {
      ipcRenderer.invoke('show-file', filepath)
    },
    openLocalBook (book) {
      this.bookDetail = book
      ipcRenderer.invoke('open-local-book', this.bookDetail.filepath)
    },
    rescanBook (book) {
      ipcRenderer.invoke('patch-local-metadata-by-book', _.cloneDeep(book))
      .then((bookInfo) => {
        _.assign(book, bookInfo)
        this.saveBook(book)
        this.printMessage('success', this.$t('c.rescanSuccess'))
      })
    },
    deleteLocalBook (book) {
      const deleteBook = ()=>{
        ipcRenderer.invoke('delete-local-book', book.filepath)
        .then(()=>{
          this.dialogVisibleBookDetail = false
          if (book.collectionHide) {
            _.forEach(this.collectionList, collection=>{
              collection.list = _.filter(collection.list, hash_id => hash_id !== book.id && hash_id !== book.hash)
            })
            this.openCollectionBookList = _.filter(this.openCollectionBookList, bookOfCollection => {
              return bookOfCollection.id !== book.id && bookOfCollection.id !== book.hash
            })
            this.saveCollection()
          } else {
            this.bookList = _.filter(this.bookList, b=>b.filepath !== book.filepath)
            this.displayBookList = _.filter(this.displayBookList, b=>b.filepath !== book.filepath)
            this.chunkDisplayBookList = this.customChunk(this.displayBookList, this.setting.pageSize, this.currentPage - 1)
          }
        })
      }
      if (this.setting.skipDeleteConfirm) {
        deleteBook()
      } else {
        ElMessageBox.confirm(
          this.$t('c.confirmDelete'),
          '',
          {}
        ).then(deleteBook).catch(()=>({}))
      }
    },

    openContentView (book) {
      this.$refs.InternalViewerRef.showThumbnail = false
      this.$refs.InternalViewerRef.viewManga(book)
    },
    openThumbnailView (book) {
      this.$refs.InternalViewerRef.showThumbnail = true
      this.$refs.InternalViewerRef.viewManga(book)
    },
    triggerShowComment () {
      if (this.setting.showComment) {
        this.setting.showComment = false
      } else {
        this.getComments(this.bookDetail.url)
        this.setting.showComment = true
      }
    },
    getComments (url) {
      if (url) {
        ipcRenderer.invoke('get-ex-webpage', {
          url,
          cookie: this.cookie
        })
        .then(res=>{
          this.comments = []
          let commentElements = new DOMParser().parseFromString(res, 'text/html').querySelectorAll('#cdiv>.c1')
          commentElements.forEach(e=>{
            let author = e.querySelector('.c2 .c3').textContent
            let scoreTail = e.querySelectorAll('.c2 .nosel')
            let score = scoreTail[scoreTail.length - 1].textContent
            let content = e.querySelector('.c6').innerHTML
            content = content.replace(/<br>/gi, '\n')
            content = content.replace(/<.+?>/gi, '')
            content = he.decode(content)
            this.comments.push({
              author, score, content, id: nanoid()
            })
          })
        })
        .catch(err => {
          this.comments = []
          console.log(err)
        })
      } else {
        this.comments = []
      }
    },
    editTags () {
      this.editingTag = !this.editingTag
      if (this.editingTag) {
        if (!_.has(this.bookDetail, 'tags')) this.bookDetail.tags = {}
        let tempTagGroup = {}
        _.forEach(this.bookList.map(b=>b.tags), (tagObject)=>{
          _.forIn(tagObject, (tagArray, tagCat)=>{
            if (_.isArray(tagArray)) {
              if (_.has(tempTagGroup, tagCat)) {
                tempTagGroup[tagCat] = [...tempTagGroup[tagCat], ...tagArray]
              } else {
                tempTagGroup[tagCat] = tagArray
              }
            }
          })
        })
        let showTranslation = this.setting.showTranslation
        _.forIn(tempTagGroup, (tagArray, tagCat)=>{
          tempTagGroup[tagCat] = _.sortBy(_.uniq(tagArray)).map(tag=>({
            value: tag,
            label: `${showTranslation ? (this.resolvedTranslation[tag]?.name || tag ) + ' || ' : ''}${tag}`
          }))
        })
        this.tagGroup = tempTagGroup
      } else {
        _.forIn(this.bookDetail.tags, (tagarr, tagCat)=>{
          if (_.isEmpty(tagarr)) {
            delete this.bookDetail.tags[tagCat]
          }
        })
        this.saveBook(this.bookDetail)
      }
    },
    addTagCat () {
      ElMessageBox.prompt(this.$t('c.inputCategoryName'), this.$t('m.addCategory'), {
      })
      .then(({ value }) => {
        this.tagGroup[value] = []
      })
      .catch(() => {
        this.printMessage('info', this.$t('c.canceled'))
      })
    },
    editTagsFetch (arr) {
      return (str) => {
        if (str) {
          this.editTagOptions = _.filter(arr, tag=>tag.label.includes(str))
        } else {
          this.editTagOptions = arr
        }
      }
    },
    editTagFocus (e, arr) {
      setTimeout(this.editTagsFetch(arr), 200)
    },

    // copy and paste tag
    copyTagClipboard (book) {
      ipcRenderer.invoke('copy-text-to-clipboard', JSON.stringify(_.pick(book, ['tags', 'status', 'category'])))
    },
    async pasteTagClipboard (book) {
      let text = await ipcRenderer.invoke('read-text-from-clipboard')
      _.assign(book, JSON.parse(text))
      this.saveBook(book)
    },

    // internal viewer
    useNewCover (filepath) {
      ipcRenderer.invoke('use-new-cover', filepath)
        .then((coverPath)=>{
          this.bookDetail.coverPath = coverPath
          this.saveBook(this.bookDetail)
        })
    },
    handleStopReadManga () {
      if (this.setting.keepReadingProgress) this.$refs.InternalViewerRef.saveReadingProgress()
      ipcRenderer.invoke('release-sendimagelock')
    },
    toNextManga (step) {
      this.handleStopReadManga()
      let activeBookList = this.drawerVisibleCollection ? this.openCollectionBookList : _.filter(this.displayBookList, book => this.isBook(book) && this.isVisibleBook(book))
      let indexNow = _.findIndex(activeBookList, {id: this.bookDetail.id})
      let indexNext = indexNow + step
      if (indexNext >= 0 && indexNext < activeBookList.length) {
        let selectBook = activeBookList[indexNext]
        setTimeout(() => {
          this.bookDetail = selectBook
          this.$refs.InternalViewerRef.viewManga(selectBook)
          if (this.setting.showComment) this.getComments(selectBook.url)
        }, 500)
      } else {
        this.printMessage('info', 'out of range')
      }
    },
    toNextMangaRandom () {
      this.handleStopReadManga()
      let activeBookList = this.drawerVisibleCollection ? this.openCollectionBookList : _.filter(this.displayBookList, book => this.isBook(book) && this.isVisibleBook(book))
      let selectBook = _.sample(activeBookList)
      setTimeout(() => {
        this.bookDetail = selectBook
        this.$refs.InternalViewerRef.viewManga(selectBook)
        if (this.setting.showComment) this.getComments(selectBook.url)
      }, 500)
    },
    jumpMangeDetail (step) {
      let activeBookList = this.drawerVisibleCollection ? this.openCollectionBookList : _.filter(this.displayBookList, book => this.isBook(book) && this.isVisibleBook(book))
      let indexNow = _.findIndex(activeBookList, {id: this.bookDetail.id})
      let indexNext = indexNow + step
      if (indexNext >= 0 && indexNext < activeBookList.length) {
        this.openBookDetail(activeBookList[indexNext])
      } else {
        this.printMessage('info', 'out of range')
      }
    },
    jumpMangeDetailRandom () {
      let activeBookList = this.drawerVisibleCollection ? this.openCollectionBookList : _.filter(this.displayBookList, book => this.isBook(book) && this.isVisibleBook(book))
      this.openBookDetail(_.sample(activeBookList))
    },


    // setting
    handleResolveTranslationUpdate (val) {
      this.resolvedTranslation = val
    },
    saveSetting () {
      ipcRenderer.invoke('save-setting', _.cloneDeep(this.setting))
    },
    forceGeneBookList () {
      this.$refs.SettingRef.dialogVisibleSetting = false
      localStorage.setItem('viewerReadingProgress', JSON.stringify([]))
      ipcRenderer.invoke('force-gene-book-list')
      .then(res=>{
        if (this.sortValue) {
          this.bookList = res
        } else {
          this.bookList = res.sort(this.sortList('date'))
        }
        this.loadCollectionList()
        this.printMessage('success', this.$t('c.rebuildMessage'))
      })
    },
    patchLocalMetadata () {
      ipcRenderer.invoke('patch-local-metadata')
      .then(()=>this.loadBookList())
    },
    updateSetting (setting) {
      this.setting = setting
    },
    handleLanguageSet (languageCode) {
      switch (languageCode) {
        case 'zh-CN':
          this.locale = zhCn
          this.$i18n.locale = 'zh-CN'
          break
        case 'en-US':
          this.locale = en
          this.$i18n.locale = 'en-US'
          break
        default:
          this.locale = en
          this.$i18n.locale = 'en-US'
          break
      }
    },

    // import/export
    exportDatabase () {
      ipcRenderer.invoke('export-database')
      .then(database=>{
        let dataStr = JSON.stringify(database, null, '  ')
        let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
        let exportFileDefaultName = 'bookHashMetadata.json'
        let linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
      })
    },
    importDatabase () {
      ipcRenderer.invoke('load-import-database')
      .then(async database=>{
        if (!_.isEmpty(database)) {
          _.forEach(this.bookList, async (book, index)=>{
            let findData = _.find(database, line=>(line.hash === book.hash || line.hash === book.coverHash))
            if (findData) {
              _.assign(book, _.omit(findData, 'hash'))
              if (book.url){
                book.status = 'tagged'
              } else {
                book.status = 'tag-failed'
              }
              if (book.collectionInfo) {
                let foundCollection = _.find(this.collectionList, {id: book.collectionInfo.id})
                if (foundCollection) {
                  if (_.isNumber(book.collectionInfo.index)) {
                    foundCollection.list[book.collectionInfo.index] = book.hash
                  } else {
                    foundCollection.list.push(book.hash)
                  }
                } else {
                  let collection = {
                    id: book.collectionInfo.id,
                    title: book.collectionInfo.title,
                    list: []
                  }
                  if (_.isNumber(book.collectionInfo.index)) {
                    collection.list[book.collectionInfo.index] = book.hash
                  } else {
                    collection.list.push(book.hash)
                  }
                  this.collectionList.push(collection)
                }
                delete book.collectionInfo
              }
            }
            if (index === this.bookList.length - 1) {
              this.$refs.SettingRef.dialogVisibleSetting = false
              this.printMessage('success', this.$t('c.importMessage'))
            }
            await this.saveBook(book)
          })
          this.saveCollection()
        } else {
          this.printMessage('info', this.$t('c.canceled'))
        }
      })
    },
    importMetadataFromSqlite () {
      ipcRenderer.invoke('import-sqlite', _.cloneDeep(this.bookList))
      .then(result=>{
        let {success, bookList} = result
        if (success) {
          this.bookList = bookList
          this.printMessage('success', this.$t('c.importMessage'))
          this.handleSortChange(this.sortValue)
        } else {
          this.printMessage('info', this.$t('c.canceled'))
        }
      })
    },

    // contextmenu
    onBookContextMenu (e, book) {
      e.preventDefault()
      this.$contextmenu({
        x: e.x,
        y: e.y,
        items: [
          {
            label: this.$t('m.getMetadata'),
            onClick: () => {
              this.$refs.SearchDialogRef.openSearchDialog(book)
            }
          },
          {
            label: this.$t('m.openMangaFileLocation'),
            onClick: () => {
              this.showFile(book.filepath)
            }
          },
          {
            label: this.$t('m.deleteManga'),
            onClick: () => {
              this.deleteLocalBook(book)
            }
          },
          {
            label: this.$t('m.hideManga') + "/" + this.$t('m.showManga'),
            onClick: () => {
              this.triggerHiddenBook(book)
            }
          },
          {
            label: this.$t('m.copyTagClipboard'),
            onClick: () => {
              this.copyTagClipboard(book)
            }
          },
          {
            label: this.$t('m.pasteTagClipboard'),
            onClick: () => {
              this.pasteTagClipboard(book)
            }
          },
        ]
      })
    },
    onMangaTitleContextMenu (e, book) {
      e.preventDefault()
      this.$contextmenu({
        x: e.x,
        y: e.y,
        items: [
          {
            label: this.$t('c.copyTitleToClipboard'),
            onClick: () => {
              ipcRenderer.invoke('copy-text-to-clipboard', book.title_jpn || book.title)
            }
          },
          {
            label: this.$t('c.copyLinkToClipboard'),
            onClick: () => {
              ipcRenderer.invoke('copy-text-to-clipboard', book.url)
            }
          },
        ]
      })
    },
    onMangaCommentContextMenu (e, comment) {
      e.preventDefault()
      let foundLink = linkify.find(comment, 'url')
      if (!_.isEmpty(foundLink)) {
        let items = foundLink.map(l=>({
          label: `${this.$t('c.redirect')} ${l.href}`,
          onClick: ()=>{
            ipcRenderer.invoke('open-url', l.href)
          }
        }))
        this.$contextmenu({
          x: e.x,
          y: e.y,
          items
        })
      }
    },
  }
})
</script>
<style lang='stylus'>
body
  margin: auto
  width: calc(100vw - 20px)
#app
  font-family: Avenir, Helvetica, Arial, sans-serif
  text-align: center
  margin-top: 20px

@keyframes striped-flow
  0%
    background-position: -100%
  to
    background-position: 100%

#progressbar
  position: fixed
  top: 0
  left: 0
  height: 4px
  background-color: #67C23A
  background-image: linear-gradient(45deg,rgba(0,0,0,.1) 25%,transparent 25%,transparent 50%,rgba(0,0,0,.1) 50%,rgba(0,0,0,.1) 75%,transparent 75%,transparent)
  background-size: 2em 2em
  animation: striped-flow 3s linear infinite
  animation-duration: 30s
  border-radius: 2px

.search-input,
.function-button
  width: 100%
.autocomplete-value
  margin-left: 2em
  float: right

.side-tree-modal
  background-color: var(--el-mask-color-extra-light)

.pagination-bar
  margin: 4px 0
  justify-content: center

.book-card-area
  height: calc(100vh - 98px)
  overflow-x: auto
  justify-content: center
  margin-top: 8px
  .book-collect, .book-collection
    height: calc(100vh - 98px)
    overflow-x: auto
    padding-top: 4px
  .book-card-list
    display: flex
    flex-wrap: wrap
    justify-content: center
    align-content: flex-start

.book-card-frame
  display: inline-block
.book-card
  display: inline-block
  width: 220px
  height: 367px
  border: solid 1px var(--el-border-color)
  border-radius: 4px
  margin: 6px 6px
  position: relative
.book-collection-tag
  position: absolute
  right: 1px
  top: 1px
.book-title
  height: 36px
  overflow-y: hidden
  margin: 8px 6px
  font-size: 14px
  cursor: pointer
  line-height: 18px
.book-card-mark, .book-detail-star, .book-card-language, .book-card-pagecount
  position: absolute
.book-card-language
  left: 11px
  top: 53px
.book-card-pagecount
  left: 11px
  top: 314px
.book-card-mark
  right: 4px
  top: 40px
.book-detail-star
  right: -6px
  top: -14px
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

.open-collection-title
  margin: 0 10px

.book-collect-card
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
.book-collect-title
  height: 38px
  overflow-y: hidden
  margin: 4px 2px
  font-size: 10px
.book-collect-cover
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
    margin: 2px 4px
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

.el-dialog.is-fullscreen.dialog-detail
  .el-dialog__header
    .el-dialog__headerbtn
      margin: 8px 16px 0 0
      .el-icon
        width: 32px
        svg
          height: 32px
          width: 32px
  .el-dialog__body
    padding: 5px 20px 16px


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
  .edit-line
    margin: 4px 0
    .el-select
      width: 100%
  .el-descriptions__label
    display: inline-block
    text-align: right
    width: 80px
.book-tag-frame
  height: calc(100vh - 100px)
  overflow-y: auto
  padding-right: 10px
  text-align: left
.book-tag
  margin: 4px 6px
  cursor: pointer
.tag-edit-button
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

// search-input sort-select
.el-autocomplete-suggestion__wrap, .el-select-dropdown__wrap
  max-height: 490px!important

.mx-menu-ghost-host
  z-index: 3000!important
.mx-context-menu
  background-color: var(--el-fill-color-extra-light)!important
  .mx-context-menu-item:hover
    background-color: var(--el-fill-color-dark)
    color: var(--el-text-color-regular)
  .mx-context-menu-item
    padding: 6px
    color: var(--el-text-color-regular)

html.light
  color-scheme: light

html.exhentai
  background-color: #34353b
  --el-bg-color: #34353b
  --el-bg-color-overlay: #34353b
  --el-color-primary: #909399
  --el-color-primary-light-3: #6b6d71
  --el-color-primary-light-5: #525457
  --el-color-primary-light-7: #393a3c
  --el-color-primary-light-8: #2d2d2f
  --el-color-primary-light-9: #383838
  --el-color-primary-dark-2: #a6a9ad
  --el-color-warning-light-9: #433827
  --el-color-danger-light-9: #493333
  --el-color-success-light-9: #303927
  --el-color-info-light-9: #383838
  --el-fill-color-light: #3d414b
  --el-fill-color-extra-light: #3d414b
  --el-fill-color-dark: #50535b
  --el-border-color: #6e6e6e

html.e-hentai
  background-color: #e2e0d2
  --el-bg-color: #e2e0d2
  --el-bg-color-overlay: #e2e0d2
  --el-color-primary: #521613
  --el-color-primary-light-3: #eebe77
  --el-color-primary-light-5: #9d702e
  --el-color-primary-light-7: #f8e3c5
  --el-color-primary-light-8: #faecd8
  --el-color-primary-light-9: #fdf6ec
  --el-color-primary-dark-2: #b88230
  --el-fill-color-light: #edebe0
  --el-fill-color-extra-light: #edebe0
  --el-fill-color-dark: #fefcf4
  --el-fill-color-blank: #e2e0d2
  --el-border-color: #919191

html.nhentai
  background-color: #0d0d0d
  --el-bg-color: #0d0d0d
  --el-bg-color-overlay: #0d0d0d
  --el-color-primary: #d54255
  --el-color-primary-light-3: #b25252
  --el-color-primary-light-5: #854040
  --el-color-primary-light-7: #582e2e
  --el-color-primary-light-8: #412626
  --el-color-primary-light-9: #493333
  --el-color-primary-dark-2: #f78989
  --el-color-warning-light-9: #433827
  --el-color-danger-light-9: #493333
  --el-color-success-light-9: #303927
  --el-color-info-light-9: #383838
  --el-fill-color-light: #1f1f1f
  --el-fill-color-extra-light: #1f1f1f
  --el-fill-color-dark: #666666
  --el-border-color: #6e6e6e
</style>
