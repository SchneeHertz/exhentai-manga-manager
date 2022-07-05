<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="9" :offset="3">
        <el-autocomplete
          v-model="searchString"
          :fetch-suggestions="querySearch"
          @keyup.enter="searchBook"
          @change="handleSearchStringChange"
          clearable
          class="search-input"
        ></el-autocomplete>
      </el-col>
      <el-col :span="1">
        <el-button type="primary" :icon="Search" plain class="function-button" @click="searchBook"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button type="primary" :icon="MdShuffle" plain class="function-button" @click="shuffleBook"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button type="primary" :icon="MdBulb" plain class="function-button" @click="displayTagGraph"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button :icon="Setting" plain class="function-button" @click="dialogVisibleSetting = true"></el-button>
      </el-col>
      <el-col :span="3">
        <el-select placeholder="排序" @change="handleSortChange" clearable v-model="sortValue">
          <el-option label="仅收藏" value="mark"></el-option>
          <el-option label="仅合集" value="collection"></el-option>
          <el-option label="仅隐藏" value="hidden"></el-option>
          <el-option label="添加时间正序" value="addAscend"></el-option>
          <el-option label="添加时间倒序" value="addDescend"></el-option>
          <el-option label="上传时间正序" value="postAscend"></el-option>
          <el-option label="上传时间倒序" value="postDescend"></el-option>
          <el-option label="评分正序" value="scoreAscend"></el-option>
          <el-option label="评分倒序" value="scoreDescend"></el-option>
        </el-select>
      </el-col>
      <el-col :span="4" :offset="1">
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
          <!-- show book card when book isn't a collection, book isn't hidden because collected,
            and book isn't hidden by user except sorting by onlyHiddenBook -->
          <div class="book-card" v-if="!book.collection && !book.hidden && (sortValue === 'hidden' || !book.hiddenBook)">
            <p class="book-title"
              @contextmenu="onMangaTitleContextMenu($event, book)"
              :title="book.title_jpn || book.title"
            >{{book.title_jpn || book.title}}</p>
            <img class="book-cover" :src="book.coverPath" @click="openBookDetail(book)" @contextmenu="onBookContextMenu($event, book)"/>
            <el-tag class="book-card-language" size="small" type="danger" v-show="isChineseTranslatedManga(book)">ZH</el-tag>
            <el-icon
              :size="30"
              :color="book.mark ? '#E6A23C' : '#666666'"
              class="book-card-star" @click="switchMark(book)"
            ><StarFilled /></el-icon>
            <el-button-group class="outer-read-button-group">
              <el-button type="success" size="small" class="outer-read-button" plain @click="bookDetail = book; openLocalBook()">阅</el-button>
              <el-button type="success" size="small" class="outer-read-button" plain @click="bookDetail = book; viewManga()">读</el-button>
            </el-button-group>
            <el-tag
              class="book-status-tag"
              :type="book.status === 'non-tag' ? 'info' : book.status === 'tagged' ? 'success' : 'warning'"
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
            <p class="book-collect-title" :title="book.title_jpn || book.title">{{book.title_jpn || book.title}}</p>
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
                <p class="book-collection-title" :title="element.title_jpn || element.title">{{element.title_jpn || element.title}}</p>
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
        <p class="detail-book-title">
          <span class="url-link" @click="openUrl(bookDetail.url)" @contextmenu="onMangaTitleContextMenu($event, bookDetail)">
            {{bookDetail.title_jpn || bookDetail.title}}</span>
        </p>
      </template>
      <el-row :gutter="20" class="book-detail-card" @click.middle="dialogVisibleBookDetail = !dialogVisibleBookDetail">
        <el-col :span="showComment?6:9">
          <el-row class="book-detail-function book-detail-cover-frame">
            <img
              class="book-detail-cover"
              :src="bookDetail.coverPath" @click="viewManga"
              @contextmenu="onMangaImageContextMenu($event, bookDetail.coverPath)"
            />
            <el-icon
              :size="30"
              :color="bookDetail.mark ? '#E6A23C' : '#666666'"
              class="book-detail-star" @click="switchMark(bookDetail)"
            ><StarFilled /></el-icon>
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
            <el-button plain @click="triggerShowComment">{{showComment ? '隐藏' : '显示'}}评论</el-button>
            <el-button type="primary" plain @click="editTags">{{editingTag ? '显示标签' : '编辑标签'}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button plain @click="getBookInfo(bookDetail, 'e-hentai')">获取EH元数据</el-button>
            <el-button type="primary" plain @click="getBookInfo(bookDetail, 'exhentai')">获取EX元数据</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button plain @click="deleteLocalBook(bookDetail)">删除漫画</el-button>
            <el-button type="primary" plain @click="getBookInfo(bookDetail, 'exsearch')">通过文件名获取元数据</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button plain @click="showFile(bookDetail.filepath)">打开漫画文件所在目录</el-button>
            <el-button type="primary" plain @click="triggerHiddenBook(bookDetail)">{{bookDetail.hiddenBook?'显示':'隐藏'}}漫画</el-button>
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
                <el-descriptions-item label="文件名:">{{returnFileName(bookDetail.filepath)}}</el-descriptions-item>
                <el-descriptions-item label="类别:">
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
                        @click="searchFromTag(tag)"
                      >{{resolvedTranslation[tag] ? resolvedTranslation[tag].name : tag }}</el-tag>
                    </template>
                  </el-popover>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-scrollbar>
        </el-col>
        <el-col :span="8" v-show="showComment">
          <el-scrollbar class="book-comment-frame">
            <div class="book-comment" v-for="comment in comments" :key="comment.id">
              <div class="book-comment-postby">{{comment.author}}<span class="book-comment-score">{{comment.score}}</span></div>
              <p class="book-comment-content" @contextmenu="onMangaCommentContextMenu ($event, comment.content)">{{comment.content}}</p>
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
            <el-input class="label-input">
              <template #prepend><span class="setting-label">主题</span></template>
              <template #append>
                <el-select placeholder=" " v-model="setting.theme" @change="handleThemeChange">
                  <el-option label="Default Dark" value="dark"></el-option>
                  <el-option label="Default Light" value="light"></el-option>
                  <el-option label="ExHentai" value="dark exhentai"></el-option>
                  <el-option label="E-Hentai" value="light e-hentai"></el-option>
                  <el-option label="nHentai" value="dark nhentai"></el-option>
                </el-select>
              </template>
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
            <el-input v-model="setting.proxy" @change="saveSetting" placeholder="格式为 http://127.0.0.1:7890">
              <template #prepend><span class="setting-label">代理服务器</span></template>
            </el-input>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="setting-line">
            <el-popover
              placement="top-start"
              effect="dark"
              trigger="hover"
              content="此操作将重建漫画库并清空元数据"
            >
              <template #reference>
                <el-button class="function-button" plain @click="forceGeneBookList">重建漫画库</el-button>
              </template>
            </el-popover>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="setting-line">
            <el-button class="function-button" type="primary" plain @click="getBookListMetadata('e-hentai')">批量获取EH元数据</el-button>
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
        <el-col :span="4">
          <div class="setting-line">
            <el-button class="function-button" type="success" plain @click="loadBookList(true)">手动扫描</el-button>
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
          <el-switch
            v-model="setting.showComment"
            inactive-text="评论"
            @change="saveSetting"
            class="setting-switch"
          />
        </el-col>
        <el-col :span="5">
          <el-switch
            v-model="setting.showTranslation"
            inactive-text="标签翻译"
            @change="handleTranslationSettingChange"
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
      <el-button :link="true" text :icon="Close" size="large" class="viewer-close-button" @click="drawerVisibleViewer = false"></el-button>
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
            <img
              :src="image.filepath + '?a=' + Math.random()"
              class="viewer-image"
              :style="{height: returnImageStyle(image).height}"
              @contextmenu="onMangaImageContextMenu($event, image.filepath)"
            />
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
        <p class="book-title" :title="book.title_jpn || book.title">{{book.title_jpn || book.title}}</p>
        <img class="book-cover" :src="book.coverPath" @click="openBookDetail(book)"/>
        <el-tag class="book-card-language" size="small" type="danger" v-show="isChineseTranslatedManga(book)">ZH</el-tag>
        <el-icon
          :size="30"
          :color="book.mark ? '#E6A23C' : '#666666'"
          class="book-card-star"
          @click="switchMark(book)"
        ><StarFilled /></el-icon>
        <el-button-group class="outer-read-button-group">
          <el-button size="small" class="outer-read-button" plain @click="bookDetail = book; openLocalBook()">阅</el-button>
          <el-button size="small" class="outer-read-button" plain @click="bookDetail = book; viewManga()">读</el-button>
        </el-button-group>
        <el-tag
          class="book-status-tag"
          :type="book.status === 'non-tag' ? 'info' : book.status === 'tagged' ? 'success' : 'warning'"
          @click="searchFromTag(book.status)"
        >{{book.status}}</el-tag>
        <el-rate v-model="book.rating"  v-if="!book.collection" allow-half/>
      </div>
    </el-drawer>
    <el-dialog
      v-model="dialogVisibleGraph"
      width="80%"
      top="5vh"
      destroy-on-close
      @close="destroyCanvas"
    >
      <template #header><p>标签分析</p></template>
      <div id="tag-graph"></div>
      <template #footer>
        <el-button type="primary" @click="geneRecommend(false, 'local')">搜索本地</el-button>
        <el-button type="primary" @click="geneRecommend">获取EX推荐</el-button>
        <el-button type="primary" @click="geneRecommend(true)">获取EX推荐(ZH)</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import axios from 'axios'
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus'
import { Close, Search, Setting } from '@element-plus/icons-vue'
import { MdShuffle, MdBulb } from '@vicons/ionicons4'
import he from 'he'
import {nanoid} from 'nanoid'
import draggable from 'vuedraggable'
import * as linkify from 'linkifyjs'
import G6 from '@antv/g6'

export default defineComponent({
  components: {
    draggable
  },
  setup () {
    return {
      Close, Search, Setting, MdShuffle, MdBulb
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
      openCollectionBookList: [],
      resolvedTranslation: {},
      searchHistory: [],
      tagNodeData: [],
      displayNodeData: [],
      dialogVisibleGraph: false
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
      if (this.setting.showTranslation) this.loadTranslationFromEhTagTranslation()
      if (this.setting.theme) this.changeTheme(this.setting.theme)
    })
    this.viewerImageWidth = localStorage.getItem('viewerImageWidth') || 1280
    this.imageStyleType = localStorage.getItem('imageStyleType') || 'scroll'
    window.addEventListener('keydown', this.resolveKey)
    this.searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]')
  },
  beforeUnmount () {
    window.removeEventListener('keydown', this.resolveKey)
  },
  methods: {
    resolveKey (event) {
      if (this.drawerVisibleViewer) {
        if (this.imageStyleType === 'click') {
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
    isChineseTranslatedManga (book) {
      return _.includes(book?.tags?.language, 'chinese') ? true : false
    },
    returnFileName (filepath) {
      let matched = /[^\\]+$/.exec(filepath)
      if (matched) {
        return matched[0]
      }
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
      if (this.imageStyleType === 'scroll') {
        return {width: this.viewerImageWidth + 'px', height: (image.height * (this.viewerImageWidth / image.width)) + 'px' }
      } else {
        // 28是.viewer-image-page的高度
        return {height: (window.innerHeight - 28) + 'px', width: (image.width * (window.innerHeight - 28) / image.height) + 'px'}
      }
    },
    returnImageFrameStyle () {
      if (this.imageStyleType === 'scroll') {
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
    deleteLocalBook (book) {
      ipcRenderer['delete-local-book'](book.filepath)
      .then(()=>{
        this.bookList = _.filter(this.bookList, b=>b.filepath !== book.filepath)
        this.displayBookList = _.filter(this.displayBookList, b=>b.filepath !== book.filepath)
        _.forIn(this.collectionList, collection=>{
          collection.list = _.filter(collection.list, id=>id !== book.id)
        })
        this.openCollectionBookList = _.filter(this.openCollectionBookList, b=>b.id !== book.id)
        this.saveBookList()
        .then(()=>{
          this.saveCollection()
          this.dialogVisibleBookDetail = false
        })
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
            if (book.collectionInfo) {
              let foundCollection = _.find(this.collectionList, {id: book.collectionInfo.id})
              if (foundCollection) {
                foundCollection.list = _.uniq([...foundCollection.list, book.id])
              } else {
                this.collectionList.push({
                  id: book.collectionInfo.id,
                  title: book.collectionInfo.title,
                  list: [book.id]
                })
              }
              delete book.collectionInfo
            }
            _.debounce(this.saveBookList, 1000)()
          }
          if (index == this.bookList.length - 1) {
            this.dialogVisibleSetting = false
            this.printMessage('success', '导入完成，如导入数据有合集，需打开编辑合集后手动保存')
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
            _.assign(
              book,
              _.pick(res.data.gmetadata[0], ['tags', 'title', 'title_jpn', 'filecount', 'rating', 'posted', 'filesize', 'category']),
              {url: url}
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
            // book.hash = hash
            _.throttle(this.saveBookList, 10000)()
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
        if (server === 'e-hentai') {
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
        } else if (server === 'exhentai') {
          ipcRenderer['get-ex-webpage']({
            url: `https://exhentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on`,
            cookie: `igneous=${this.setting.igneous};ipb_pass_hash=${this.setting.ipb_pass_hash};ipb_member_id=${this.setting.ipb_member_id}`
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
        } else if (server === 'exsearch') {
          let matchTitle = /\[[^[]+?]([^[]+)/.exec(book.title)
          if (matchTitle) {
            matchTitle = matchTitle[1]
          } else {
            matchTitle = book.title
          }
          ipcRenderer['get-ex-webpage']({
            url: `https://exhentai.org/?f_search=${encodeURI(matchTitle)}`,
            cookie: `igneous=${this.setting.igneous};ipb_pass_hash=${this.setting.ipb_pass_hash};ipb_member_id=${this.setting.ipb_member_id}`
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
          if (this.bookList[i].status === 'non-tag' && this.serviceAvailable) {
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
      return ipcRenderer['save-book-list'](bookList)
    },
    handleSearchStringChange (val) {
      if (!val) {
        this.displayBookList = this.bookList
        this.chunkList()
      }
    },
    searchBook () {
      let searchStringArray = this.searchString ? this.searchString.split(/ (?=(?:[^"']*["'][^"']*["'])*[^"']*$)/) : []
      this.searchHistory = _.take(_.uniq([this.searchString, ...this.searchHistory]), 8)
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory))
      this.displayBookList = _.filter(this.bookList, (book)=>{
        let bookString = JSON.stringify(_.pick(book, ['title', 'title_jpn', 'tags', 'status', 'category', 'filepath'])).toLowerCase()
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
      this.drawerVisibleCollection = false
      this.searchString = `"${tag}"`
      this.searchBook()
    },
    querySearch (queryString, callback) {
      let result = queryString ? _.filter(this.searchHistory, str=>_.includes(str.toLowerCase(), queryString.toLowerCase()))
        : this.searchHistory
      callback(result.map(s=>({value:s})))
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
        background: _.includes(this.setting.theme, 'light') ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
      })
      ipcRenderer['load-manga-image-list'](_.cloneDeep(this.bookDetail))
      .then(list=>{
        this.viewerImageList = list
        this.drawerVisibleViewer = true
      })
      .catch(err=>{
        console.log(err)
      })
      .finally(()=>{
        loading.close()
      })
    },
    initResize (id) {
      if (this.imageStyleType === 'scroll') {
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
      if (this.imageStyleType === 'click') {
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
        case 'hidden':
          this.displayBookList = _.filter(this.bookList, 'hiddenBook')
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
          cookie: `igneous=${this.setting.igneous};ipb_pass_hash=${this.setting.ipb_pass_hash};ipb_member_id=${this.setting.ipb_member_id}`
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
      if (this.imageStyleType === 'scroll') {
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
        this.selectCollectionObject.list = _.filter(this.selectCollectionObject.list, id=>id !== book.id)
      } else {
        this.selectCollectionObject.list.push(book.id)
        book.collected = true
      }
    },
    openCollection (book) {
      this.drawerVisibleCollection = true
      this.openCollectionBookList = _.compact(book.list.map(id=>{
        return _.find(this.bookList, {id})
      }))
      this.openCollectionTitle = book.title
    },
    triggerHiddenBook (book) {
      book.hiddenBook = !book.hiddenBook
      this.saveBookList()
    },
    loadTranslationFromEhTagTranslation () {
      let resultObject = {}
      axios.get('https://github.com/EhTagTranslation/Database/releases/latest/download/db.text.json')
      .then(res=>{
        let sourceTranslationDatabase = res.data.data
        _.forIn(sourceTranslationDatabase, cat=>{
          _.forIn(cat.data, (value, key)=>{
            resultObject[key] = _.pick(value, ['name', 'intro'])
          })
        })
        this.resolvedTranslation = resultObject
        localStorage.setItem('translationCache', JSON.stringify(resultObject))
      })
      .catch((error)=>{
        console.log(error)
        this.printMessage('warning', 'load translation from cache')
        this.resolvedTranslation = JSON.parse(localStorage.getItem('translationCache'))
      })
    },
    handleTranslationSettingChange (val) {
      if (val) {
        this.loadTranslationFromEhTagTranslation()
      } else {
        this.resolvedTranslation = {}
      }
      this.saveSetting()
    },
    handleThemeChange (val) {
      this.changeTheme(val)
      this.saveSetting()
    },
    changeTheme (classValue) {
      document.documentElement.setAttribute('class', classValue)
    },
    onBookContextMenu (e, book) {
      e.preventDefault()
      this.$contextmenu({
        x: e.x,
        y: e.y,
        items: [
          {
            label: '获取EH元数据',
            onClick: () => {
              this.getBookInfo(book, 'e-hentai')
            }
          },
          {
            label: '获取EX元数据',
            onClick: () => {
              this.getBookInfo(book, 'exhentai')
            }
          },
          {
            label: '通过文件名获取元数据',
            onClick: () => {
              this.getBookInfo(book, 'exsearch')
            }
          },
          {
            label: '打开漫画文件所在目录',
            onClick: () => {
              this.showFile(book.filepath)
            }
          },
          {
            label: '删除漫画',
            onClick: () => {
              this.deleteLocalBook(book)
            }
          },
          {
            label: '隐藏/显示漫画',
            onClick: () => {
              this.triggerHiddenBook(book)
            }
          },
          {
            label: '复制图片到剪贴板',
            onClick: () => {
              electronFunction['copy-image-to-clipboard'](book.coverPath)
            }
          },
        ]
      })
    },
    onMangaImageContextMenu (e, filepath) {
      e.preventDefault()
      this.$contextmenu({
        x: e.x,
        y: e.y,
        items: [
          {
            label: '复制图片到剪贴板',
            onClick: () => {
              electronFunction['copy-image-to-clipboard'](filepath)
            }
          },
          {
            label: '取消',
            onClick: () => {}
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
            label: '复制漫画名到剪贴板',
            onClick: () => {
              electronFunction['copy-text-to-clipboard'](book.title_jpn || book.title)
            }
          },
          {
            label: '复制链接到剪贴板',
            onClick: () => {
              electronFunction['copy-text-to-clipboard'](book.url)
            }
          },
          {
            label: '取消',
            onClick: () => {}
          },
        ]
      })
    },
    onMangaCommentContextMenu (e, comment) {
      e.preventDefault()
      let foundLink = linkify.find(comment, 'url')
      if (!_.isEmpty(foundLink)) {
        let items = foundLink.map(l=>({
          label: `转到 ${l.href}`,
          onClick: ()=>{
            ipcRenderer['open-url'](l.href)
          }
        }))
        items.push({
          label: '取消',
          onClick: () => {}
        })
        this.$contextmenu({
          x: e.x,
          y: e.y,
          items
        })
      }
    },
    displayTagGraph () {
      let nodes = []
      _.forIn(this.bookList, book=>{
        let tags = _.pick(book?.tags, ['male', 'female', 'mixed'])
        let tempNodes = []
        _.forIn(tags, (list, cat)=>{
          list.map(tag=>{
            tempNodes.push(`${cat}##${tag}`)
          })
        })
        nodes = nodes.concat(tempNodes)
      })
      let nodesObject = _.countBy(nodes)
      const colors = ['#BDD2FD', '#BDEFDB', '#C2C8D5', '#FBE5A2', '#F6C3B7', '#B6E3F5', '#D3C6EA', '#FFD8B8', '#AAD8D8', '#FFD6E7']
      let tempNodeData = []
      _.forIn(nodesObject, (count, label)=>{
        let labelArray = _.split(label, '##')
        try {
          tempNodeData.push({
            id: nanoid(),
            count,
            size: Math.ceil((Math.log(count)+1)*10),
            oriSize: Math.ceil((Math.log(count)+1)*10),
            name: `${labelArray[0]}:"${labelArray[1]}$"`,
            shortName: labelArray[1],
            label: count,
            oriLabel: count,
            style:{fill: _.sample(colors)}
          })
        } catch {}
      })
      this.tagNodeData = _.takeRight(_.sortBy(tempNodeData, 'count'), 128)
      this.tagNodeData = _.shuffle(this.tagNodeData)
      this.displayNodeData = this.tagNodeData
      this.dialogVisibleGraph = true
      this.$nextTick(()=>{
        let graph = new G6.Graph({
          container: 'tag-graph',
          layout: {
            type: 'force',
            nodeStrength: 30,
            collideStrength: 0.8,
            alphaDecay: 0.01,
            nodeSpacing: 8,
            preventOverlap: true,
          },
          modes: {
            default: ['drag-canvas', 'zoom-canvas', 'drag-node']
          }
        })
        graph.data({nodes: this.tagNodeData, edges:[]})
        const refreshDragedNodePosition = (e)=>{
          const model = e.item.get('model')
          model.fx = e.x
          model.fy = e.y
        }
        graph.on('node:dragstart', (e)=>{
          graph.layout()
          refreshDragedNodePosition(e)
        })
        graph.on('node:drag', (e)=>{
          refreshDragedNodePosition(e)
        })
        graph.on('node:dragend', (e)=>{
          e.item.get('model').fx = null
          e.item.get('model').fy = null
        })
        graph.on('node:click', (e)=>{
          const node = e.item
          const states = node.getStates()
          let clicked = false
          const model = node.getModel()
          _.find(this.displayNodeData, {id: model.id}).size = 200
          let size = 200
          let labelText = model.name
          states.forEach((state)=>{
            if (state === 'click') {
              clicked = true
              size = model.oriSize
              _.find(this.displayNodeData, {id: model.id}).size = model.oriSize
              labelText = model.oriLabel
            }
          })
          graph.setItemState(node, 'click', !clicked)
          graph.updateItem(node, {
            size,
            label: labelText,
          })
          graph.layout()
        })
        graph.render()
      })
    },
    geneRecommend (chinese = false, type = 'exhentai') {
      let tagGroup1 = _.filter(this.displayNodeData, n=>n.size < 200)
      let tagGroup2 = _.filter(this.displayNodeData, n=>n.size >= 200)
      let tagGroup3 = []
      if (tagGroup2.length >= 3) {
        tagGroup3 = tagGroup2
      } else {
        tagGroup3 = [...tagGroup2, ..._.sampleSize(tagGroup1, 3 - tagGroup2.length)]
      }
      if (type === 'exhentai') {
        ipcRenderer['open-url'](`https://exhentai.org/?f_search=${tagGroup3.map(n=>n.name).join(' ')}${chinese?' chinese':''}`)
      } else {
        this.dialogVisibleGraph = false
        this.searchString = `${tagGroup3.map(n=>`"${n.shortName}"`).join(' ')}`
        this.searchBook()
      }
    },
    destroyCanvas () {
      document.querySelector('#tag-graph canvas').remove()
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

.search-input,
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
  border: solid 1px var(--el-border-color)
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
.book-card-star, .book-detail-star, .book-card-language
  position: absolute
.book-card-language
  left: 19px
  top: 52px
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
  border: solid 1px var(--el-border-color)
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
    border: solid 1px var(--el-border-color)
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

.setting-line
  margin: 6px 0
  .el-input-group__prepend
    width: 100px
.setting-switch
  margin-top: 6px
.label-input>.el-input__wrapper
  display: none
.label-input
  .el-input-group__append
    width: calc(100% - 140px)
    padding: 0
    background-color: transparent
    border-left: solid 1px var(--el-border-color)
    .el-select
      width: 100%

.el-drawer__body
  padding-top: 0
  padding-bottom: 0

.viewer-close-button
  position: absolute
  top: 16px
  right: 27px
  z-index: 10
  .el-icon
    width: 32px
    svg
      height: 32px
      width: 32px
.viewer-close-button:hover
  color: var(--el-color-primary) !important
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
      background-color: var(--el-color-primary)
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

#tag-graph
  width: 100%
  height: calc(95vh - 220px)

.mx-context-menu
  background-color: var(--el-fill-color-extra-light)!important
  z-index: 3000!important
  .mx-context-menu-item:hover
    background-color: var(--el-fill-color-dark)
  .mx-context-menu-item
    padding: 6px
    .text
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
