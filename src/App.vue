<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="8" :offset="5">
        <el-input v-model="searchString" @keyup.enter="searchBook" clearable></el-input>
      </el-col>
      <el-col :span="2"><el-button type="primary" class="function-button" @click="searchBook">搜索</el-button></el-col>
      <el-col :span="2"><el-button type="primary" plain class="function-button" @click="shuffleBook">打乱</el-button></el-col>
      <el-col :span="2"><el-button type="warning" plain class="function-button" @click="dialogVisibleSetting = true">设置</el-button></el-col>
    </el-row>
    <el-row :gutter="20" class="book-card-area">
      <div class="doujinshi-card" v-for="book in chunkDisplayBookList" :key="book.id">
        <p class="book-title" :title="book.title_jpn ? book.title_jpn : book.title">{{book.title_jpn ? book.title_jpn : book.title}}</p>
        <img class="book-cover" :src="book.coverPath" @click="openBookDetail(book)"/>
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
      width="60%"
      :modal="false"
    >
      <template #title>
        <p class="detail-book-title"><span class="url-link" @click="openUrl(bookDetail.url)">{{bookDetail.title_jpn ? bookDetail.title_jpn : bookDetail.title}}</span></p>
      </template>
      <el-row :gutter="20" class="book-detail-card">
        <el-col :span="10">
          <el-row class="book-detail-function">
            <img class="book-cover" :src="bookDetail.coverPath" @click="viewManga"/>
          </el-row>
          <el-row class="book-detail-function">
            <el-button type="success" @click="openLocalBook">阅读</el-button>
            <el-button type="danger" plain @click="deleteLocalBook">删除</el-button>
            <el-button type="primary" plain @click="editTags">{{editingTag ? '显示标签' : '编辑标签'}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button type="primary" plain @click="getBookInfo(this.bookDetail, 'e-hentai')">获取元数据</el-button>
            <el-button type="primary" plain @click="getBookInfo(this.bookDetail, 'exhentai')">获取EX元数据</el-button>
          </el-row>
        </el-col>
        <el-col :span="14">
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
              <el-descriptions-item v-for="(tagArr, key) in bookDetail.tags" :label="key + ':'" :key="key">
                <el-tag type="info" class="book-tag" v-for="tag in tagArr" :key="tag" @click="searchFromTag(tag)">{{tag}}</el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-col>
      </el-row>
    </el-dialog>
    <el-dialog
      v-model="dialogVisibleSetting"
      width="40%"
      :modal="false"
    >
      <template #title><p class="detail-book-title">设置</p></template>
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
      <div>
        <div
          v-for="(image, index) in viewerImageList"
          :key="image.id"
          class="image-frame"
        >
          <div
            class="viewer-image-frame"
            :id="image.id"
            :style="{width: viewerImageWidth + 'px', height: (image.height * (viewerImageWidth / image.width)) + 'px' }"
          >
            <img :src="image.filepath" class="viewer-image" :style="{width: viewerImageWidth + 'px'}"/>
            <div class="viewer-image-bar" @mousedown="initResize(image.id)"></div>
          </div>
          <div class="viewer-image-page">{{index + 1}} of {{viewerImageList.length}}</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'

export default {
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
      serviceAvaible: true,
      drawerVisibleViewer: false,
      viewerImageList: [],
      viewerImageWidth: 1280
    }
  },
  computed: {
  },
  mounted () {
    ipcRenderer['send-message']((event, arg)=>{
      this.printMessage('info', arg)
      if (arg.includes('failed')) console.log(arg)
    })
    ipcRenderer['load-setting']()
    .then(res=>{
      this.setting = res
    })
    ipcRenderer['load-doujinshi-list']()
    .then(res=>{
      this.doujinshiList = res.sort(this.sortList)
      this.displayBookList = this.doujinshiList
      this.chunkList()
    })
    this.viewerImageWidth = localStorage.getItem('viewerImageWidth') || 1280
  },
  methods: {
    sortList(a, b) {
      if (a['date'] && b['date']) {
        if (a['date'] > b['date']) {
          return -1
        } else if (a['date'] < b['date']) {
          return 1
        } else {
          return 0
        }
      } else if (a['date']) {
        return -1
      } else if (b['date']) {
        return 1
      } else {
        return 0
      }
    },
    printMessage(type, msg) {
      ElMessage.closeAll()
      ElMessage[type](msg)
    },
    chunkList () {
      this.currentPage = 1
      this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[0]
    },
    openBookDetail (book) {
      this.bookDetail = book
      this.dialogVisibleBookDetail = true
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
          ipcRenderer['get-cover-hash'](book.tempCoverPath)
          .then(hash=>{
            let findData = _.find(database, {hash})
            if (findData) {
              _.assign(book, findData)
              if (book.url){
                book.status = 'tagged'
              } else {
                book.status = 'tag-failed'
              }
              this.saveBookList()
            }
          })
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
          "method": "gdata",
          "gidlist": [
              [+match[1], match[2]]
          ],
          "namespace": 1
        })
        .then(res=>{
          try {
            _.assign(book, _.pick(res.data.gmetadata[0], ['tags', 'title', 'title_jpn', 'filecount', 'rating']), {url: url})
            book.rating = +book.rating
            book.title = _.unescape(book.title)
            book.title_jpn = _.unescape(book.title_jpn)
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
          } catch {
            if (_.includes(res.data, 'Your IP address has been')) {
              book.status = 'non-tag'
              this.printMessage('error', 'Your IP address has been temporarily banned')
              this.saveBookList()
              this.serviceAvaible = false
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
        ipcRenderer['get-cover-hash'](book.tempCoverPath)
        .then(hash=>{
          if (server == 'e-hentai') {
            axios.get('https://e-hentai.org/?f_shash=' + hash.toUpperCase() + '&fs_exp=on')
            .then(res=>{
              try {
                let bookUrl = new DOMParser().parseFromString(res.data, 'text/html').querySelector('.gl3c.glname>a').getAttribute('href')
                getTag(book, bookUrl, hash)
              } catch {
                if (res.data.includes('Your IP address has been')) {
                  book.status = 'non-tag'
                  this.printMessage('error', 'Your IP address has been temporarily banned')
                  this.saveBookList()
                  this.serviceAvaible = false
                } else {
                  book.status = 'tag-failed'
                  this.printMessage('error', 'Get tag failed')
                  this.saveBookList()
                }
              }
            })
          } else {
            ipcRenderer['get-ex-url']({
              hash: hash.toUpperCase(),
              cookie: `igneous=${this.setting.igneous}; ipb_pass_hash=${this.setting.ipb_pass_hash}; ipb_member_id=${this.setting.ipb_member_id}`
            })
            .then(res=>{
              try {
                let bookUrl = new DOMParser().parseFromString(res, 'text/html').querySelector('.gl3c.glname>a').getAttribute('href')
                getTag(book, bookUrl, hash)
              } catch {
                if (res.includes('Your IP address has been')) {
                  book.status = 'non-tag'
                  this.printMessage('error', 'Your IP address has been temporarily banned')
                  this.saveBookList()
                  this.serviceAvaible = false
                } else {
                  book.status = 'tag-failed'
                  this.printMessage('error', 'Get tag failed')
                  this.saveBookList()
                }
              }
            })
          }
        })
      }
    },
    getBookListMetadata (server) {
      this.dialogVisibleSetting = false
      this.serviceAvaible = true
      const timer = ms => new Promise(res => setTimeout(res, ms))
      let load = async () => {
        for (let i = 0; i < this.doujinshiList.length; i++) {
          if (this.doujinshiList[i].status == 'non-tag' && this.serviceAvaible) {
            this.getBookInfo(this.doujinshiList[i], server)
            this.printMessage('info', `Get Metadata ${i+1} of ${this.doujinshiList.length}`)
            await timer(1000)
          }
        }
      }
      load()
    },
    saveBookList () {
      ipcRenderer['save-book-list'](_.cloneDeep(this.doujinshiList))
    },
    searchBook () {
      let searchStringArray = this.searchString ? this.searchString.split(/ (?=(?:[^"']*["'][^"']*["'])*[^"']*$)/) : []
      this.displayBookList = _.filter(this.doujinshiList, (book)=>{
        let bookString = JSON.stringify(_.pick(book, ['title', 'title_jpn', 'tags', 'status'])).toLowerCase()
        return _.every(searchStringArray, (str)=>bookString.includes(str.replace(/["']/g, '').toLowerCase()))
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
        this.doujinshiList = res.sort(this.sortList)
        this.displayBookList = this.doujinshiList
        this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[0]
        this.printMessage('success', '强制重建漫画库完成')
      })
    },
    handleSizeChange () {
      this.chunkList()
      this.saveSetting()
    },
    handleCurrentChange (currentPage) {
      this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[currentPage - 1]
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
            this.bookDetail.tags[tagCat] = undefined
          }
        })
        this.saveBookList()
      }
    },
    viewManga () {
      this.drawerVisibleViewer = true
      ipcRenderer['load-manga-image-list'](this.bookDetail.filepath)
      .then(list=>{
        this.viewerImageList = list
      })
    },
    initResize (id) {
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
  }
}
</script>
<style lang="stylus">
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
.book-title
  height: 60px
  overflow-y: hidden
  margin: 8px 0px

.book-cover
  border-radius: 8px
  width: 250px
  height: 360px

.el-dialog
  border: solid 4px
  border-radius: 16px
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
  .edit-line
    margin: 4px 0
    .el-select
      width: 100%
  .el-descriptions__label
    display: inline-block
    width: 64px
.book-tag
  margin: 4px 6px
  cursor: pointer

.setting-line
  margin: 6px 0
  .el-input-group__prepend
    width: 100px

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
.image-frame
  margin-bottom: 10px
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

</style>
