<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="9" :offset="3">
        <el-input v-model="searchString" @keyup.enter="searchBook"  @change="handleSearchStringChange" clearable></el-input>
      </el-col>
      <el-col :span="1"><el-button type="primary" :icon="Search" plain class="function-button" @click="searchBook"></el-button></el-col>
      <el-col :span="1"><el-button type="primary" :icon="MdShuffle" plain class="function-button" @click="shuffleBook"></el-button></el-col>
      <el-col :span="1"><el-button type="warning" :icon="Setting" plain class="function-button" @click="dialogVisibleSetting = true"></el-button></el-col>
      <el-col :span="3">
        <el-select placeholder="排序" @change="handleSortChange" clearable v-model="sortValue">
          <el-option label="仅收藏" value="mark"></el-option>
          <el-option label="仅合集" value="collection"></el-option>
          <el-option label="添加时间正序" value="addAscend"></el-option>
          <el-option label="添加时间倒序" value="addDescend"></el-option>
          <el-option label="上传时间正序" value="postAscend"></el-option>
          <el-option label="上传时间倒序" value="postDescend"></el-option>
          <el-option label="评分正序" value="scoreAscend"></el-option>
          <el-option label="评分倒序" value="scoreDescend"></el-option>
        </el-select>
      </el-col>
      <el-col :span="4" :offset="2">
        <el-row :gutter="4">
          <el-col :span="10" :offset="7"  v-if="!editCollectionView">
            <el-button type="primary" plain class="function-button" @click="createCollection">编辑合集</el-button>
          </el-col>
          <el-col :span="10" :offset="2" v-if="editCollectionView">
            <el-button type="primary" plain class="function-button" @click="addCollection">新增合集</el-button>
          </el-col>
          <el-col :span="10" v-if="editCollectionView">
            <el-button type="primary" plain class="function-button" @click="saveCollection">保存</el-button>
          </el-col>
        </el-row>
      </el-col>
    </el-row>
    <el-row :gutter="20" class="book-card-area">
      <el-col :span="24" v-show="!editCollectionView">
        <div
          v-for="book in chunkDisplayBookList"
          :key="book.id"
          class="book-card-frame"
        >
          <div class="book-card" v-if="!book.collection && !book.hidden">
            <p class="book-title" :title="book.title_jpn ? book.title_jpn : book.title">{{book.title_jpn ? book.title_jpn : book.title}}</p>
            <img class="book-cover" :src="book.coverPath" @click="openBookDetail(book)"/>
            <el-icon :size="30" :color="book.mark ? '#E6A23C' : '#666666'" class="book-card-star" @click="switchMark(book)"><StarFilled /></el-icon>
            <el-button-group class="outer-read-button-group">
              <el-button type="success" size="small" class="outer-read-button" plain @click="bookDetail = book; openLocalBook()">阅</el-button>
              <el-button type="success" size="small" class="outer-read-button" plain @click="bookDetail = book; viewManga()">读</el-button>
            </el-button-group>
            <el-tag
              class="book-status-tag"
              :type="book.status == 'non-tag' ? 'info' : book.status == 'tagged' ? 'success' : 'warning'"
              @click="searchFromTag(book.status)"
            >{{book.status}}</el-tag>
            <el-rate v-model="book.rating"  v-if="!book.collection" allow-half/>
          </div>
          <div class="book-card" v-if="book.collection">
            <el-tag effect="dark" type="warning" class="book-collection-tag">合集</el-tag>
            <p class="book-title" :title="book.title">{{book.title}}</p>
            <img class="book-cover" :src="book.coverPath" @click="openCollection(book)"/>
            <el-icon :size="30" :color="book.mark ? '#E6A23C' : '#666666'" class="book-card-star"><StarFilled /></el-icon>
            <el-rate v-model="book.rating" allow-half disabled/>
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
          v-show="!book.collection"
        >
          <div class="book-collect-card">
            <p class="book-collect-title" :title="book.title_jpn ? book.title_jpn : book.title">{{book.title_jpn ? book.title_jpn : book.title}}</p>
            <img class="book-collect-cover" :src="book.coverPath"/>
          </div>
        </el-badge>
      </el-col>
      <el-col :span="6" v-show="editCollectionView" class="book-collection">
        <el-select v-model="selectCollection" class="book-collection-select" @change="handleSelectCollectionChange">
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
                <p class="book-collection-title" :title="element.title_jpn ? element.title_jpn : element.title">{{element.title_jpn ? element.title_jpn : element.title}}</p>
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
        layout="sizes, prev, pager, next, total"
        :total="displayBookCount"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-row>
    <el-dialog
      v-model="dialogVisibleBookDetail"
      fullscreen
    >
      <template #header>
        <p class="detail-book-title"><span class="url-link" @click="openUrl(bookDetail.url)">{{bookDetail.title_jpn ? bookDetail.title_jpn : bookDetail.title}}</span></p>
      </template>
      <el-row :gutter="20" class="book-detail-card" @click.middle="dialogVisibleBookDetail = !dialogVisibleBookDetail">
        <el-col :span="showComment?6:9">
          <el-row class="book-detail-function book-detail-cover-frame">
            <img class="book-detail-cover" :src="bookDetail.coverPath" @click="viewManga"/>
            <el-icon :size="30" :color="bookDetail.mark ? '#E6A23C' : '#666666'" class="book-detail-star" @click="switchMark(bookDetail)"><StarFilled /></el-icon>
          </el-row>
          <el-row class="book-detail-function">
            <el-descriptions :column="1">
              <el-descriptions-item label="页数:">{{bookDetail.filecount}}</el-descriptions-item>
              <el-descriptions-item label="文件大小:">{{Math.floor(bookDetail.filesize / 1048576)}} MB</el-descriptions-item>
              <el-descriptions-item label="上传时间:">{{new Date(bookDetail.posted * 1000).toLocaleString("zh-CN")}}</el-descriptions-item>
            </el-descriptions>
          </el-row>
          <el-row class="book-detail-function">
            <el-button type="success" plain @click="openLocalBook">阅读</el-button>
            <el-button type="danger" plain @click="deleteLocalBook">删除</el-button>
            <el-button type="primary" plain @click="editTags">{{editingTag ? '显示标签' : '编辑标签'}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button type="primary" plain @click="getBookInfo(bookDetail, 'e-hentai')">获取元数据</el-button>
            <el-button type="primary" plain @click="getBookInfo(bookDetail, 'exhentai')">获取EX元数据</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button type="primary" plain @click="showFile(bookDetail.filepath)">打开漫画文件所在目录</el-button>
            <el-button type="primary" plain @click="triggerShowComment">{{showComment?'隐藏':'显示'}}评论</el-button>
          </el-row>
        </el-col>
        <el-col :span="showComment?10:15">
          <el-scrollbar class="book-tag-frame">
            <div v-if="editingTag">
              <div class="edit-line">
                <el-select v-model="bookDetail.status" placeholder="元数据状态">
                  <el-option value="non-tag">non-tag</el-option>
                  <el-option value="tagged">tagged</el-option>
                  <el-option value="tag-failed">tag-failed</el-option>
                </el-select>
              </div>
              <div class="edit-line">
                <el-input v-model="bookDetail.url" placeholder="eh/ex地址"></el-input>
              </div>
              <div class="edit-line" v-for="(arr, key) in tagGroup" :key="key">
                <el-select v-model="bookDetail.tags[key]" :placeholder="key" filterable allow-create multiple>
                  <el-option v-for="tag in arr" :key="tag" :value="tag">{{tag}}</el-option>
                </el-select>
              </div>
            </div>
            <div v-else>
              <el-descriptions :column="1">
                <el-descriptions-item label="英文标题:">{{bookDetail.title}}</el-descriptions-item>
                <el-descriptions-item label="类别:">
                  <el-tag type="info" class="book-tag" @click="searchFromTag(bookDetail.category)">{{bookDetail.category}}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item v-for="(tagArr, key) in bookDetail.tags" :label="key + ':'" :key="key">
                  <el-tag type="info" class="book-tag" v-for="tag in tagArr" :key="tag" @click="searchFromTag(tag)">{{tag}}</el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-scrollbar>
        </el-col>
        <el-col :span="8" v-show="showComment">
          <el-scrollbar class="book-comment-frame">
            <div class="book-comment" v-for="comment in comments" :key="comment.id">
              <div class="book-comment-postby">{{comment.author}}<span class="book-comment-score">{{comment.score}}</span></div>
              <p class="book-comment-content">{{comment.content}}</p>
            </div>
          </el-scrollbar>
        </el-col>
      </el-row>
    </el-dialog>
    <el-dialog
      v-model="dialogVisibleSetting"
      width="40%"
      :modal="false"
    >
      <template #header><p class="detail-book-title">设置</p></template>
      <el-row :gutter="8">
        <el-col :span="24">
          <div class="setting-line">
            <el-input v-model="setting.library">
              <template #prepend><span class="setting-label">库文件夹</span></template>
              <template #append><el-button @click="selectLibraryPath">选择</el-button></template>
            </el-input>
          </div>
        </el-col>
        <el-col :span="24">
          <div class="setting-line">
            <el-input v-model="setting.imageExplorer">
              <template #prepend><span class="setting-label">默认程序</span></template>
              <template #append><el-button @click="selectImageExplorerPath">选择</el-button></template>
            </el-input>
          </div>
        </el-col>
        <el-col :span="24">
          <div class="setting-line">
            <el-input v-model.number="setting.requireGap" @change="saveSetting">
              <template #prepend><span class="setting-label">请求间隔(毫秒)</span></template>
            </el-input>
          </div>
        </el-col>
        <el-col :span="24">
          <div class="setting-line">
            <el-input v-model.number="setting.thumbnailColumn" @change="saveSetting">
              <template #prepend><span class="setting-label">缩略图列数</span></template>
            </el-input>
          </div>
        </el-col>
        <el-col :span="24">
          <div class="setting-line">
            <el-input v-model="setting.igneous" @change="saveSetting">
              <template #prepend><span class="setting-label">igneous</span></template>
            </el-input>
          </div>
        </el-col>
        <el-col :span="24">
          <div class="setting-line">
            <el-input v-model="setting.ipb_pass_hash" @change="saveSetting">
              <template #prepend><span class="setting-label">ipb_pass_hash</span></template>
            </el-input>
          </div>
        </el-col>
        <el-col :span="24">
          <div class="setting-line">
            <el-input v-model="setting.ipb_member_id" @change="saveSetting">
              <template #prepend><span class="setting-label">ipb_member_id</span></template>
            </el-input>
          </div>
        </el-col>
        <el-col :span="24">
          <div class="setting-line">
            <el-input v-model="setting.proxy" @change="saveSetting">
              <template #prepend><span class="setting-label">代理服务器</span></template>
            </el-input>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="setting-line">
            <el-popover
              placement="top-start"
              trigger="hover"
              content="此操作将重建漫画库并清空元数据"
            >
              <template #reference>
                <el-button class="function-button" type="danger" plain @click="forceGeneBookList">强制重建漫画库</el-button>
              </template>
            </el-popover>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="setting-line">
            <el-button class="function-button" type="primary" plain @click="getBookListMetadata('e-hentai')">批量获取元数据</el-button>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="setting-line">
            <el-button class="function-button" type="primary" plain @click="getBookListMetadata('exhentai')">批量获取EX元数据</el-button>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="setting-line">
            <el-button class="function-button" type="primary" plain @click="exportDatabase">导出元数据</el-button>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="setting-line">
            <el-button class="function-button" type="primary" plain @click="importDatabase">导入元数据</el-button>
          </div>
        </el-col>
        <el-col :span="6">
          <el-switch
            v-model="setting.loadOnStart"
            inactive-text="启动时扫描"
            @change="saveSetting"
            class="setting-switch"
          />
        </el-col>
        <el-col :span="4">
          <div class="setting-line">
            <el-button class="function-button" type="primary" plain @click="loadBookList(true)">手动扫描</el-button>
          </div>
        </el-col>
        <el-col :span="6">
          <el-switch
            v-model="setting.showComment"
            inactive-text="显示评论"
            @change="saveSetting"
            class="setting-switch"
          />
        </el-col>
      </el-row>
    </el-dialog>
    <el-drawer
      v-model="drawerVisibleViewer"
      direction="ttb"
      size="100%"
      :with-header="false"
      destroy-on-close
    >
      <el-button type="primary" text :icon="Close" size="large" class="viewer-close-button" @click="drawerVisibleViewer = false"></el-button>
      <el-switch
        v-model="imageStyleType"
        size="small"
        inline-prompt
        active-text="卷轴"
        inactive-text="单页"
        active-value="scroll"
        inactive-value="click"
        @change="saveImageStyleType"
        class="viewer-switch"
        width="60px"
      />
      <el-switch
        v-model="showThumbnail"
        size="small"
        inline-prompt
        active-text="缩略图"
        inactive-text="内容"
        @change="switchThumbnail"
        class="viewer-thumbnail-switch"
        width="60px"
      />
      <div class="drawer-image-content" @click="scrollPage" v-show="!showThumbnail">
        <div
          v-for="(image, index) in viewerImageList"
          :key="image.id"
          class="image-frame"
          :style="returnImageFrameStyle()"
        >
          <div
            class="viewer-image-frame"
            :id="image.id"
            :style="returnImageStyle(image)"
          >
            <img :src="image.filepath + '?a=' + Math.random()" class="viewer-image" :style="{height: returnImageStyle(image).height}"/>
            <div class="viewer-image-bar" @mousedown="initResize(image.id)"></div>
          </div>
          <div class="viewer-image-page">{{index + 1}} of {{viewerImageList.length}}</div>
        </div>
      </div>
      <div class="drawer-thumbnail-content"  v-show="showThumbnail">
        <!-- eslint-disable-next-line vue/valid-v-for -->
        <el-space v-for="(chunk, chunkIndex) in thumbnailList" :size="16">
          <div v-for="(image, index) in chunk" :key="image.id">
            <img
              :src="image.filepath + '?a=' + Math.random()"
              class="viewer-thumbnail"
              :style="{width: `calc((100vw - 40px) / ${thumbnailColumn} - 16px)`}"
              @click="handleClickThumbnail(chunkIndex, index)"
            />
            <div class="viewer-thunmnail-page">{{chunkIndex * thumbnailColumn + index + 1}} of {{viewerImageList.length}}</div>
          </div>
        </el-space>
      </div>
    </el-drawer>
    <el-drawer
      v-model="drawerVisibleCollection"
      direction="btt"
      :size="464"
      destroy-on-close
    >
      <template #header><p class="open-collection-title">{{openCollectionTitle}}</p></template>
      <div class="book-card" v-for="book in openCollectionBookList" :key="book.id">
        <p class="book-title" :title="book.title_jpn ? book.title_jpn : book.title">{{book.title_jpn ? book.title_jpn : book.title}}</p>
        <img class="book-cover" :src="book.coverPath" @click="openBookDetail(book)"/>
        <el-icon :size="30" :color="book.mark ? '#E6A23C' : '#666666'" class="book-card-star" @click="switchMark(book)"><StarFilled /></el-icon>
        <el-button-group class="outer-read-button-group">
          <el-button type="success" size="small" class="outer-read-button" plain @click="bookDetail = book; openLocalBook()">阅</el-button>
          <el-button type="success" size="small" class="outer-read-button" plain @click="bookDetail = book; viewManga()">读</el-button>
        </el-button-group>
        <el-tag
          class="book-status-tag"
          :type="book.status == 'non-tag' ? 'info' : book.status == 'tagged' ? 'success' : 'warning'"
          @click="searchFromTag(book.status)"
        >{{book.status}}</el-tag>
        <el-rate v-model="book.rating"  v-if="!book.collection" allow-half/>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import axios from 'axios'
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus'
import { Close, Search, Setting } from '@element-plus/icons-vue'
import { MdShuffle } from '@vicons/ionicons4'
import he from 'he'
import {nanoid} from 'nanoid'
import draggable from 'vuedraggable'

export default defineComponent({
  components: {
    draggable
  },
  setup () {
    return {
      Close, Search, Setting, MdShuffle
    }
  },
  data () {
    return {
      bookList: [],
      dialogVisibleBookDetail: false,
      bookDetail: {},
      displayBookList: [],
      dialogVisibleSetting: false,
      searchString: undefined,
      setting: {},
      currentPage: 1,
      chunkDisplayBookList: [],
      editingTag: false,
      tagGroup: {},
      serviceAvailable: true,
      drawerVisibleViewer: false,
      viewerImageList: [],
      viewerImageWidth: 1280,
      imageStyleType: 'scroll',
      sortValue: undefined,
      comments: [],
      showComment: true,
      showThumbnail: false,
      thumbnailColumn: 10,
      storeDrawerScrollTop: undefined,
      editCollectionView: false,
      selectCollection: undefined,
      selectCollectionObject: {list:[]},
      collectionList: [],
      drawerVisibleCollection: false,
      openCollectionTitle: undefined,
      openCollectionBookList: []
    }
  },
  computed: {
    thumbnailList () {
      if (this.setting.thumbnailColumn) {
        this.thumbnailColumn = this.setting.thumbnailColumn
      }
      return _.chunk(this.viewerImageList, this.thumbnailColumn)
    },
    displaySelectCollectionList: {
      get () {
        let list = this.selectCollectionObject.list.map(id=>{
          let findBook = _.find(this.bookList, {id})
          if (findBook) {
            return findBook
          } else {
            return undefined
          }
        })
        return _.compact(list)
      },
      set (val) {
        let list = val.map(b=>b.id)
        this.selectCollectionObject.list = list
      }
    },
    displayBookCount () {
      return _.sumBy(this.displayBookList, book=>book.hidden ? 0 : 1)
    }
  },
  mounted () {
    ipcRenderer['send-message']((event, arg)=>{
      this.printMessage('info', arg)
      if (arg.includes('failed')) console.log(arg)
    })
    ipcRenderer['load-setting']()
    .then(res=>{
      this.setting = res
      this.loadBookList(this.setting.loadOnStart)
    })
    this.viewerImageWidth = localStorage.getItem('viewerImageWidth') || 1280
    this.imageStyleType = localStorage.getItem('imageStyleType') || 'scroll'
    window.addEventListener('keydown', this.resolveKey)
  },
  beforeUnmount () {
    window.removeEventListener('keydown', this.resolveKey)
  },
  methods: {
    resolveKey (event) {
      if (this.drawerVisibleViewer) {
        if (this.imageStyleType == 'click') {
          if (event.key === 'ArrowRight') {
            document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, window.innerHeight)
          } else if (event.key === 'ArrowLeft') {
            document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, -window.innerHeight)
          }
        }
        if (event.key === 'ArrowUp') {
          if (event.ctrlKey) {
            document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, - window.innerHeight / 100)
          } else {
            document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, - window.innerHeight / 10)
          }
        } else if (event.key === 'ArrowDown') {
          if (event.ctrlKey) {
            document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, window.innerHeight / 100)
          } else {
            document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, window.innerHeight / 10)
          }
        } else if (event.key === 'Home') {
          document.getElementsByClassName('el-drawer__body')[0].scrollTop = 0
        } else if (event.key === 'End') {
          document.getElementsByClassName('el-drawer__body')[0].scrollTop = document.getElementsByClassName('el-drawer__body')[0].scrollHeight
        }
      }
    },
    customChunk (list, size, index) {
      let result = []
      let count = 0
      let countIndex = 0
      _.forIn(list, element=>{
        if (countIndex == index) result.push(element)
        if (!element.hidden) count++
        if (count >= size) {
          countIndex++
          count = 0
        }
        if (countIndex > index) return false
      })
      return result
    },
    loadBookList (scan) {
      ipcRenderer['load-book-list'](scan)
      .then(res=>{
        this.bookList = res.sort(this.sortList('date'))
        this.displayBookList = this.bookList
        this.chunkList()
        this.loadCollectionList()
      })
    },
    returnImageStyle(image) {
      if (this.imageStyleType == 'scroll') {
        return {width: this.viewerImageWidth + 'px', height: (image.height * (this.viewerImageWidth / image.width)) + 'px' }
      } else {
        // 28是.viewer-image-page的高度
        return {height: (window.innerHeight - 28) + 'px', width: (image.width * (window.innerHeight - 28) / image.height) + 'px'}
      }
    },
    returnImageFrameStyle () {
      if (this.imageStyleType == 'scroll') {
        return {}
      } else {
        return {height: '100vh'}
      }
    },
    saveImageStyleType (val) {
      localStorage.setItem('imageStyleType', val)
    },
    sortList(label) {
      return (a, b)=>{
        if (a[label] && b[label]) {
          if (a[label] > b[label]) {
            return -1
          } else if (a[label] < b[label]) {
            return 1
          } else {
            return 0
          }
        } else if (a[label]) {
          return -1
        } else if (b[label]) {
          return 1
        } else {
          return 0
        }
      }
    },
    printMessage(type, msg) {
      ElMessage.closeAll()
      ElMessage[type](msg)
    },
    chunkList () {
      this.currentPage = 1
      this.chunkDisplayBookList = this.customChunk(this.displayBookList, this.setting.pageSize, 0)
      this.scrollMainPageTop()
    },
    openBookDetail (book) {
      this.bookDetail = book
      this.dialogVisibleBookDetail = true
      this.showComment = !!this.setting.showComment
      this.getComments(book.url)
    },
    openLocalBook () {
      ipcRenderer['open-local-book'](this.bookDetail.filepath)
    },
    deleteLocalBook () {
      ipcRenderer['delete-local-book'](this.bookDetail.filepath)
      .then(()=>{
        _.remove(this.bookList, {filepath: this.bookDetail.filepath})
        _.remove(this.displayBookList, {filepath: this.bookDetail.filepath})
        this.dialogVisibleBookDetail = false
        this.chunkList()
      })
    },
    exportDatabase () {
      ipcRenderer['export-database']()
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
      ipcRenderer['load-import-database']()
      .then(database=>{
        _.forIn(this.bookList, (book, index)=>{
          let findData = _.find(database, {hash: book.hash})
          if (findData) {
            _.assign(book, findData)
            if (book.url){
              book.status = 'tagged'
            } else {
              book.status = 'tag-failed'
            }
            this.saveBookList()
          }
          if (index == this.bookList.length - 1) {
            this.dialogVisibleSetting = false
            this.printMessage('success', '导入完成')
          }
        })
      })
    },
    getBookInfo (book, server = 'e-hentai') {
      let getTag = (book, url, hash) => {
        let match = /(\d+)\/([a-z0-9]+)/.exec(url)
        axios.post('https://api.e-hentai.org/api.php', {
          'method': 'gdata',
          'gidlist': [
              [+match[1], match[2]]
          ],
          'namespace': 1
        })
        .then(res=>{
          try {
            _.assign(book, _.pick(res.data.gmetadata[0], ['tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category']), {url: url})
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
            // book.hash = hash
            this.saveBookList()
          } catch (e) {
            console.log(e)
            if (_.includes(res.data, 'Your IP address has been')) {
              book.status = 'non-tag'
              this.printMessage('error', 'Your IP address has been temporarily banned')
              this.saveBookList()
              this.serviceAvailable = false
            } else {
              book.status = 'tag-failed'
              this.printMessage('error', 'Get tag failed')
              this.saveBookList()
            }
          }
        })
      }
      if (book.url) {
        getTag(book, book.url)
      } else {
        if (server == 'e-hentai') {
          axios.get(`https://e-hentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on`)
          .then(res=>{
            try {
              let bookUrl = new DOMParser().parseFromString(res.data, 'text/html').querySelector('.gl3c.glname>a').getAttribute('href')
              getTag(book, bookUrl, book.hash)
            } catch (e) {
              console.log(e)
              if (res.data.includes('Your IP address has been')) {
                book.status = 'non-tag'
                this.printMessage('error', 'Your IP address has been temporarily banned')
                this.saveBookList()
                this.serviceAvailable = false
              } else {
                book.status = 'tag-failed'
                this.printMessage('error', 'Get tag failed')
                this.saveBookList()
              }
            }
          })
        } else {
          ipcRenderer['get-ex-webpage']({
            url: `https://exhentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on`,
            cookie: `igneous=${this.setting.igneous}; ipb_pass_hash=${this.setting.ipb_pass_hash}; ipb_member_id=${this.setting.ipb_member_id}`
          })
          .then(res=>{
            try {
              let bookUrl = new DOMParser().parseFromString(res, 'text/html').querySelector('.gl3c.glname>a').getAttribute('href')
              getTag(book, bookUrl, book.hash)
            } catch (e) {
              console.log(e)
              if (res.includes('Your IP address has been')) {
                book.status = 'non-tag'
                this.printMessage('error', 'Your IP address has been temporarily banned')
                this.saveBookList()
                this.serviceAvailable = false
              } else {
                book.status = 'tag-failed'
                this.printMessage('error', 'Get tag failed')
                this.saveBookList()
              }
            }
          })
        }
      }
    },
    getBookListMetadata (server) {
      this.dialogVisibleSetting = false
      this.serviceAvailable = true
      const timer = ms => new Promise(res => setTimeout(res, ms))
      let load = async (gap) => {
        for (let i = 0; i < this.bookList.length; i++) {
          if (this.bookList[i].status == 'non-tag' && this.serviceAvailable) {
            this.getBookInfo(this.bookList[i], server)
            this.printMessage('info', `Get Metadata ${i+1} of ${this.bookList.length}`)
            await timer(gap)
          }
        }
      }
      load(this.setting.requireGap || 10000)
    },
    saveBookList () {
      let bookList = _.cloneDeep(this.bookList)
      bookList = _.filter(bookList, book=>!book.collection)
      _.forIn(bookList, book=>{
        delete book.collected
        delete book.hidden
      })
      ipcRenderer['save-book-list'](bookList)
    },
    handleSearchStringChange (val) {
      if (!val) {
        this.displayBookList = this.bookList
        this.chunkList()
      }
    },
    searchBook () {
      let searchStringArray = this.searchString ? this.searchString.split(/ (?=(?:[^"']*["'][^"']*["'])*[^"']*$)/) : []
      this.displayBookList = _.filter(this.bookList, (book)=>{
        let bookString = JSON.stringify(_.pick(book, ['title', 'title_jpn', 'tags', 'status', 'category'])).toLowerCase()
        return _.every(searchStringArray, (str)=>{
          if (_.startsWith(str, '-')) {
            return !bookString.includes(str.slice(1).replace(/["']/g, '').toLowerCase())
          } else {
            return bookString.includes(str.replace(/["']/g, '').toLowerCase())
          }
        })
      })
      this.chunkList()
    },
    searchFromTag (tag) {
      this.dialogVisibleBookDetail = false
      this.searchString = `"${tag}"`
      this.searchBook()
    },
    shuffleBook () {
      this.displayBookList = _.shuffle(this.displayBookList)
      this.chunkList()
    },
    selectLibraryPath () {
      ipcRenderer['select-folder']()
      .then(res=>{
        this.setting.library = res
        this.saveSetting()
      })
    },
    selectImageExplorerPath () {
      ipcRenderer['select-file']()
      .then(res=>{
        this.setting.imageExplorer = res
        this.saveSetting()
      })
    },
    saveSetting () {
      ipcRenderer['save-setting'](_.cloneDeep(this.setting))
    },
    forceGeneBookList () {
      this.dialogVisibleSetting = false
      ipcRenderer['force-gene-book-list']()
      .then(res=>{
        this.bookList = res.sort(this.sortList('date'))
        this.displayBookList = this.bookList
        this.chunkList()
        this.loadCollectionList()
        this.printMessage('success', '强制重建漫画库完成')
      })
    },
    handleSizeChange () {
      this.chunkList()
      this.saveSetting()
      this.scrollMainPageTop()
    },
    handleCurrentChange (currentPage) {
      this.chunkDisplayBookList = this.customChunk(this.displayBookList, this.setting.pageSize, currentPage - 1)
      this.scrollMainPageTop()
    },
    scrollMainPageTop () {
      document.getElementsByClassName('book-card-area')[0].scrollTop = 0
    },
    openUrl (url) {
      ipcRenderer['open-url'](url)
    },
    editTags () {
      this.editingTag = !this.editingTag
      if (this.editingTag) {
        if (!_.has(this.bookDetail, 'tags')) this.bookDetail.tags = {}
        let tempTagGroup = {}
        _.forIn(this.bookList.map(b=>b.tags), (tagObject)=>{
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
        _.forIn(tempTagGroup, (tagArray, tagCat)=>{
          tempTagGroup[tagCat] = _.sortBy(_.uniq(tagArray))
        })
        this.tagGroup = tempTagGroup
      } else {
        _.forIn(this.bookDetail.tags, (tagarr, tagCat)=>{
          if (_.isEmpty(tagarr)) {
            delete this.bookDetail.tags[tagCat]
          }
        })
        this.saveBookList()
      }
    },
    viewManga () {
      this.viewerImageList = []
      const loading = ElLoading.service({
        lock: true,
        text: 'Loading',
        background: 'rgba(0, 0, 0, 0.7)',
      })
      ipcRenderer['load-manga-image-list'](_.cloneDeep(this.bookDetail))
      .then(list=>{
        this.viewerImageList = list
        loading.close()
        this.drawerVisibleViewer = true
      })
    },
    initResize (id) {
      if (this.imageStyleType == 'scroll') {
        let element = document.getElementById(id)
        let Resize = (e)=>{
          this.viewerImageWidth = e.clientX - element.offsetLeft
        }
        let stopResize = (e)=>{
          window.removeEventListener('mousemove', Resize, false)
          window.removeEventListener('mouseup', stopResize, false)
          localStorage.setItem('viewerImageWidth', this.viewerImageWidth)
        }
        window.addEventListener('mousemove', Resize, false)
        window.addEventListener('mouseup', stopResize, false)
      }
    },
    scrollPage (event) {
      if (this.imageStyleType == 'click') {
        if(event.clientX > window.innerWidth / 2) {
          document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, window.innerHeight)
        } else {
          document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, -window.innerHeight)
        }
      }
    },
    switchMark (book) {
      book.mark = !book.mark
      this.saveBookList()
    },
    handleSortChange (val) {
      switch(val){
        case 'mark':
          this.displayBookList = _.filter(this.bookList, 'mark')
          this.chunkList()
          break
        case 'collection':
          this.displayBookList = _.filter(this.bookList, 'collection')
          this.chunkList()
          break
        case 'addAscend':
          this.displayBookList = _.reverse(this.bookList.sort(this.sortList('date')))
          this.chunkList()
          break
        case 'addDescend':
          this.displayBookList = this.bookList.sort(this.sortList('date'))
          this.chunkList()
          break
        case 'postAscend':
          this.displayBookList = _.reverse(this.bookList.sort(this.sortList('posted')))
          this.chunkList()
          break
        case 'postDescend':
          this.displayBookList = this.bookList.sort(this.sortList('posted'))
          this.chunkList()
          break
        case 'scoreAscend':
          this.displayBookList = _.reverse(this.bookList.sort(this.sortList('rating')))
          this.chunkList()
          break
        case 'scoreDescend':
          this.displayBookList = this.bookList.sort(this.sortList('rating'))
          this.chunkList()
          break
        default:
          this.displayBookList = this.bookList
          this.chunkList()
          break
      }
    },
    showFile(filepath) {
      ipcRenderer['show-file'](filepath)
    },
    getComments (url) {
      this.comments = []
      if (url) {
        ipcRenderer['get-ex-webpage']({
          url,
          cookie: `igneous=${this.setting.igneous}; ipb_pass_hash=${this.setting.ipb_pass_hash}; ipb_member_id=${this.setting.ipb_member_id}`
        })
        .then(res=>{
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
      }
    },
    triggerShowComment () {
      if (this.showComment) {
        this.showComment = false
      } else {
        this.getComments(this.bookDetail.url)
        this.showComment = true
      }
    },
    switchThumbnail (val) {
      if (!val) {
        if (this.storeDrawerScrollTop) {
          this.$nextTick(()=>{
            document.getElementsByClassName('el-drawer__body')[0].scrollTop = this.storeDrawerScrollTop
            this.storeDrawerScrollTop = undefined
          })
        }
      } else {
        this.storeDrawerScrollTop = document.getElementsByClassName('el-drawer__body')[0].scrollTop
      }
    },
    handleClickThumbnail(chunkIndex, index) {
      this.showThumbnail = false
      let scrollTopValue = 0
      if (this.imageStyleType == 'scroll') {
        _.forIn(this.viewerImageList, (image, i)=>{
          if (i == (chunkIndex * this.thumbnailColumn + index)) return false
          // 28.3是.viewer-image-page的高度的平均值
          scrollTopValue += parseFloat(this.returnImageStyle(image).height) + 28.3
        })
      } else {
        scrollTopValue = window.innerHeight * (chunkIndex * this.thumbnailColumn + index)
      }
      this.$nextTick(()=>document.getElementsByClassName('el-drawer__body')[0].scrollTop = scrollTopValue)
    },
    createCollection () {
      this.editCollectionView = true
      if (this.selectCollection) this.handleSelectCollectionChange(this.selectCollection)
    },
    addCollection () {
      ElMessageBox.prompt('请输入合集名', '新增合集', {
      })
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
        this.printMessage('info', '已取消')
      })
    },
    saveCollection () {
      this.collectionList = _.filter(this.collectionList, c=>!_.isEmpty(_.compact(c.list)))
      ipcRenderer['save-collection-list'](_.cloneDeep(this.collectionList))
      .then(()=>{
        this.loadBookList(false)
        this.selectCollection = undefined,
        this.selectCollectionObject = {list:[]}
      })
      this.editCollectionView = false
    },
    loadCollectionList () {
      ipcRenderer['load-collection-list']()
      .then(res=>{
        this.collectionList = res
        _.forIn(this.collectionList, collection=>{
          let collectBook = _.compact(collection.list.map(id=>{
            return _.find(this.bookList, {id})
          }))
          collection.list = collectBook.map(book=>book.id)
          collectBook.map(book=>book.hidden = true)
          let date = _.reverse(_.sortBy(collectBook.map(book=>book.date)))[0]
          let posted = _.reverse(_.sortBy(collectBook.map(book=>book.posted)))[0]
          let rating = _.reverse(_.sortBy(collectBook.map(book=>book.rating)))[0]
          let mark = _.some(collectBook, 'mark')
          let tags = _.mergeWith({}, ...collectBook.map(book=>book.tags), (obj, src)=>{
            if (_.isArray(obj) && _.isArray(src)) {
              return _.uniq(obj.concat(src))
            } else {
              return src
            }
          })
          let title_jpn = collectBook.map(book=>book.title+book.title_jpn).join(',')
          this.bookList.push({
            title: collection.title,
            id: collection.id,
            coverPath: collectBook[0].coverPath,
            date, posted, rating, mark, tags, title_jpn,
            list: collection.list,
            collection: true
          })
        })
        this.displayBookList = this.bookList.sort(this.sortList('date'))
        this.chunkList()
      })
    },
    handleSelectCollectionChange (val) {
      this.selectCollectionObject= _.find(this.collectionList, {id: val})
      _.forIn(this.bookList, book=>{
        if (!book.collection) {
          if (this.selectCollectionObject.list.includes(book.id)) {
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
        this.selectCollectionObject.list = _.filter(this.selectCollectionObject.list, id=>id != book.id)
      } else {
        this.selectCollectionObject.list.push(book.id)
        book.collected = true
      }
    },
    openCollection(book) {
      this.drawerVisibleCollection = true
      this.openCollectionBookList = _.compact(book.list.map(id=>{
        return _.find(this.bookList, {id})
      }))
      this.openCollectionTitle = book.title
    }
  }
})
</script>
<style lang='stylus'>
body
  margin: auto
  width: 98vw
#app
  font-family: Avenir, Helvetica, Arial, sans-serif
  text-align: center
  margin-top: 20px

.function-button
  width: 100%

.book-card-area
  height: calc(100vh - 98px)
  overflow-x: auto
  justify-content: center
  margin-top: 8px
  .book-collect, .book-collection
    height: calc(100vh - 98px)
    overflow-x: auto
    justify-content: center

.pagination-bar
  margin: 4px 0
  justify-content: center

.book-badge
  .el-badge__content.is-fixed
    top: 10px
    right: calc(32px + 18px / 2)
.book-add-badge
  .el-badge__content.is-fixed
    top: 10px
    right: calc(10px + 18px / 2)
    cursor: pointer

.book-card-frame
  display: inline-block
.book-card
  display: inline-block
  width: 240px
  height: 372px
  border: solid 1px
  border-radius: 8px
  margin: 6px 10px
  position: relative
.book-collection-tag
  position: absolute
  right: -1px
  top: -1px
.book-title
  height: 37px
  overflow-y: hidden
  margin: 8px 2px
  font-size: 14px
.book-card-star, .book-detail-star
  position: absolute
.book-card-star
  right: 16px
  top: 40px
.book-detail-star
  right: 0
  top: -0.5em
.book-cover
  border-radius: 8px
  width: 200px
  height: 288px
  margin: 0 20px
.outer-read-button-group
  margin: 0 8px
.outer-read-button
  padding: 0 2px
.book-status-tag
  padding: 0 2px
  margin-right: 8px
.el-rate
  display: inline-block
  height: 18px

.book-collect-card
  width: 155px
  height: 232px
  border: solid 1px
  border-radius: 4px
  margin: 4px 8px
  position: relative
.book-collect-title
  height: 38px
  overflow-y: hidden
  margin: 4px 2px
  font-size: 10px
.book-collect-cover
  border-radius: 4px
  width: 125px
  height: 180px
.book-collection
  .book-collection-select
    width: 100%
  .book-collection-line
    text-align:left
    width: 100%
    height: 80px
    border: solid 1px
    border-radius: 4px
    margin: 2px 4px
    position: relative
    .book-collection-cover
      border-radius: 2px
      width: 50px
      height: 72px
      position: absolute
      top: 4px
      left: 2px
    .book-collection-title
      height: 72px
      overflow-y: hidden
      margin: 4px 4px 4px 54px
      font-size: 12px

.el-dialog
  .el-dialog__header
    .el-dialog__headerbtn
      margin: 0.5em 1em 0 0
      .el-icon
        width: 2em
        svg
          height: 2em
          width: 2em
  .el-dialog__body
    padding: 5px 20px 16px


.detail-book-title
  height: 44px
  overflow-y: hidden
  margin: 0 24px
.url-link
  cursor: pointer
.book-detail-card
  .book-detail-function
    justify-content: center
    margin-bottom: 10px
  .book-detail-cover-frame
    position: relative
    width: 250px
    margin: 0 auto
    margin-bottom: 10px
    .book-detail-cover
      width: 250px
      height: 360px
  .edit-line
    margin: 4px 0
    .el-select
      width: 100%
  .el-descriptions__label
    display: inline-block
    width: 64px
.book-tag-frame
  height: calc(100vh - 100px)
  overflow-y: auto
  padding-right: 10px
.book-tag
  margin: 4px 6px
  cursor: pointer
.book-comment-frame
  text-align: left
  height: calc(100vh - 100px)
  overflow-y: auto
  padding-right: 10px
  .book-comment
    .book-comment-postby
      font-size: 12px
      background-color: #333333
      padding-left: 4px
      color: #A8ABB2
    .book-comment-score
      float: right
      margin-right: 4px
    .book-comment-content
      font-size: 14px
      white-space: pre-wrap
      padding-left: 4px
      color: #909399

.setting-line
  margin: 6px 0
  .el-input-group__prepend
    width: 100px
.setting-switch
  margin-top: 6px

.el-drawer__body
  padding-top: 0
  padding-bottom: 0

.viewer-close-button
  position: absolute
  top: 1em
  right: 2em
  z-index: 10
  .el-icon
    width: 2em
    svg
      height: 2em
      width: 2em
.viewer-switch
  position: absolute
  top: 1em
  left: 1em
  z-index: 10
.image-frame
  overflow-y: hidden
  .viewer-image-frame
    position: relative
    margin: 0 auto
    .viewer-image
      position: absolute
      right: 0
      user-select: none
    .viewer-image-bar
      position: absolute
      height: 100%
      width: 6px
      right: -3px
      cursor: ew-resize
    .viewer-image-bar:hover
      background-color: #409EFF
  .viewer-image-page
    margin-bottom: 10px
.viewer-thumbnail-switch
  position: absolute
  top: 3em
  left: 1em
  z-index: 10
.drawer-thumbnail-content
  text-align: left
.viewer-thumbnail
  margin: 8px 0 0
.viewer-thunmnail-page
  text-align: center
  font-size: 11px

.open-collection-title
  margin: 0 10px
</style>
