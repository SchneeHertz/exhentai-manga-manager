<template>
  <el-config-provider :locale="locale">
    <el-row :gutter="20">
      <el-col :span="1" :offset="2">
        <el-button type="primary" :icon="TreeViewAlt" plain class="function-button" @click="geneFolderTree" :title="$t('m.folderTree')"></el-button>
      </el-col>
      <el-col :span="9">
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
        <el-button type="primary" :icon="Search32Filled" plain class="function-button" @click="searchBook" :title="$t('m.search')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button type="primary" :icon="MdShuffle" plain class="function-button" @click="shuffleBook" :title="$t('m.shuffle')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button type="primary" :icon="MdBulb" plain class="function-button" @click="displayTagGraph" :title="$t('m.tagAnalysis')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button :icon="Setting" plain class="function-button" @click="dialogVisibleSetting = true" :title="$t('m.setting')"></el-button>
      </el-col>
      <el-col :span="3">
        <el-select :placeholder="$t('m.sort')" @change="handleSortChange" clearable v-model="sortValue">
          <el-option :label="$t('m.bookmarkOnly')" value="mark"></el-option>
          <el-option :label="$t('m.collectionOnly')" value="collection"></el-option>
          <el-option :label="$t('m.hiddenOnly')" value="hidden"></el-option>
          <el-option :label="$t('m.addTimeAscend')" value="addAscend"></el-option>
          <el-option :label="$t('m.addTimeDescend')" value="addDescend"></el-option>
          <el-option :label="$t('m.postTimeAscend')" value="postAscend"></el-option>
          <el-option :label="$t('m.postTimeDescend')" value="postDescend"></el-option>
          <el-option :label="$t('m.ratingAscend')" value="scoreAscend"></el-option>
          <el-option :label="$t('m.ratingDescend')" value="scoreDescend"></el-option>
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-row :gutter="20">
          <el-col :span="6"  v-if="!editCollectionView">
            <el-button type="primary" plain class="function-button" @click="createCollection" :icon="CicsSystemGroup" :title="$t('m.manageCollection')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editCollectionView">
            <el-button type="primary" plain class="function-button" @click="addCollection" :icon="Collections20Filled" :title="$t('m.addCollection')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editCollectionView">
            <el-button type="primary" plain class="function-button" @click="saveCollection" :icon="MdSave" :title="$t('m.save')"></el-button>
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
            and book isn't hidden by user except sorting by onlyHiddenBook
            and book isn't hidden by folder select -->
          <div class="book-card" v-if="!book.collection && !book.hidden && (sortValue === 'hidden' || !book.hiddenBook) && !book.folderHide">
            <p class="book-title"
              @click="openBookDetail(book)"
              @contextmenu="onMangaTitleContextMenu($event, book)"
              :title="book.title_jpn || book.title"
            >{{book.title_jpn || book.title}}</p>
            <img
              class="book-cover"
              :src="book.coverPath"
              @click="handleClickCover(book)"
              @contextmenu="onBookContextMenu($event, book)"
            />
            <el-tag class="book-card-language" size="small" type="danger" v-show="isChineseTranslatedManga(book)">ZH</el-tag>
            <el-icon
              :size="30"
              :color="book.mark ? '#E6A23C' : '#666666'"
              class="book-card-star" @click="switchMark(book)"
            ><BookmarkTwotone /></el-icon>
            <el-button-group class="outer-read-button-group">
              <el-button type="success" size="small" class="outer-read-button" plain @click="openLocalBook(book)">{{$t('m.re')}}</el-button>
              <el-button type="success" size="small" class="outer-read-button" plain @click="viewManga(book)">{{$t('m.ad')}}</el-button>
            </el-button-group>
            <el-tag
              class="book-status-tag"
              :type="book.status === 'non-tag' ? 'info' : book.status === 'tagged' ? 'success' : 'warning'"
              @click="searchFromTag(book.status)"
            >{{book.status}}</el-tag>
            <el-rate v-model="book.rating"  v-if="!book.collection" allow-half/>
          </div>
          <div class="book-card" v-if="book.collection && !book.folderHide">
            <el-tag effect="dark" type="warning" class="book-collection-tag">{{$t('m.collection')}}</el-tag>
            <p class="book-title" :title="book.title">{{book.title}}</p>
            <img class="book-cover" :src="book.coverPath" @click="openCollection(book)"/>
            <el-icon :size="30" :color="book.mark ? '#E6A23C' : '#666666'" class="book-card-star"><BookmarkTwotone /></el-icon>
            <el-rate v-model="book.rating" allow-half/>
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
          v-show="!book.collection && !book.folderHide"
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
        layout="sizes, prev, pager, next, total"
        :total="displayBookCount"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-row>
    <el-drawer
      v-model="drawerVisibleViewer"
      direction="ttb"
      size="100%"
      :with-header="false"
      destroy-on-close
      @closed="releaseSendImageLock"
    >
      <el-button :link="true" text :icon="Close" size="large" class="viewer-close-button" @click="drawerVisibleViewer = false"></el-button>
      <el-switch
        v-model="imageStyleType"
        size="small"
        inline-prompt
        :active-text="$t('m.scrolling')"
        :inactive-text="$t('m.singlePage')"
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
        :active-text="$t('m.thumbnail')"
        :inactive-text="$t('m.content')"
        @change="switchThumbnail"
        class="viewer-thumbnail-switch"
        width="60px"
      />
      <div
        class="drawer-image-content"
        @click="scrollPage"
        v-if="!showThumbnail"
        v-loading="viewerImageList.length == 0"
        element-loading-text="Loading"
        element-loading-background="transparent"
      >
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
              :src="`${image.filepath}?id=${image.id}`"
              class="viewer-image"
              :style="{height: returnImageStyle(image).height}"
              @contextmenu="onMangaImageContextMenu($event, image.filepath)"
            />
            <div class="viewer-image-bar" @mousedown="initResize(image.id)"></div>
          </div>
          <div class="viewer-image-page">{{index + 1}} of {{viewerImageList.length}}</div>
        </div>
        <el-button size="large" type="success" class="next-manga-button" @click="toNextManga(true)">{{$t('m.nextMangaRandom')}}</el-button>
        <el-button size="large" type="success" class="next-manga-button" @click="toNextManga(false)">{{$t('m.nextManga')}}</el-button>
      </div>
      <div
        class="drawer-thumbnail-content"
        v-if="showThumbnail"
        v-loading="viewerImageList.length == 0"
        element-loading-text="Loading"
        element-loading-background="transparent"
      >
        <!-- eslint-disable-next-line vue/valid-v-for -->
        <el-space v-for="(chunk, chunkIndex) in thumbnailList" :size="16">
          <div v-for="(image, index) in chunk" :key="image.id">
            <img
              :src="`${image.thumbnailPath}?id=${image.id}`"
              class="viewer-thumbnail"
              :style="{width: `calc((100vw - 40px) / ${thumbnailColumn} - 16px)`}"
              @click="handleClickThumbnail(chunkIndex, index)"
              @contextmenu="onMangaImageContextMenu($event, image.filepath)"
            />
            <div class="viewer-thunmnail-page">{{chunkIndex * thumbnailColumn + index + 1}} of {{viewerImageList.length}}</div>
          </div>
        </el-space>
      </div>
    </el-drawer>
    <el-drawer
      v-model="sideVisibleFolderTree"
      direction="ltr"
      size="20%"
      modal-class="side-tree-modal"
    >
      <el-tree
        :data="folderTreeData"
        default-expand-all
        :expand-on-click-node="false"
        @current-change="selectFolderTreeNode"
      ></el-tree>
    </el-drawer>
    <el-dialog
      v-model="dialogVisibleGraph"
      width="80%"
      top="5vh"
      destroy-on-close
      @close="destroyCanvas"
    >
      <template #header><p>{{$t('m.tagAnalysis')}}</p></template>
      <div id="tag-graph"></div>
      <template #footer>
        <el-button type="primary" @click="geneRecommend(false, 'local')">{{$t('m.searchLocal')}}</el-button>
        <el-button type="primary" @click="geneRecommend">{{$t('m.getEXRecommand')}}</el-button>
        <el-button type="primary" @click="geneRecommend(true)">{{$t('m.getEXRecommand')}}(ZH)</el-button>
      </template>
    </el-dialog>
    <el-drawer
      v-model="drawerVisibleCollection"
      direction="btt"
      :size="840"
      destroy-on-close
    >
      <template #header><p class="open-collection-title">{{openCollectionTitle}}</p></template>
      <div class="book-card" v-for="book in openCollectionBookList" :key="book.id">
        <p
          class="book-title"
          @click="openBookDetail(book)"
          @contextmenu="onMangaTitleContextMenu($event, book)"
          :title="book.title_jpn || book.title"
        >{{book.title_jpn || book.title}}</p>
        <img
          class="book-cover"
          :src="book.coverPath"
          @click="handleClickCover(book)"
          @contextmenu="onBookContextMenu($event, book)"
        />
        <el-tag class="book-card-language" size="small" type="danger" v-show="isChineseTranslatedManga(book)">ZH</el-tag>
        <el-icon
          :size="30"
          :color="book.mark ? '#E6A23C' : '#666666'"
          class="book-card-star"
          @click="switchMark(book)"
        ><BookmarkTwotone /></el-icon>
        <el-button-group class="outer-read-button-group">
          <el-button type="success" size="small" class="outer-read-button" plain @click="openLocalBook(book)">{{$t('m.re')}}</el-button>
          <el-button type="success" size="small" class="outer-read-button" plain @click="viewManga(book)">{{$t('m.ad')}}</el-button>
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
        <el-col :span="6">
          <el-row class="book-detail-function book-detail-cover-frame">
            <img
              class="book-detail-cover"
              :src="bookDetail.coverPath" @click="viewManga(bookDetail)"
              @contextmenu="onMangaImageContextMenu($event, bookDetail.coverPath)"
            />
            <el-icon
              :size="30"
              :color="bookDetail.mark ? '#E6A23C' : '#666666'"
              class="book-detail-star" @click="switchMark(bookDetail)"
            ><BookmarkTwotone /></el-icon>
          </el-row>
          <el-row class="book-detail-function">
            <el-descriptions :column="1">
              <el-descriptions-item :label="$t('m.pageCount')+':'">
                {{bookDetail.pageCount}} | {{bookDetail.filecount}}
              </el-descriptions-item>
              <el-descriptions-item :label="$t('m.fileSize')+':'">
                {{Math.floor(bookDetail.bundleSize / 1048576)}} | {{Math.floor(bookDetail.filesize / 1048576)}} MB
              </el-descriptions-item>
              <el-descriptions-item :label="$t('m.postTime')+':'">{{new Date(bookDetail.posted * 1000).toLocaleString("zh-CN")}}</el-descriptions-item>
            </el-descriptions>
          </el-row>
          <el-row class="book-detail-function">
            <el-button type="success" plain @click="openLocalBook(bookDetail)">{{$t('m.read')}}</el-button>
            <el-button plain @click="triggerShowComment">{{showComment ? $t('m.hideComment') : $t('m.showComment')}}</el-button>
            <el-button type="primary" plain @click="editTags">{{editingTag ? $t('m.showTag') : $t('m.editTag')}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button plain @click="getBookInfo(bookDetail, 'e-hentai')">{{$t('m.getMetadata')}}</el-button>
            <el-button type="primary" plain @click="getBookInfo(bookDetail, 'exhentai')">{{$t('m.getExMetadata')}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button plain @click="deleteLocalBook(bookDetail)">{{$t('m.deleteManga')}}</el-button>
            <el-button type="primary" plain @click="getBookInfo(bookDetail, 'exsearch')">{{$t('m.getMetadataByFilename')}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button plain @click="showFile(bookDetail.filepath)">{{$t('m.openMangaFileLocation')}}</el-button>
            <el-button type="primary" plain @click="triggerHiddenBook(bookDetail)">{{bookDetail.hiddenBook ? $t('m.showManga') : $t('m.hideManga')}}</el-button>
          </el-row>
        </el-col>
        <el-col :span="showComment?10:18">
          <el-scrollbar class="book-tag-frame">
            <div v-if="editingTag">
              <div class="edit-line">
                <el-input v-model="bookDetail.title_jpn" :placeholder="$t('m.title')"></el-input>
              </div>
              <div class="edit-line">
                <el-input v-model="bookDetail.title" :placeholder="$t('m.englishTitle')"></el-input>
              </div>
              <div class="edit-line">
                <el-select v-model="bookDetail.status" :placeholder="$t('m.metadataStatus')">
                  <el-option value="non-tag">non-tag</el-option>
                  <el-option value="tagged">tagged</el-option>
                  <el-option value="tag-failed">tag-failed</el-option>
                </el-select>
              </div>
              <div class="edit-line">
                <el-input v-model="bookDetail.url" :placeholder="$t('m.ehexAddress')"></el-input>
              </div>
              <div class="edit-line">
                <el-select v-model="bookDetail.category" :placeholder="$t('m.category')">
                  <el-option v-for="cat in categoryOption" :value="cat" :key="cat">{{cat}}</el-option>
                </el-select>
              </div>
              <div class="edit-line" v-for="(arr, key) in tagGroup" :key="key">
                <el-select v-model="bookDetail.tags[key]" :placeholder="key" filterable allow-create multiple>
                  <el-option v-for="tag in arr" :key="tag" :value="tag">{{tag}}</el-option>
                </el-select>
              </div>
              <el-button class="add-tag-cats-button" @click="addTagCat">{{$t('m.addCategory')}}</el-button>
              <el-button class="copy-tag-clipboard" @click="copyTagClipboard(bookDetail)">{{$t('m.copyTagClipboard')}}</el-button>
              <el-button class="paste-tag-clipboard" @click="pasteTagClipboard(bookDetail)">{{$t('m.pasteTagClipboard')}}</el-button>
            </div>
            <div v-else>
              <el-descriptions :column="1">
                <el-descriptions-item :label="$t('m.englishTitle')+':'">{{bookDetail.title}}</el-descriptions-item>
                <el-descriptions-item :label="$t('m.filename')+':'">{{returnFileName(bookDetail.filepath)}}</el-descriptions-item>
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
      width="42em"
      :modal="false"
    >
      <template #header><p class="setting-title">{{$t('m.setting')}}</p></template>
      <el-tabs v-model="activeSettingPanel" class="setting-tabs">
        <el-tab-pane :label="$t('m.general')" name="general">
          <el-row :gutter="8">
            <el-col :span="24">
              <div class="setting-line">
                <el-input v-model="setting.library">
                  <template #prepend><span class="setting-label">{{$t('m.library')}}</span></template>
                  <template #append><el-button @click="selectLibraryPath">{{$t('m.select')}}</el-button></template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="setting-line">
                <el-input v-model="setting.imageExplorer">
                  <template #prepend><span class="setting-label">{{$t('m.imageViewer')}}</span></template>
                  <template #append><el-button @click="selectImageExplorerPath">{{$t('m.select')}}</el-button></template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="setting-line">
                <el-input class="label-input">
                  <template #prepend><span class="setting-label">{{$t('m.theme')}}</span></template>
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
                <el-input v-model="setting.proxy" @change="saveSetting" :placeholder="$t('m.like') + ' http://127.0.0.1:7890'">
                  <template #prepend><span class="setting-label">{{$t('m.proxy')}}</span></template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="5">
              <div class="setting-line">
                <el-button class="function-button" type="success" plain @click="loadBookList(true)">{{$t('m.manualScan')}}</el-button>
              </div>
            </el-col>
            <el-col :span="7">
              <div class="setting-line">
                <el-button class="function-button" type="primary" plain @click="getBookListMetadata('e-hentai')">{{$t('m.batchGetMetadata')}}</el-button>
              </div>
            </el-col>
            <el-col :span="7">
              <div class="setting-line">
                <el-button class="function-button" type="primary" plain @click="getBookListMetadata('exhentai')">{{$t('m.batchGetExMetadata')}}</el-button>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>
        <el-tab-pane :label="$t('m.advanced')" name="advanced">
          <el-row :gutter="8">
            <el-col :span="24">
              <div class="setting-line">
                <el-input class="label-input">
                  <template #prepend><span class="setting-label">{{$t('m.language')}}</span></template>
                  <template #append>
                    <el-select placeholder=" " v-model="setting.language" @change="handleLanguageChange">
                      <el-option :label="$t('m.systemDefault')" value="default"></el-option>
                      <el-option label="zh-CN" value="zh-CN"></el-option>
                      <el-option label="en-US" value="en-US"></el-option>
                    </el-select>
                  </template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="setting-line">
                <el-input class="label-input">
                  <template #prepend><span class="setting-label">{{$t('m.directEnter')}}</span></template>
                  <template #append>
                    <el-select placeholder=" " v-model="setting.directEnter" @change="saveSetting">
                      <el-option :label="$t('m.detailPage')" value="detail"></el-option>
                      <el-option :label="$t('m.internalViewer')" value="internalViewer"></el-option>
                      <el-option :label="$t('m.externalViewer')" value="externalViewer"></el-option>
                    </el-select>
                  </template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="setting-line">
                <el-input v-model.number="setting.requireGap" :placeholder="$t('m.requireGapInfo')" @change="saveSetting">
                  <template #prepend><span class="setting-label">{{$t('m.requestGap')}}</span></template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="setting-line">
                <el-input v-model.number="setting.thumbnailColumn" @change="saveSetting">
                  <template #prepend><span class="setting-label">{{$t('m.thumbnailColumn')}}</span></template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="setting-line">
                <el-input v-model.number="setting.widthLimit" :placeholder="$t('m.widthLimitInfo')" @change="saveSetting">
                  <template #prepend><span class="setting-label">{{$t('m.widthLimit')}}</span></template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="setting-line">
                <el-popover
                  placement="top-start"
                  effect="dark"
                  trigger="hover"
                  :content="$t('m.rebuildWarning')"
                >
                  <template #reference>
                    <el-button class="function-button" plain @click="forceGeneBookList" @contextmenu="onForceLoadBookButtonContextMenu($event)">{{$t('m.rebuildLibrary')}}</el-button>
                  </template>
                </el-popover>
              </div>
            </el-col>
            <el-col :span="5">
              <div class="setting-line">
                <el-button class="function-button" type="primary" plain @click="patchLocalMetadata">{{$t('c.patchLocalMetadata')}}</el-button>
              </div>
            </el-col>
            <el-col :span="5">
              <div class="setting-line">
                <el-button class="function-button" type="primary" plain @click="exportDatabase">{{$t('m.exportMetadata')}}</el-button>
              </div>
            </el-col>
            <el-col :span="5">
              <div class="setting-line">
                <el-button class="function-button" type="primary" plain @click="importDatabase">{{$t('m.importMetadata')}}</el-button>
              </div>
            </el-col>
            <el-col :span="5">
              <div class="setting-line">
                <el-button class="function-button" type="primary" plain @click="importDatabasefromSqlite">{{$t('m.importMetadatafromSqlite')}}</el-button>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="8">
            <el-col :span="6" class="setting-switch">
              <el-switch
                v-model="setting.loadOnStart"
                :active-text="$t('m.onStartScan')"
                @change="saveSetting"
              />
            </el-col>
            <el-col :span="6" class="setting-switch">
              <el-switch
                v-model="setting.showComment"
                :active-text="$t('m.comment')"
                @change="saveSetting"
              />
            </el-col>
            <el-col :span="6" class="setting-switch">
              <el-switch
                v-model="setting.showTranslation"
                :active-text="$t('m.tagTranslate')"
                @change="handleTranslationSettingChange"
              />
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </el-config-provider>
</template>

<script>
import { defineComponent } from 'vue'
import axios from 'axios'
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus'
import { Close, Setting } from '@element-plus/icons-vue'
import { Collections20Filled, Search32Filled } from '@vicons/fluent'
import { MdShuffle, MdBulb, MdSave, IosRemoveCircleOutline } from '@vicons/ionicons4'
import { BookmarkTwotone } from '@vicons/material'
import { TreeViewAlt, CicsSystemGroup } from '@vicons/carbon'
import he from 'he'
import {nanoid} from 'nanoid'
import draggable from 'vuedraggable'
import * as linkify from 'linkifyjs'
import G6 from '@antv/g6'

import zhCn from 'element-plus/lib/locale/lang/zh-cn'
import en from 'element-plus/lib/locale/lang/en'

export default defineComponent({
  components: {
    draggable,
    BookmarkTwotone,
    IosRemoveCircleOutline
  },
  setup () {
    return {
      Close, Setting, Collections20Filled, Search32Filled, MdShuffle, MdBulb, MdSave, TreeViewAlt, CicsSystemGroup,
    }
  },
  data () {
    return {
      dialogVisibleBookDetail: false,
      dialogVisibleSetting: false,
      dialogVisibleGraph: false,
      sideVisibleFolderTree: false,
      editCollectionView: false,
      drawerVisibleViewer: false,
      drawerVisibleCollection: false,
      // home
      bookList: [],
      displayBookList: [],
      chunkDisplayBookList: [],
      resolvedTranslation: {},
      locale: zhCn,
      searchString: undefined,
      searchHistory: [],
      sortValue: undefined,
      currentPage: 1,
      folderTreeData: [],
      storeBookList: [],
      tagNodeData: [],
      displayNodeData: [],
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
      // viewer
      viewerImageList: [],
      viewerImageWidth: 1280,
      imageStyleType: 'scroll',
      storeDrawerScrollTop: undefined,
      // setting
      setting: {},
      activeSettingPanel: 'general',
      serviceAvailable: true,
      showComment: true,
      showThumbnail: false,
      thumbnailColumn: 10,
    }
  },
  computed: {
    displayBookCount () {
      return _.sumBy(this.displayBookList, book=>(book.hidden || book.folderHide) ? 0 : 1)
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
    categoryOption () {
      return _(this.bookList.map(b=>b.collection ? undefined : b.category)).compact().uniq().value()
    },
    tagList () {
      return _(this.bookList.map(b=>_.values(b.tags))).flattenDeep().uniq().map(t=>`"${t}"`).value()
    },
    thumbnailList () {
      if (this.setting.thumbnailColumn) {
        this.thumbnailColumn = this.setting.thumbnailColumn
      }
      return _.chunk(this.viewerImageList, this.thumbnailColumn)
    },
  },
  mounted () {
    ipcRenderer['send-message']((event, arg)=>{
      this.printMessage('info', arg)
      if (arg.includes('failed')) {
        console.error(arg)
      } else {
        console.log(arg)
      }
    })
    ipcRenderer['manga-content']((event, arg)=>{
      this.viewerImageList.push(arg)
    })
    ipcRenderer['load-setting']()
    .then(res=>{
      this.setting = res
      this.loadBookList(this.setting.loadOnStart)
      if (this.setting.showTranslation) this.loadTranslationFromEhTagTranslation()
      if (this.setting.theme) this.changeTheme(this.setting.theme)
      this.handleLanguageChange(this.setting.language)
    })
    this.viewerImageWidth = localStorage.getItem('viewerImageWidth') || 1280
    this.imageStyleType = localStorage.getItem('imageStyleType') || 'scroll'
    this.searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]')
    window.addEventListener('keydown', this.resolveKey)
  },
  beforeUnmount () {
    window.removeEventListener('keydown', this.resolveKey)
  },
  methods: {
    // base function
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
        if (!element.hidden && !element.folderHide) count++
        if (count >= size) {
          countIndex++
          count = 0
        }
        if (countIndex > index) return false
      })
      return result
    },
    returnFileName (filepath) {
      let matched = /[^\\]+$/.exec(filepath)
      if (matched) {
        return matched[0]
      }
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
      ElMessage[type]({
        message: msg,
        offset: 50
      })
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
    saveBookList () {
      let bookList = _.cloneDeep(this.bookList)
      bookList = _.filter(bookList, book=>!book.collection)
      _.forIn(bookList, book=>{
        delete book.collected
        delete book.hidden
        delete book.folderHide
      })
      return ipcRenderer['save-book-list'](bookList)
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
          let category = collectBook.map(book=>book.category).join(',')
          let status = collectBook.map(book=>book.status).join(',')
          this.bookList.push({
            title: collection.title,
            id: collection.id,
            coverPath: collectBook[0].coverPath,
            date, posted, rating, mark, tags, title_jpn, category, status,
            list: collection.list,
            filepath: collectBook[0].filepath,
            collection: true
          })
        })
        this.displayBookList = this.bookList.sort(this.sortList('date'))
        this.chunkList()
      })
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

    // metadata
    getBookInfo (book, server = 'e-hentai') {
      let getTag = (book, url) => {
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
      let resolveWebPage = (book, htmlString)=>{
        try {
          let bookUrl = new DOMParser().parseFromString(htmlString, 'text/html').querySelector('.gl3c.glname>a').getAttribute('href')
          getTag(book, bookUrl)
        } catch (e) {
          console.log(e)
          if (htmlString.includes('Your IP address has been')) {
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
      }
      if (book.url) {
        getTag(book, book.url)
      } else {
        if (server === 'e-hentai') {
          axios.get(`https://e-hentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`)
          .then(res=>{
            resolveWebPage(book, res.data)
          })
        } else if (server === 'exhentai') {
          ipcRenderer['get-ex-webpage']({
            url: `https://exhentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`,
            cookie: `igneous=${this.setting.igneous};ipb_pass_hash=${this.setting.ipb_pass_hash};ipb_member_id=${this.setting.ipb_member_id}`
          })
          .then(res=>{
            resolveWebPage(book, res)
          })
        } else if (server === 'exsearch') {
          let matchTitle = /\[[^[]+?]([^[]+)/.exec(book.title)
          if (matchTitle) {
            matchTitle = matchTitle[1]
          } else {
            matchTitle = book.title
          }
          ipcRenderer['get-ex-webpage']({
            url: `https://exhentai.org/?f_search=${encodeURI(matchTitle)}&f_cats=689`,
            cookie: `igneous=${this.setting.igneous};ipb_pass_hash=${this.setting.ipb_pass_hash};ipb_member_id=${this.setting.ipb_member_id}`
          })
          .then(res=>{
            resolveWebPage(book, res)
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
          ipcRenderer['set-progress-bar'](i/this.bookList.length)
          if (this.bookList[i].status === 'non-tag' && this.serviceAvailable) {
            this.getBookInfo(this.bookList[i], server)
            this.printMessage('info', `Get Metadata ${i+1} of ${this.bookList.length}`)
            await timer(gap)
          }
        }
        ipcRenderer['set-progress-bar'](-1)
      }
      load(this.setting.requireGap || 10000)
    },

    // home header
    shuffleBook () {
      this.displayBookList = _.shuffle(this.displayBookList)
      this.chunkList()
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
    // home search
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
      let result = queryString ? _.filter(_.compact(this.searchHistory.concat(this.tagList)), str=>_.includes(str.toLowerCase(), queryString.toLowerCase()))
        : this.searchHistory
      callback(result.map(s=>({value:s})))
    },
    // home main
    openBookDetail (book) {
      this.bookDetail = book
      this.dialogVisibleBookDetail = true
      this.showComment = !!this.setting.showComment
      this.getComments(book.url)
    },
    handleClickCover (book) {
      switch (this.setting.directEnter) {
        case 'internalViewer':
          this.viewManga(book)
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
      this.saveBookList()
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
    handleCurrentChange (currentPage) {
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
        let bookList = _.isEmpty(this.storeBookList) ? _.cloneDeep(this.bookList) : _.cloneDeep(this.storeBookList)
        ipcRenderer['get-folder-tree'](bookList)
        .then(data=>{
          this.folderTreeData = data
        })
      }
    },
    selectFolderTreeNode (selectNode) {
      if (selectNode.folderPath === '.') {
        this.bookList.map(book=>book.folderHide = false)
      } else {
        let clickLibraryPath = this.setting.library + '\\' + selectNode.folderPath
        this.bookList.map(book=>book.folderHide = !book.filepath.startsWith(clickLibraryPath))
      }
      this.displayBookList = this.bookList
      this.chunkList()
    },

    // tag analysis and recommand search
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
            size: Math.ceil(Math.log(count)*10+50),
            oriSize: Math.ceil(Math.log(count)*10+50),
            name: `${labelArray[0]}:"${labelArray[1]}$"`,
            shortName: labelArray[1],
            label: `${this.resolvedTranslation[labelArray[0]]?.name || labelArray[0]}:${this.resolvedTranslation[labelArray[1]]?.name || labelArray[1]}`,
            style:{fill: _.sample(colors)}
          })
        } catch {}
      })
      this.tagNodeData = _.takeRight(_.sortBy(tempNodeData, 'count'), 72)
      this.tagNodeData = _.shuffle(this.tagNodeData)
      this.displayNodeData = this.tagNodeData
      this.dialogVisibleGraph = true
      this.$nextTick(()=>{
        let graph = new G6.Graph({
          container: 'tag-graph',
          layout: {
            type: 'force',
            nodeStrength: 40,
            collideStrength: 0.8,
            alphaDecay: 0.01,
            nodeSpacing: 2,
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
          states.forEach((state)=>{
            if (state === 'click') {
              clicked = true
              size = model.oriSize
              _.find(this.displayNodeData, {id: model.id}).size = model.oriSize
            }
          })
          graph.setItemState(node, 'click', !clicked)
          graph.updateItem(node, {
            size
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
    },

    // collection view function
    createCollection () {
      this.editCollectionView = true
      if (this.selectCollection) this.handleSelectCollectionChange(this.selectCollection)
    },
    addCollection () {
      ElMessageBox.prompt(this.$t('c.inputCollectionName'), this.$t('m.addCollection'), {
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
        this.printMessage('info', this.$t('c.canceled'))
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

    // detail view function
    openUrl (url) {
      ipcRenderer['open-url'](url)
    },
    triggerHiddenBook (book) {
      book.hiddenBook = !book.hiddenBook
      this.saveBookList()
    },
    showFile(filepath) {
      ipcRenderer['show-file'](filepath)
    },
    openLocalBook (book) {
      this.bookDetail = book
      ipcRenderer['open-local-book'](this.bookDetail.filepath)
    },
    deleteLocalBook (book) {
      ipcRenderer['delete-local-book'](book.filepath)
      .then(()=>{
        this.bookList = _.filter(this.bookList, b=>b.filepath !== book.filepath)
        this.displayBookList = _.filter(this.displayBookList, b=>b.filepath !== book.filepath)
        if (book.hidden) {
          _.forIn(this.collectionList, collection=>{
            collection.list = _.filter(collection.list, id=>id !== book.id)
          })
          this.openCollectionBookList = _.filter(this.openCollectionBookList, b=>b.id !== book.id)
        }
        this.saveBookList()
        .then(()=>{
          this.chunkDisplayBookList = this.customChunk(this.displayBookList, this.setting.pageSize, this.currentPage - 1)
          if (book.hidden) this.saveCollection()
          this.dialogVisibleBookDetail = false
        })
      })
    },
    viewManga (book) {
      this.bookDetail = book
      this.viewerImageList = []
      const loading = ElLoading.service({
        lock: true,
        text: 'Loading',
        background: _.includes(this.setting.theme, 'light') ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
      })
      ipcRenderer['load-manga-image-list'](_.cloneDeep(this.bookDetail))
      .then(list=>{
        // this.viewerImageList = list
        this.drawerVisibleViewer = true
      })
      .catch(err=>{
        console.log(err)
      })
      .finally(()=>{
        loading.close()
      })
    },
    triggerShowComment () {
      if (this.showComment) {
        this.showComment = false
      } else {
        this.getComments(this.bookDetail.url)
        this.showComment = true
      }
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

    // copy and paste tag
    copyTagClipboard (book) {
      electronFunction['copy-text-to-clipboard'](JSON.stringify(_.pick(book, ['tags', 'status', 'category'])))
    },
    pasteTagClipboard (book) {
      let text = electronFunction['read-text-from-clipboard']()
      _.assign(book, JSON.parse(text))
    },

    // internal viewer
    returnImageStyle(image) {
      if (this.imageStyleType === 'scroll') {
        return {width: this.viewerImageWidth + 'px', height: (image.height * (this.viewerImageWidth / image.width)) + 'px' }
      } else {
        // 28 is the height of .viewer-image-page
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
          // 28.3 is the height of .viewer-image-page
          scrollTopValue += parseFloat(this.returnImageStyle(image).height) + 28.3
        })
      } else {
        scrollTopValue = window.innerHeight * (chunkIndex * this.thumbnailColumn + index)
      }
      this.$nextTick(()=>document.getElementsByClassName('el-drawer__body')[0].scrollTop = scrollTopValue)
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
    releaseSendImageLock () {
      ipcRenderer['release-sendimagelock']()
    },
    toNextManga (random) {
      this.releaseSendImageLock()
      let activeBookList = this.drawerVisibleCollection ? this.openCollectionBookList : _.filter(this.displayBookList, book=>(!book.hidden && !book.folderHide))
      if (random) {
        this.viewManga(_.sample(activeBookList))
      } else {
        let indexNow = _.findIndex(activeBookList, {id: this.bookDetail.id})
        if (indexNow === activeBookList.length - 1) {
          this.printMessage('warning', this.$t('c.lastManga'))
        } else {
          this.viewManga(activeBookList[indexNow + 1])
        }
      }
    },

    // setting
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
        this.printMessage('success', this.$t('c.rebuildMessage'))
      })
    },
    patchLocalMetadata () {
      ipcRenderer['patch-local-metadata']()
      .then(()=>this.loadBookList())
    },
    handleLanguageChange (val) {
      ipcRenderer['get-locale']().then(localeString=>{
        let languageCode
        if (!val || (val === 'default')) {
          languageCode = localeString
        } else {
          languageCode = val
        }
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
        this.saveSetting()
      })
    },

    // import/export
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
          }
          if (index == this.bookList.length - 1) {
            this.dialogVisibleSetting = false
            this.printMessage('success', this.$t('c.importMessage'))
          }
        })
        this.saveBookList()
      })
    },
    importDatabasefromSqlite () {
      ipcRenderer['import-sqlite'](_.cloneDeep(this.bookList))
      .then(bookList=>{
        this.bookList = bookList
        this.saveBookList()
        .then(()=>{
          this.printMessage('success', this.$t('c.importMessage'))
          this.displayBookList = this.bookList
          this.chunkList()
        })
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
              this.getBookInfo(book, 'e-hentai')
            }
          },
          {
            label: this.$t('m.getExMetadata'),
            onClick: () => {
              this.getBookInfo(book, 'exhentai')
            }
          },
          {
            label: this.$t('m.getMetadataByFilename'),
            onClick: () => {
              this.getBookInfo(book, 'exsearch')
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
            label: this.$t('c.copyImageToClipboard'),
            onClick: () => {
              electronFunction['copy-image-to-clipboard'](book.coverPath)
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
    onMangaImageContextMenu (e, filepath) {
      e.preventDefault()
      this.$contextmenu({
        x: e.x,
        y: e.y,
        items: [
          {
            label: this.$t('c.copyImageToClipboard'),
            onClick: () => {
              electronFunction['copy-image-to-clipboard'](filepath)
            }
          },
          {
            label: this.$t('c.designateAsCover'),
            onClick: () => {
              ipcRenderer['use-new-cover'](filepath)
              .then((coverPath)=>{
                this.bookDetail.coverPath = coverPath
                this.saveBookList()
              })
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
              electronFunction['copy-text-to-clipboard'](book.title_jpn || book.title)
            }
          },
          {
            label: this.$t('c.copyLinkToClipboard'),
            onClick: () => {
              electronFunction['copy-text-to-clipboard'](book.url)
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
            ipcRenderer['open-url'](l.href)
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
  width: 98vw
#app
  font-family: Avenir, Helvetica, Arial, sans-serif
  text-align: center
  margin-top: 20px

.search-input,
.function-button
  width: 100%

.side-tree-modal
  background-color: var(--el-mask-color-extra-light)

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
  height: 367px
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
  cursor: pointer
.book-card-star, .book-detail-star, .book-card-language
  position: absolute
.book-card-language
  left: 19px
  top: 52px
.book-card-star
  right: 12px
  top: 40px
.book-detail-star
  right: -8px
  top: -14px
.book-cover
  border-radius: 8px
  width: 200px
  height: 283px
  margin: 0 20px
  object-fit: cover
.outer-read-button-group
  margin: 0 8px
.outer-read-button:first-child
  padding: 0 0 0 4px
.outer-read-button + .outer-read-button
  padding: 0 4px 0 0
.book-status-tag
  padding: 0 2px
  margin-right: 8px
  cursor: pointer
.el-rate
  display: inline-block
  height: 18px

.open-collection-title
  margin: 0 10px

#tag-graph
  width: 100%
  height: calc(95vh - 220px)

.book-collect-card
  width: 155px
  height: 229px
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
      height: 354px
      object-fit: cover
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

.setting-title
  margin:0
.setting-line
  margin: 6px 0
  .el-input-group__prepend
    width: 110px
.setting-switch
  text-align: left
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
.drawer-image-content
  height: 100vh
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
.next-manga-button
  margin: 30px 0 60px
.viewer-thumbnail-switch
  position: absolute
  top: 3em
  left: 1em
  z-index: 10
.drawer-thumbnail-content
  height: 100vh
  text-align: left
.viewer-thumbnail
  margin: 8px 0 0
.viewer-thunmnail-page
  text-align: center
  font-size: 11px


.mx-menu-ghost-host
  z-index: 3000!important
.mx-context-menu
  background-color: var(--el-fill-color-extra-light)!important
  .mx-context-menu-item:hover
    background-color: var(--el-fill-color-dark)
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
