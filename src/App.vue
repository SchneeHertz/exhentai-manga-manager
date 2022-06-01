<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="8" :offset="3">
        <el-input v-model="searchString" @keyup.enter="searchBook" clearable></el-input>
      </el-col>
      <el-col :span="2"><el-button type="primary" class="function-button" @click="searchBook">搜索</el-button></el-col>
      <el-col :span="2"><el-button type="primary" plain class="function-button" @click="shuffleBook">打乱</el-button></el-col>
      <el-col :span="2"><el-button type="warning" plain class="function-button" @click="dialogVisibleSetting = true">设置</el-button></el-col>
      <el-col :span="4">
        <el-select placeholder="排序" @change="handleSortChange" clearable v-model="sortValue">
          <el-option label="仅收藏" value="mark"></el-option>
          <el-option label="添加时间正序" value="addAscend"></el-option>
          <el-option label="添加时间倒序" value="addDescend"></el-option>
          <el-option label="上传时间正序" value="postAscend"></el-option>
          <el-option label="上传时间倒序" value="postDescend"></el-option>
          <el-option label="评分正序" value="scoreAscend"></el-option>
          <el-option label="评分倒序" value="scoreDescend"></el-option>
        </el-select>
      </el-col>
    </el-row>
    <el-row :gutter="20" class="book-card-area">
      <div class="doujinshi-card" v-for="book in chunkDisplayBookList" :key="book.id">
        <p class="book-title" :title="book.title_jpn ? book.title_jpn : book.title">{{book.title_jpn ? book.title_jpn : book.title}}</p>
        <img class="book-cover" :src="book.coverPath" @click="openBookDetail(book)"/>
        <el-icon :size="30" :color="book.mark ? '#E6A23C' : '#666666'" class="book-card-star" @click="switchMark(book)"><StarFilled /></el-icon>
        <el-button-group class="outer-read-button-group">
          <el-button type="success" size="small" class="outer-read-button" plain @click="bookDetail = book; openLocalBook()">阅</el-button>
          <el-button type="success" size="small" class="outer-read-button" plain @click="bookDetail = book; viewManga()">读</el-button>
        </el-button-group>
        <el-tag :type="book.status == 'non-tag' ? 'info' : book.status == 'tagged' ? 'success' : 'warning'">{{book.status}}</el-tag>
        <el-rate v-model="book.rating" allow-half/>
      </div>
    </el-row>
    <el-row class="pagination-bar">
      <el-pagination
        v-model:currentPage="currentPage"
        v-model:page-size="setting.pageSize"
        :page-sizes="[10, 12, 16, 24, 60, 600, 6000]"
        :small="true"
        layout="sizes, prev, pager, next, total"
        :total="displayBookList.length"
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
      <el-row :gutter="20" class="book-detail-card">
        <el-col :span="showComment?6:9">
          <el-row class="book-detail-function detail-cover">
            <img class="book-cover" :src="bookDetail.coverPath" @click="viewManga"/>
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
            <el-button type="success" @click="openLocalBook">阅读</el-button>
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
                <el-descriptions-item label="类别:"><el-tag type="info" class="book-tag" @click="searchFromTag(bookDetail.category)">{{bookDetail.category}}</el-tag></el-descriptions-item>
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
            <el-button class="function-button" type="primary" plain @click="loadBookList">手动扫描</el-button>
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
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import axios from 'axios'
import { ElMessage, ElLoading } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import he from 'he'
import {nanoid} from 'nanoid'

export default defineComponent({
  setup () {
    return {
      Close
    }
  },
  data () {
    return {
      doujinshiList: [],
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
      storeDrawerScrollTop: undefined
    }
  },
  computed: {
    thumbnailList () {
      if (this.setting.thumbnailColumn) {
        this.thumbnailColumn = this.setting.thumbnailColumn
      }
      return _.chunk(this.viewerImageList, this.thumbnailColumn)
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
      ipcRenderer['load-doujinshi-list'](this.setting.loadOnStart)
      .then(res=>{
        this.doujinshiList = res.sort(this.sortList('date'))
        this.displayBookList = this.doujinshiList
        this.chunkList()
      })
    })
    this.viewerImageWidth = localStorage.getItem('viewerImageWidth') || 1280
    this.imageStyleType = localStorage.getItem('imageStyleType') || 'scroll'
    window.addEventListener('keydown', event=>{
      if (this.drawerVisibleViewer && this.imageStyleType == 'click') {
        if (event.key === 'ArrowRight') {
          document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, window.innerHeight)
        } else if (event.key === 'ArrowLeft') {
          document.getElementsByClassName('el-drawer__body')[0].scrollBy(0, -window.innerHeight)
        }
      }
    })
  },
  methods: {
    loadBookList () {
      ipcRenderer['load-doujinshi-list'](true)
      .then(res=>{
        this.doujinshiList = res.sort(this.sortList('date'))
        this.displayBookList = this.doujinshiList
        this.chunkList()
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
      this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[0]
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
        _.remove(this.doujinshiList, {filepath: this.bookDetail.filepath})
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
        _.forIn(this.doujinshiList, (book, index)=>{
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
          if (index == this.doujinshiList.length - 1) {
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
            book.hash = hash
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
          axios.get('https://e-hentai.org/?f_shash=' + book.hash.toUpperCase() + '&fs_exp=on')
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
          ipcRenderer['get-ex-url']({
            hash: book.hash.toUpperCase(),
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
        for (let i = 0; i < this.doujinshiList.length; i++) {
          if (this.doujinshiList[i].status == 'non-tag' && this.serviceAvailable) {
            this.getBookInfo(this.doujinshiList[i], server)
            this.printMessage('info', `Get Metadata ${i+1} of ${this.doujinshiList.length}`)
            await timer(gap)
          }
        }
      }
      load(this.setting.requireGap || 10000)
    },
    saveBookList () {
      ipcRenderer['save-book-list'](_.cloneDeep(this.doujinshiList))
    },
    searchBook () {
      let searchStringArray = this.searchString ? this.searchString.split(/ (?=(?:[^"']*["'][^"']*["'])*[^"']*$)/) : []
      this.displayBookList = _.filter(this.doujinshiList, (book)=>{
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
        this.doujinshiList = res.sort(this.sortList('date'))
        this.displayBookList = this.doujinshiList
        this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[0]
        this.printMessage('success', '强制重建漫画库完成')
      })
    },
    handleSizeChange () {
      this.chunkList()
      this.saveSetting()
      this.scrollMainPageTop()
    },
    handleCurrentChange (currentPage) {
      this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[currentPage - 1]
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
        _.forIn(this.doujinshiList.map(b=>b.tags), (tagObject)=>{
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
          this.displayBookList = _.filter(this.doujinshiList, 'mark')
          this.chunkList()
          break
        case 'addAscend':
          this.displayBookList = _.reverse(this.doujinshiList.sort(this.sortList('date')))
          this.chunkList()
          break
        case 'addDescend':
          this.displayBookList = this.doujinshiList.sort(this.sortList('date'))
          this.chunkList()
          break
        case 'postAscend':
          this.displayBookList = _.reverse(this.doujinshiList.sort(this.sortList('posted')))
          this.chunkList()
          break
        case 'postDescend':
          this.displayBookList = this.doujinshiList.sort(this.sortList('posted'))
          this.chunkList()
          break
        case 'scoreAscend':
          this.displayBookList = _.reverse(this.doujinshiList.sort(this.sortList('rating')))
          this.chunkList()
          break
        case 'scoreDescend':
          this.displayBookList = this.doujinshiList.sort(this.sortList('rating'))
          this.chunkList()
          break
        default:
          this.displayBookList = this.doujinshiList
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
        axios.get(url)
        .then(res=>{
          let commentElements = new DOMParser().parseFromString(res.data, 'text/html').querySelectorAll('#cdiv>.c1')
          commentElements.forEach(e=>{
            let author = e.querySelector('.c2 .c3').textContent
            let score = e.querySelector('.c2 .nosel').textContent
            let content = e.querySelector('.c6').innerHTML
            content = content.replace(/<br>/gi, '\n')
            content = content.replace(/<.+?>/gi, '')
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
.el-rate
  display: inline-block
  height: 18px
  margin: 0 10px

.pagination-bar
  margin: 4px 0
  justify-content: center

.doujinshi-card
  width: 260px
  height: 470px
  border: solid 1px
  border-radius: 8px
  margin: 10px 20px
  position: relative
.book-title
  height: 60px
  overflow-y: hidden
  margin: 8px 0px

.book-cover
  border-radius: 8px
  width: 250px
  height: 360px
.book-card-star, .book-detail-star
  position: absolute
.book-card-star
  right: 0
  top: 2em
.book-detail-star
  right: 0
  top: -0.5em
.outer-read-button-group
  margin-right: 8px
.outer-read-button
  padding: 0 2px

.el-dialog
  //border: solid 4px
  //border-radius: 16px
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
  .detail-cover
    position: relative
    width: 250px
    margin: 0 auto
    margin-bottom: 10px
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
    .book-comment-score
      float: right
      margin-right: 4px
    .book-comment-content
      font-size: 14px
      white-space: pre-wrap

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
</style>
