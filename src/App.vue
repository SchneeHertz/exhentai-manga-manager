<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="8" :offset="5">
        <el-input v-model="searchString" @keyup.enter="searchBook" clearable></el-input>
      </el-col>
      <el-col :span="2"><el-button type="primary" plain class="function-button" @click="searchBook">搜索</el-button></el-col>
      <el-col :span="2"><el-button type="primary" plain class="function-button" @click="shuffleBook">打乱</el-button></el-col>
      <el-col :span="2"><el-button type="warning" plain class="function-button" @click="dialogVisibleSetting = true">设置</el-button></el-col>
    </el-row>
    <el-row :gutter="20" class="book-card-area">
      <div class="doujinshi-card" v-for="book in chunkDisplayBookList" :key="book.id">
        <p class="book-title">{{book.title}}</p>
        <img class="book-cover" :src="book.coverPath" @click="openBookDetail(book)"/>
        <el-tag :type="book.status == 'non-tag' ? 'info' : book.status == 'tagged' ? 'success' : 'warning'">{{book.status}}</el-tag>
        <el-rate v-model="book.rating" />
      </div>
    </el-row>
    <el-row class="pagination-bar">
      <el-pagination
        v-model:currentPage="currentPage"
        v-model:page-size="setting.pageSize"
        :page-sizes="[10, 12, 16, 24, 60, 600, 6000]"
        :small="true"
        layout="sizes, prev, pager, next"
        :total="displayBookList.length"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-row>
    <el-dialog
      v-model="dialogVisibleBookDetail"
      width="50%"
    >
      <template #title>
        <p class="detail-book-title">{{bookDetail.title}}</p>
      </template>
      <el-row :gutter="20" class="book-detail-card">
        <el-col :span="10">
          <el-row class="book-detail-function"><img class="book-cover" :src="bookDetail.coverPath" /></el-row>
          <el-row class="book-detail-function">
            <el-button type="success" plain @click="openLocalBook">阅读</el-button>
            <el-button type="primary" plain @click="getBookInfo(this.bookDetail)">获取元数据</el-button>
            <el-button type="primary" plain @click="editTags">{{editingTag ? '显示标签' : '编辑标签'}}</el-button>
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
              <el-input v-model="bookDetail.url">
                <template #prepend>漫画网址</template>
              </el-input>
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
                <el-tag class="book-tag" v-for="tag in tagArr" :key="tag" @click="searchFromTag(tag)">{{tag}}</el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-col>
      </el-row>
    </el-dialog>
    <el-dialog
      v-model="dialogVisibleSetting"
      width="50%"
    >
      <template #title><p class="detail-book-title">设置</p></template>
      <el-row :gutter="20">
        <el-col :span="24">
          <div class="setting-line">
            <el-input v-model="setting.proxy" @change="saveSetting">
              <template #prepend><span class="setting-label">代理服务器</span></template>
            </el-input>
          </div>
        </el-col>
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
        <el-col :span="5">
          <div class="setting-line">
            <el-button class="function-button" type="danger" @click="forceGeneBookList">强制重建漫画库</el-button>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="setting-line">
            <el-button class="function-button" type="primary" @click="getBookListMetadata">批量获取元数据</el-button>
          </div>
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios'
import { ElMessage } from 'element-plus'

export default {
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
      tagGroup: {}
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
      this.doujinshiList = res
      this.displayBookList = this.doujinshiList
      this.chunkList()
    })
  },
  methods: {
    printMessage(type, msg) {
      ElMessage.closeAll()
      ElMessage[type](msg)
    },
    chunkList () {
      this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[0]
    },
    openBookDetail (book) {
      this.bookDetail = book
      this.dialogVisibleBookDetail = true
    },
    openLocalBook () {
      ipcRenderer['open-local-book'](this.bookDetail.filepath)
    },
    getBookInfo (book) {
      if (book.url) {
        try {
          let match = /(\d+)\/([a-z0-9]+)/.exec(book.url)
          axios.post('https://api.e-hentai.org/api.php', {
            "method": "gdata",
            "gidlist": [
                [+match[1], match[2]]
            ],
            "namespace": 1
          })
          .then(res=>{
            _.assign(book, _.pick(res.data.gmetadata[0], ['tags', 'title', 'filecount', 'rating']))
            book.rating = +book.rating
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
            this.saveBookList()
          })
        } catch {
          book.status = 'tag-failed'
          this.printMessage('error', 'Get tag failed')
        }
      } else {
        ipcRenderer['get-cover-hash'](book.tempCoverPath)
        .then(hash=>{
          axios.get('https://e-hentai.org/?f_shash=' + hash.toUpperCase())
          .then(res=>{
            let bookUrl
            try {
              bookUrl = new DOMParser().parseFromString(res.data, 'text/html').querySelector('.gl3c.glname>a').getAttribute('href')
              let match = /(\d+)\/([a-z0-9]+)/.exec(bookUrl)
              axios.post('https://api.e-hentai.org/api.php', {
                "method": "gdata",
                "gidlist": [
                    [+match[1], match[2]]
                ],
                "namespace": 1
              })
              .then(res=>{
                _.assign(book, _.pick(res.data.gmetadata[0], ['tags', 'title', 'filecount', 'rating']), {url: bookUrl})
                book.rating = +book.rating
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
                this.saveBookList()
              })
            } catch {
              book.status = 'tag-failed'
              this.printMessage('error', 'Get tag failed')
            }
          })
        })
      }
    },
    getBookListMetadata () {
      this.dialogVisibleSetting = false
      const timer = ms => new Promise(res => setTimeout(res, ms))
      let load = async () => {
        for (let i = 0; i < this.doujinshiList.length; i++) {
          if (this.doujinshiList[i].status != 'tagged') {
            this.getBookInfo(this.doujinshiList[i])
            this.printMessage('info', `Get Metadata ${i+1} of ${this.doujinshiList.length}`)
            await timer(3000)
          }
        }
      }
      load()
    },
    saveBookList () {
      ipcRenderer['save-book-list'](_.cloneDeep(this.doujinshiList))
    },
    searchBook () {
      let searchStringArray = this.searchString.split(/ (?=(?:[^"']*["'][^"']*["'])*[^"']*$)/)
      this.displayBookList = _.filter(this.doujinshiList, (book)=>{
        let bookString = JSON.stringify(_.pick(book, ['title', 'tags', 'status'])).toLowerCase()
        return _.every(searchStringArray, (str)=>bookString.includes(str.replace(/["']/g, '').toLowerCase()))
      })
      this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[0]
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
        this.doujinshiList = res
        this.displayBookList = this.doujinshiList
        this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[0]
        this.printMessage('success', '强制重建漫画库完成')
      })
    },
    handleSizeChange (pageSize) {
      this.currentPage = 1
      this.chunkList()
      this.saveSetting()
    },
    handleCurrentChange (currentPage) {
      this.chunkDisplayBookList = _.chunk(this.displayBookList, this.setting.pageSize)[currentPage - 1]
    },
    editTags () {
      this.editingTag = !this.editingTag
      if (this.editingTag) {
        if (!_.has(this.bookDetail, 'tags')) this.bookDetail.tags = {}
        let tempTagGroup = {}
        _.forIn(this.doujinshiList.map(b=>b.tags), (tagObject)=>{
          _.forIn(tagObject, (tagArray, tagCat)=>{
            if (_.has(tempTagGroup, tagCat)) {
              tempTagGroup[tagCat] = [...tempTagGroup[tagCat], ...tagArray]
            } else {
              tempTagGroup[tagCat] = tagArray
            }
          })
        })
        _.forIn(tempTagGroup, (tagArray, tagCat)=>{
          tempTagGroup[tagCat] = _.uniq(tagArray)
        })
        this.tagGroup = tempTagGroup
      } else {
        this.saveBookList()
      }
    }
  }
}
</script>
<style lang="stylus">
:root
  --el-text-color-primary: #FFFFFF
body, .el-dialog, .el-descriptions__body, .el-pager li, .el-pagination button:disabled, .el-pagination .btn-next, .el-pagination .btn-prev
  background-color: #515460
body
  margin: auto
  width: 98vw
#app
  font-family: Avenir, Helvetica, Arial, sans-serif
  text-align: center
  color: #2c3e50
  margin-top: 20px
.function-button
  width: 100%
.book-card-area
  height: calc(100vh - 90px)
  overflow-x: auto
  justify-content: center
.pagination-bar
  margin: 4px 0
  justify-content: center

.doujinshi-card
  width: 260px
  height: 470px
  border: solid 1px gray
  border-radius: 4px
  margin: 10px 20px
.book-title
  color: white
  height: 60px
  overflow-y: hidden
  margin: 8px 0px
.detail-book-title
  color: white
  height: 44px
  overflow-y: hidden
  margin: 0 24px
.book-cover
  border-radius: 4px
.book-detail-card
  .el-descriptions__label
    display: inline-block
    width: 64px
  .book-detail-function
    justify-content: center
    margin-bottom: 10px
  .edit-line
    margin: 4px 0
    .el-select
      width: 100%
.book-tag
  margin: 4px 6px
  cursor: pointer

.setting-line
  margin: 6px 0

.el-dialog__body
  padding: 5px 20px 16px
.el-rate
  display: inline-block
  height: 18px
  margin: 0 10px
</style>
