<template>
  <el-config-provider :locale="locale">
    <el-row :gutter="20" class="book-search-bar">
      <el-col :span="1" :offset="2">
        <el-button type="primary" :icon="TreeViewAlt" plain class="function-button" @click="geneFolderTree" :title="$t('m.folderTree')"></el-button>
      </el-col>
      <el-col :span="9">
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
          <el-option :label="$t('m.shuffle')" value="shuffle"></el-option>
          <el-option :label="$t('m.addTimeAscend')" value="addAscend"></el-option>
          <el-option :label="$t('m.addTimeDescend')" value="addDescend"></el-option>
          <el-option :label="$t('m.mtimeAscend')" value="mtimeAscend"></el-option>
          <el-option :label="$t('m.mtimeDescend')" value="mtimeDescend"></el-option>
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
            <el-button type="primary" plain class="function-button" @click="renameCollection" :icon="Rename16Regular" :title="$t('m.renameCollection')"></el-button>
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
            <el-rate v-model="book.rating"  v-if="!book.collection" allow-half @change="saveBook(book)"/>
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
        @current-change="handleCurrentChange"
        background
      />
    </el-row>
    <el-drawer v-model="drawerVisibleViewer"
      direction="ttb"
      size="100%"
      :with-header="false"
      destroy-on-close
      @closed="releaseSendImageLock"
      custom-class="viewer-drawer"
    >
      <el-button :link="true" text :icon="Close" size="large" class="viewer-close-button" @click="drawerVisibleViewer = false"></el-button>
      <div class="viewer-mode-setting">
        <el-select
          v-model="showThumbnail"
          size="small"
          @change="switchThumbnail"
          class="viewer-thumbnail-select"
        >
          <el-option :value="true" :label="$t('m.thumbnail')" />
          <el-option :value="false" :label="$t('m.content')" />
        </el-select>
        <el-select
          v-model="imageStyleType"
          size="small"
          @change="saveImageStyleType"
          class="viewer-mode"
          ref="viewer-mode"
          v-show="showThumbnail === false"
        >
          <el-option value="scroll" :label="$t('m.scrolling')" />
          <el-option value="single" :label="$t('m.singlePage')" />
          <el-option value="double" :label="$t('m.doublePage')" />
        </el-select>
        <el-select
          v-model="imageStyleFit"
          size="small"
          @change="saveImageStyleType"
          class="viewer-image-fit"
          ref="viewer-image-fit"
          v-show="imageStyleType !== 'scroll' && showThumbnail === false"
        >
          <el-option value="width" :label="$t('m.fitWidth')" />
          <el-option value="height" :label="$t('m.fitHeight')" />
          <el-option value="window" :label="$t('m.fitWindow')" />
        </el-select>
      </div>
      <div
        class="drawer-image-content"
        @click="scrollPage"
        v-if="!showThumbnail"
        v-loading="viewerImageList.length === 0"
        element-loading-text="Loading"
        element-loading-background="transparent"
      >
        <div v-if="imageStyleType === 'scroll'">
          <div
            v-for="(image, index) in viewerImageList"
            :key="image.id"
            class="image-frame"
          >
            <div class="viewer-image-frame viewer-image-frame-scroll" :style="returnImageStyle(image)">
              <img
                :src="`${image.filepath}?id=${image.id}`"
                class="viewer-image"
                :style="{height: returnImageStyle(image).height}"
                @contextmenu="onMangaImageContextMenu($event, image.filepath)"
              />
              <div class="viewer-image-bar" @mousedown="initResize(image.id)"></div>
            </div>
            <div class="viewer-image-page" v-if="!setting.hidePageNumber">{{index + 1}} of {{viewerImageList.length}}</div>
          </div>
        </div>
        <div v-else-if="imageStyleType === 'single'">
          <div class="image-frame">
            <div class="viewer-image-frame"  :style="returnImageStyle(viewerImageList[currentImageIndex])">
              <img
                :src="`${viewerImageList[currentImageIndex]?.filepath}?id=${viewerImageList[currentImageIndex]?.id}`"
                class="viewer-image"
                :style="{height: returnImageStyle(viewerImageList[currentImageIndex])?.height}"
                @contextmenu="onMangaImageContextMenu($event, viewerImageList[currentImageIndex]?.filepath)"
              />
            </div>
            <div class="viewer-image-page" v-if="!setting.hidePageNumber">{{currentImageIndex + 1}} of {{viewerImageList.length}}</div>
            <img
              :src="`${viewerImageList[currentImageIndex - 1]?.filepath}?id=${viewerImageList[currentImageIndex + 1]?.id}`"
              class="viewer-image-preload"
            />
            <img
              :src="`${viewerImageList[currentImageIndex + 1]?.filepath}?id=${viewerImageList[currentImageIndex + 1]?.id}`"
              class="viewer-image-preload"
            />
          </div>
        </div>
        <div v-else-if="imageStyleType === 'double'">
          <div class="image-frame">
            <div class="viewer-image-frame viewer-image-frame-double">
              <img
                v-for="image in viewerImageListDouble[currentImageIndex]?.page"
                :src="`${image.filepath}?id=${image.id}`"
                class="viewer-image"
                :style="{height: returnImageStyle(image).height}"
                @contextmenu="onMangaImageContextMenu($event, image.filepath)"
              />
            </div>
            <div v-for="image in viewerImageListDouble[currentImageIndex - 1]?.page">
              <img :src="`${image.filepath}?id=${image.id}`" class="viewer-image-preload" />
            </div>
            <div v-for="image in viewerImageListDouble[currentImageIndex + 1]?.page">
              <img :src="`${image.filepath}?id=${image.id}`" class="viewer-image-preload" />
            </div>
            <div class="viewer-image-page" v-if="!setting.hidePageNumber">{{viewerImageListDouble[currentImageIndex]?.pageNumber?.join(', ')}} of {{viewerImageList.length}}</div>
          </div>
        </div>
      </div>
      <div class="next-manga-button">
        <el-button size="large" type="success" @click="toNextMangaRandom">{{$t('m.nextMangaRandom')}}</el-button>
        <el-button size="large" type="success" @click="toNextManga">{{$t('m.nextManga')}}</el-button>
      </div>
      <div
        class="drawer-thumbnail-content"
        v-if="showThumbnail"
        v-loading="viewerImageList.length === 0"
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
              @click="handleClickThumbnail(image.id)"
              @contextmenu="onMangaImageContextMenu($event, image.filepath)"
            />
            <div class="viewer-thunmnail-page">{{chunkIndex * thumbnailColumn + index + 1}} of {{viewerImageList.length}}</div>
          </div>
        </el-space>
      </div>
    </el-drawer>
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
    <el-dialog v-model="dialogVisibleGraph"
      fullscreen
      destroy-on-close
      @close="destroyCanvas"
    >
      <template #header><p>{{$t('m.tagAnalysis')}}</p></template>
      <div id="tag-graph"></div>
      <template #footer>
        <el-button type="primary" @click="geneRecommend(false, 'local')">{{$t('m.searchLocal')}}</el-button>
        <el-button type="primary" @click="geneRecommend(false)">{{$t('m.getEXRecommand')}}</el-button>
        <el-button type="primary" @click="geneRecommend(true)">{{$t('m.getEXRecommand')}}(ZH)</el-button>
      </template>
    </el-dialog>
    <el-drawer v-model="drawerVisibleCollection"
      direction="btt"
      size="80vh"
      destroy-on-close
    >
      <template #header><p class="open-collection-title">{{openCollectionTitle}}</p></template>
      <div class="book-card" v-for="book in openCollectionBookList" :key="book.id">
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
        <el-rate v-model="book.rating"  v-if="!book.collection" allow-half @change="saveBook(book)"/>
      </div>
    </el-drawer>
    <el-dialog v-model="dialogVisibleBookDetail"
      fullscreen
      custom-class="dialog-detail"
    >
      <template #header>
        <p class="detail-book-title">
          <span class="url-link" @click="openUrl(bookDetail.url)" @contextmenu="onMangaTitleContextMenu($event, bookDetail)">{{getDisplayTitle(bookDetail)}}</span>
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
              <el-descriptions-item :label="$t('m.mtime')+':'">{{new Date(bookDetail.mtime).toLocaleString("zh-CN")}}</el-descriptions-item>
              <el-descriptions-item :label="$t('m.postTime')+':'">{{new Date(bookDetail.posted * 1000).toLocaleString("zh-CN")}}</el-descriptions-item>
            </el-descriptions>
          </el-row>
          <el-row class="book-detail-function">
            <el-button size="small" type="success" plain @click="openLocalBook(bookDetail)">{{$t('m.read')}}</el-button>
            <el-button size="small" plain @click="triggerShowComment">{{showComment ? $t('m.hideComment') : $t('m.showComment')}}</el-button>
            <el-button size="small" type="primary" plain @click="editTags">{{editingTag ? $t('m.showTag') : $t('m.editTag')}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button size="small" type="primary" plain @click="openSearchDialog(bookDetail, 'e-hentai')">{{$t('m.getMetadata')}}</el-button>
            <el-button size="small" type="primary" plain @click="openSearchDialog(bookDetail, 'exhentai')">{{$t('m.getExMetadata')}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button size="small" type="primary" plain @click="openSearchDialog(bookDetail, 'chaika')">{{$t('m.getChaikaMetadata')}}</el-button>
            <el-button size="small" type="primary" plain
              @click="openSearchDialog(bookDetail)"
            >{{$t('m.getMetadataByFilename')}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button size="small" plain @click="deleteLocalBook(bookDetail)">{{$t('m.deleteManga')}}</el-button>
            <el-button size="small" type="primary" plain @click="triggerHiddenBook(bookDetail)">{{bookDetail.hiddenBook ? $t('m.showManga') : $t('m.hideManga')}}</el-button>
          </el-row>
          <el-row class="book-detail-function">
            <el-button size="small" plain @click="showFile(bookDetail.filepath)">{{$t('m.openMangaFileLocation')}}</el-button>
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
                <el-select v-model="bookDetail.tags[key]" :placeholder="key"
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
    <el-dialog v-model="dialogVisibleEhSearch"
      width="40%"
      :title="$t('m.search')"
      destroy-on-close
      custom-class="dialog-search"
    >
      <el-input v-model="searchStringDialog" :disabled="disabledSearchString" @keyup.enter="getBookListFromEh(bookDetail, searchTypeDialog)">
        <template #prepend>
          <el-select class="search-type-select" v-model="searchTypeDialog">
            <el-option label="exhentai" value="exsearch" />
            <el-option label="e-hentai" value="e-search" />
            <el-option label="chaika" value="chaika" />
          </el-select>
        </template>
        <template #append>
          <el-button :icon="Search32Filled" @click="getBookListFromEh(bookDetail, searchTypeDialog)"/>
        </template>
      </el-input>
      <div v-loading="searchResultLoading">
        <div class="search-result" v-if="ehSearchResultList.length > 0">
          <p
            v-for="result in ehSearchResultList"
            :key="result.url"
            @click="resolveSearchResult(bookDetail, result.url, result.type)"
            class="search-result-ind"
          >{{result.title}}</p>
        </div>
        <el-empty v-else :description="$t('m.noResults')" :image-size="100" />
      </div>
    </el-dialog>
    <el-dialog v-model="dialogVisibleSetting"
      width="50em"
      :modal="false"
      append-to-body
      custom-class="setting-dialog"
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
                <el-input v-model="setting.imageExplorer" @change="saveSetting">
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
                <el-input v-model="setting.star" @change="saveSetting">
                  <template #prepend><span class="setting-label">star</span></template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="setting-line">
                <el-input v-model="setting.proxy" @change="saveSetting" :placeholder="$t('m.like') + ' http://127.0.0.1:7890'">
                  <template #prepend><span class="setting-label">{{$t('m.proxy')}}</span></template>
                  <template #append><el-button @click="testProxy">{{$t('m.test')}}</el-button></template>
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
        <el-tab-pane :label="$t('m.internalViewer')" name="internalViewer">
          <el-row :gutter="8">
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
            <el-col :span="6" class="setting-switch">
              <el-switch
                v-model="setting.hidePageNumber"
                :active-text="$t('m.hidePageNumber')"
                @change="saveSetting"
              />
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
                <el-input class="label-input">
                  <template #prepend><span class="setting-label">{{$t('m.displayTitle')}}</span></template>
                  <template #append>
                    <el-select :placeholder="$t('m.displayTitleInfo')" v-model="setting.displayTitle" @change="saveSetting">
                      <el-option :label="$t('m.englishTitle')" value="englishTitle"></el-option>
                      <el-option :label="$t('m.japaneseTitle')" value="japaneseTitle"></el-option>
                      <el-option :label="$t('m.filename')" value="filename"></el-option>
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
              <NameFormItem class="setting-line" prependWidth="110px">
                <template #prepend>{{$t('m.customOptions')}}</template>
                <template #default>
                  <el-input v-model="setting.customOptions" :placeholder="$t('m.customOptionsPlaceholder')" @change="saveSetting" :rows="2" type="textarea"></el-input>
                </template>
              </NameFormItem>
            </el-col>
            <el-col :span="24">
              <div class="setting-line">
                <el-input v-model="setting.excludeFile" :placeholder="$t('m.excludeFileInfo')" @change="saveSetting">
                  <template #prepend><span class="setting-label">{{$t('m.excludeFile')}}</span></template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="setting-line">
                <el-input v-model="setting.folderTreeWidth" :placeholder="$t('m.folderTreeWidthInfo')" @change="saveSetting">
                  <template #prepend><span class="setting-label">{{$t('m.folderTreeWidth')}}</span></template>
                </el-input>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="setting-line">
                <el-popconfirm
                  placement="top-start"
                  :title="$t('m.rebuildWarning')"
                  @confirm="forceGeneBookList"
                >
                  <template #reference>
                    <el-button class="function-button" plain>{{$t('m.rebuildLibrary')}}</el-button>
                  </template>
                </el-popconfirm>
              </div>
            </el-col>
            <el-col :span="5">
              <div class="setting-line">
                <el-popconfirm
                  placement="top-start"
                  :title="$t('m.patchWarning')"
                  @confirm="patchLocalMetadata"
                >
                  <template #reference>
                    <el-button class="function-button" type="primary" plain>{{$t('m.patchLocalMetadata')}}</el-button>
                  </template>
                </el-popconfirm>
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
                :active-text="$t('m.showComment')"
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
            <el-col :span="6" class="setting-switch">
              <el-switch
                v-model="setting.advancedSearch"
                :active-text="$t('m.advancedSearch')"
                @change="saveSetting"
              />
            </el-col>
            <el-col :span="6" class="setting-switch">
              <el-switch
                v-model="setting.autoCheckUpdates"
                :active-text="$t('m.autoCheckUpdates')"
                @change="saveSetting"
              />
            </el-col>
            <el-col :span="12" class="setting-switch">
              <el-switch
                v-model="setting.batchTagfailedBook"
                :active-text="$t('m.batchTagfailedBook')"
                @change="saveSetting"
              />
            </el-col>
            <el-col :span="6" class="setting-switch">
              <el-switch
                v-model="setting.skipDeleteConfirm"
                :active-text="$t('m.skipDeleteConfirm')"
                @change="saveSetting"
              />
            </el-col>
            <el-col :span="6" class="setting-switch">
              <el-switch
                v-model="setting.defaultExpandTree"
                :active-text="$t('m.defaultExpandTree')"
                @change="saveSetting"
              />
            </el-col>
          </el-row>
        </el-tab-pane>
        <el-tab-pane :label="$t('m.about')" name="about">
          <el-descriptions :column="1">
            <el-descriptions-item :label="$t('m.appName')+':'">exhentai-manga-manager</el-descriptions-item>
            <el-descriptions-item :label="$t('m.version')+':'">
              <a href="#" @click="openLink('https://github.com/SchneeHertz/exhentai-manga-manager/releases')">{{version}}</a>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('m.appPage')+':'">
              <a href="#" @click="openLink('https://github.com/SchneeHertz/exhentai-manga-manager')">github</a>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('m.help')+':'">
              <a href="#" @click="openLink('https://github.com/SchneeHertz/exhentai-manga-manager/wiki')">github wiki</a>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('m.donation')+':'">
              <a v-if="$i18n.locale === 'zh-CN'" href="#" @click="openLink('https://afdian.net/a/SeldonHorizon')">爱发电</a>
              <a v-else href="#" @click="openLink('https://www.buymeacoffee.com/schneehertz')">buy me a coffee</a>
            </el-descriptions-item>
          </el-descriptions>
          <img src="/icon.png" class="about-logo">
          <el-row>
            <el-col :span="4" :offset="10">
              <div class="setting-line">
                <el-button class="function-button" type="primary" plain @click="autoCheckUpdates(true)">{{$t('m.checkUpdates')}}</el-button>
              </div>
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
import { Collections20Filled, Search32Filled, Rename16Regular } from '@vicons/fluent'
import { MdShuffle, MdBulb, MdSave, IosRemoveCircleOutline, MdInformationCircleOutline } from '@vicons/ionicons4'
import { BookmarkTwotone } from '@vicons/material'
import { TreeViewAlt, CicsSystemGroup } from '@vicons/carbon'
import he from 'he'
import {nanoid} from 'nanoid'
import draggable from 'vuedraggable'
import * as linkify from 'linkifyjs'
import G6 from '@antv/g6'

import zhCn from 'element-plus/lib/locale/lang/zh-cn'
import en from 'element-plus/lib/locale/lang/en'

import { version } from '../package.json'

import NameFormItem from './components/NameFormItem.vue'

export default defineComponent({
  components: {
    draggable,
    BookmarkTwotone,
    IosRemoveCircleOutline,
    NameFormItem
  },
  setup () {
    return {
      Close, Setting, Collections20Filled, Search32Filled, MdShuffle, MdBulb, MdSave,
      TreeViewAlt, CicsSystemGroup, MdInformationCircleOutline, Rename16Regular
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
      dialogVisibleEhSearch: false,
      // home
      bookList: [],
      displayBookList: [],
      chunkDisplayBookList: [],
      resolvedTranslation: {},
      locale: zhCn,
      searchString: undefined,
      sortValue: undefined,
      currentPage: 1,
      folderTreeData: [],
      storeBookList: [],
      tagNodeData: [],
      version: version,
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
      searchResultLoading: false,
      searchStringDialog: undefined,
      searchTypeDialog: 'exsearch',
      disabledSearchString: false,
      ehSearchResultList: [],
      editTagOptions: [],
      // viewer
      viewerImageList: [],
      viewerImageWidth: 1280,
      imageStyleType: 'scroll',
      imageStyleFit: 'window',
      _currentImageIndex: 0,
      storeDrawerScrollTop: undefined,
      insertEmptyPage: false,
      insertEmptyPageIndex: 1,
      // setting
      setting: {},
      activeSettingPanel: 'general',
      serviceAvailable: true,
      showComment: true,
      showThumbnail: false,
      thumbnailColumn: 10,
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
        'Western',
        'Non-H',
        'Image Set',
        'Cosplay',
        'Asian Porn',
        'Misc',
      ]
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
    customOptions () {
      return _.compact(_.get(this.setting, 'customOptions', '').split('\n'))
        .map(str=>({label: str.trim(), value: str.trim().replace(/\s+(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)/g, '|||')}))
    },
    thumbnailList () {
      if (_.isInteger(this.setting.thumbnailColumn) && this.setting.thumbnailColumn > 0) {
        this.thumbnailColumn = this.setting.thumbnailColumn
      } else {
        this.thumbnailColumn = 10
      }
      return _.chunk(this.viewerImageList, this.thumbnailColumn)
    },
    viewerImageListDouble () {
      if (this.imageStyleType === 'double') {
        let result = []
        let frame = {page: [], pageNumber: []}
        let pageNumber = 0
        for (let image of this.viewerImageList) {
          pageNumber += 1
          // if (image.width > image.height) {
          //   if (frame.page.length > 0) {
          //     result.push(_.clone(frame))
          //     frame = {page: [], pageNumber: []}
          //   }
          //   result.push({page: [image], pageNumber: [pageNumber]})
          // } else {
            frame.page.push(image)
            frame.pageNumber.push(pageNumber)
            if ((this.insertEmptyPage && result.length === this.insertEmptyPageIndex) || frame.page.length >= 2) {
              result.push(_.clone(frame))
              frame = {page: [], pageNumber: []}
            }
          // }
        }
        if (frame.page.length > 0) result.push(_.clone(frame))
        return result
      } else {
        return []
      }
    },
    cookie () {
      return `igneous=${this.setting.igneous};ipb_pass_hash=${this.setting.ipb_pass_hash};ipb_member_id=${this.setting.ipb_member_id};star=${this.setting.star}`
    },
    currentImageIndex: {
      get () {
        return this._currentImageIndex
      },
      set (val) {
        let listLength
        if (this.imageStyleType === 'single') {
          listLength = this.viewerImageList.length
        } else {
          listLength = this.viewerImageListDouble.length
        }
        if (val < 0) {
          this._currentImageIndex = 0
        } else if (val > listLength - 1 && listLength >= 1) {
          this._currentImageIndex = listLength - 1
        } else {
          this._currentImageIndex = val
        }
      }
    }
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
      if (this.setting.autoCheckUpdates === undefined) {
        this.setting.autoCheckUpdates = true
        this.saveSetting()
      }
      if (this.setting.autoCheckUpdates) this.autoCheckUpdates(false)
      this.handleLanguageChange(this.setting.language)
    })
    this.viewerImageWidth = localStorage.getItem('viewerImageWidth') || 1280
    this.imageStyleType = localStorage.getItem('imageStyleType') || 'scroll'
    this.imageStyleFit = localStorage.getItem('imageStyleFit') || 'window'
    this.sortValue = localStorage.getItem('sortValue')
    window.addEventListener('keydown', this.resolveKey)
    ipcRenderer['send-action']((event, arg)=>{
      switch (arg.action) {
        case 'setting':
          this.dialogVisibleSetting = true
          this.activeSettingPanel = 'general'
          break
        case 'about':
          this.dialogVisibleSetting = true
          this.activeSettingPanel = 'about'
          break
        case 'focus-search':
          document.querySelector('.search-input .el-input__inner').select()
          break
        case 'shuffle-manga':
          this.shuffleBook()
          break
      }
    })
  },
  beforeUnmount () {
    window.removeEventListener('keydown', this.resolveKey)
  },
  methods: {
    // base function
    resolveKey (event) {
      if (this.drawerVisibleViewer) {
        if (this.imageStyleType === 'single' || this.imageStyleType === 'double') {
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            this.currentImageIndex += 1
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            this.currentImageIndex -= 1
          } else if (event.key === "/") {
            this.insertEmptyPageIndex = this.currentImageIndex
            this.insertEmptyPage = !this.insertEmptyPage
          } else if (event.key === 'Home') {
            this.currentImageIndex = 0
          } else if (event.key === 'End') {
            this.currentImageIndex = 100000
          }
        } else {
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
      }
    },
    customChunk (list, size, index) {
      let result = []
      let count = 0
      let countIndex = 0
      _.forIn(list, element=>{
        if (countIndex === index) result.push(element)
        if (!element.hidden && !element.folderHide) count++
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
        if (this.sortValue) {
          this.bookList = res
        } else {
          this.bookList = res.sort(this.sortList('date'))
        }
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
    saveBook (book) {
      return ipcRenderer['save-book'](_.cloneDeep(book))
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
          if (!_.isEmpty(collectBook)) {
            this.bookList.push({
              title: collection.title,
              id: collection.id,
              coverPath: collectBook[0].coverPath,
              date, posted, rating, mark, tags, title_jpn, category, status,
              list: collection.list,
              filepath: collectBook[0].filepath,
              collection: true
            })
          }
        })
        this.handleSortChange(this.sortValue)
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
    openLink (link) {
      ipcRenderer['open-url'](link)
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

    // metadata
    openSearchDialog (book, server) {
      this.dialogVisibleEhSearch = true
      this.searchTypeDialog = server
      this.ehSearchResultList = []
      this.searchStringDialog = this.returnFileName(book)
      this.bookDetail = book
      if (server) {
        this.getBookListFromEh(book, server)
      }
    },
    getBookListFromEh (book, server = 'e-hentai') {
      let resolveWebPage = (book, htmlString)=>{
        try {
          let resultNodes = new DOMParser().parseFromString(htmlString, 'text/html').querySelectorAll('.gl3c.glname')
          this.ehSearchResultList = []
          resultNodes.forEach((node)=>{
            this.ehSearchResultList.push({
              title: node.querySelector('.glink').innerHTML,
              url: node.querySelector('a').getAttribute('href')
            })
          })
        } catch (e) {
          console.log(e)
          if (htmlString.includes('Your IP address has been')) {
            this.printMessage('error', 'Your IP address has been temporarily banned')
          } else {
            this.printMessage('error', 'Get tag failed')
          }
        }
      }
      let resolveChaikaResult = (htmlString)=>{
        let resultNodes = new DOMParser().parseFromString(htmlString, 'text/html').querySelectorAll('.result-list')
        this.ehSearchResultList = []
        resultNodes.forEach((node)=>{
          this.ehSearchResultList.push({
            title: node.querySelector('td a').innerHTML,
            url: node.querySelector('a').getAttribute('href'),
            type: 'chaika'
          })
        })
      }
      this.searchResultLoading = true
      if (server === 'e-hentai') {
        axios.get(`https://e-hentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`)
        .then(res=>{
          resolveWebPage(book, res.data)
        })
        .finally(()=>{
          this.searchResultLoading = false
        })
      } else if (server === 'exhentai') {
        ipcRenderer['get-ex-webpage']({
          url: `https://exhentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`,
          cookie: this.cookie
        })
        .then(res=>{
          resolveWebPage(book, res)
        })
        .finally(()=>{
          this.searchResultLoading = false
        })
      } else if (server === 'e-search') {
        axios.get(`https://e-hentai.org/?f_search=${encodeURI(this.searchStringDialog)}&f_cats=689`)
        .then(res=>{
          resolveWebPage(book, res.data)
        })
        .finally(()=>{
          this.searchResultLoading = false
        })
      } else if (server === 'exsearch') {
        ipcRenderer['get-ex-webpage']({
          url: `https://exhentai.org/?f_search=${encodeURI(this.searchStringDialog)}&f_cats=689`,
          cookie: this.cookie
        })
        .then(res=>{
          resolveWebPage(book, res)
        })
        .finally(()=>{
          this.searchResultLoading = false
        })
      } else if (server === 'chaika') {
        axios.get(`https://panda.chaika.moe/search/?title=${encodeURI(this.searchStringDialog)}`)
        .then(res=>{
          resolveChaikaResult(res.data)
        })
        .finally(()=>{
          this.searchResultLoading = false
        })
      }
    },
    resolveSearchResult (book, url, type) {
      book.url = url
      if (type === 'chaika') {
        this.getBookInfoFromChaika(book)
      } else {
        this.getBookInfo(book)
      }
      this.dialogVisibleEhSearch = false
    },
    async getBookInfo (book, server = 'e-hentai') {
      let getTag = async (book, url) => {
        let match = /(\d+)\/([a-z0-9]+)/.exec(url)
        ipcRenderer['post-data-ex']({
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
      }
      let resolveWebPage = async (book, htmlString)=>{
        try {
          let bookUrl = new DOMParser().parseFromString(htmlString, 'text/html').querySelector('.gl3c.glname>a').getAttribute('href')
          await getTag(book, bookUrl)
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
      if (book.url) {
        await getTag(book, book.url)
      } else {
        if (server === 'e-hentai') {
          axios.get(`https://e-hentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`)
          .then(async res=>{
            await resolveWebPage(book, res.data)
          })
        } else if (server === 'exhentai') {
          ipcRenderer['get-ex-webpage']({
            url: `https://exhentai.org/?f_shash=${book.hash.toUpperCase()}&fs_similar=1&fs_exp=on&f_cats=689`,
            cookie: this.cookie
          })
          .then(async res=>{
            await resolveWebPage(book, res)
          })
        }
      }
    },
    getBookInfoFromChaika (book) {
      let archiveNo = /\d+/.exec(book.url)[0]
      axios.get(`https://panda.chaika.moe/api?archive=${archiveNo}`)
      .then(async res=>{
        console.log(res.data)
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
    getBookListMetadata (server) {
      this.dialogVisibleSetting = false
      this.serviceAvailable = true
      const timer = ms => new Promise(res => setTimeout(res, ms))
      let load = async (gap) => {
        for (let i = 0; i < this.bookList.length; i++) {
          ipcRenderer['set-progress-bar'](i/this.bookList.length)
          if (
            (this.bookList[i].status === 'non-tag'
            || (this.setting.batchTagfailedBook && this.bookList[i].status === 'tag-failed'))
            && this.serviceAvailable
          ) {
            await this.getBookInfo(this.bookList[i], server)
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
    handleSortChange (val, isSearch) {
      let bookList = this.bookList
      if (isSearch) bookList = this.displayBookList
      switch(val){
        case 'mark':
          this.displayBookList = _.filter(bookList, 'mark')
          this.chunkList()
          break
        case 'collection':
          this.displayBookList = _.filter(bookList, 'collection')
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
            _.pick(book, ['title', 'title_jpn', 'status', 'category', 'filepath']),
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
      this.showComment = !!this.setting.showComment
      if (this.showComment) this.getComments(book.url)
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
      if (selectNode.folderPath.length <= 1) {
        this.bookList.map(book=>book.folderHide = false)
      } else {
        let clickLibraryPath = this.setting.library + '\\' + selectNode.folderPath.slice(1).join('\\')
        this.bookList.map(book=>book.folderHide = !book.filepath.startsWith(clickLibraryPath))
      }
      this.handleSortChange(this.sortValue)
    },

    // tag analysis and recommand search
    displayTagGraph () {
      let nodes = []
      _.forIn(this.bookList, book=>{
        let tags = _.pick(book?.tags, ['male', 'female', 'mixed', 'other'])
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
          let letter = this.cat2letter[labelArray[0]] ? this.cat2letter[labelArray[0]] : labelArray[0]
          tempNodeData.push({
            id: nanoid(),
            count,
            size: Math.ceil(Math.log(count) ** 2 + 70),
            oriSize: Math.ceil(Math.log(count) ** 2 + 70),
            name: `${letter}:"${labelArray[1]}$"`,
            shortName: `${letter}:"${labelArray[1]}"`,
            oriLabel: label,
            label: `${this.resolvedTranslation[labelArray[0]]?.name || labelArray[0]}:${this.resolvedTranslation[labelArray[1]]?.name || labelArray[1]}`,
            style:{fill: _.sample(colors)}
          })
        } catch {}
      })
      this.tagNodeData = _.takeRight(_.sortBy(tempNodeData, 'count'), 96)
      this.tagNodeData = _.shuffle(this.tagNodeData)
      let edges = []
      let tempTagGroup = []
      _.forIn(this.bookList, book=>{
        let tags = _.pick(book?.tags, ['male', 'female', 'mixed', 'other'])
        let tempTags = []
        _.forIn(tags, (list, cat)=>{
          _.forIn(list, tag=>{
            let foundNode = _.find(this.tagNodeData, {oriLabel: `${cat}##${tag}`})
            if (foundNode) {
              tempTags.push(foundNode.id)
            }
          })
        })
        tempTags.sort()
        for (let i = 0; i < tempTags.length; i++) {
          for (let j = i + 1; j < tempTags.length; j++) {
            let foundGroup = _.find(tempTagGroup, {set: tempTags[i] + '##' + tempTags[j]})
            if (foundGroup) {
              foundGroup.count += 1
            } else {
              tempTagGroup.push({
                set: tempTags[i] + '##' + tempTags[j],
                count: 1
              })
            }
          }
        }
      })
      let maxCount = _.max(tempTagGroup.map(g=>g.count))
      let countLimit =  maxCount * 0.1
      _.forIn(tempTagGroup, g=>{
        if (g.count > countLimit) {
          g.array = g.set.split('##')
          edges.push({
            source: g.array[0],
            target: g.array[1],
            style: {
              lineWidth: Math.round(g.count / maxCount * 6)
            }
          })
        }
      })
      this.dialogVisibleGraph = true
      this.$nextTick(()=>{
        let graph = new G6.Graph({
          container: 'tag-graph',
          layout: {
            type: 'force',
            nodeStrength: 40,
            edgeStrength: 0.01,
            collideStrength: 1,
            alphaDecay: 0.1,
            nodeSpacing: 10,
            preventOverlap: true,
          },
          defaultNode: {
            style: {
              stroke: '#6196FE',
              lineWidth: 1
            }
          },
          defaultEdge: {
            type: 'line',
            style: {
              stroke: '#6196FE'
            }
          },
          modes: {
            default: ['drag-canvas', 'zoom-canvas', 'drag-node']
          }
        })
        graph.data({nodes: this.tagNodeData, edges})
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
          _.find(this.tagNodeData, {id: model.id}).size = 200
          let size = 200
          states.forEach((state)=>{
            if (state === 'click') {
              clicked = true
              size = model.oriSize
              _.find(this.tagNodeData, {id: model.id}).size = model.oriSize
            }
          })
          graph.setItemState(node, 'click', !clicked)
          graph.getNodes().forEach((node)=>{
            graph.updateItem(node, {
              style: {
                stroke: '#6196FE',
                lineWidth: 1
              }
            })
          })
          if (!clicked) {
            graph.updateItem(node, {
              size,
              style: {
                stroke: '#FF0000',
                lineWidth: 3
              }
            })
            node.getNeighbors().forEach((node)=>{
              graph.updateItem(node, {
                style: {
                  stroke: '#FF0000',
                  lineWidth: 3
                }
              })
            })
          }
          graph.layout()
        })
        graph.render()
      })
    },
    geneRecommend (chinese = false, type = 'exhentai') {
      let tagGroup2 = _.filter(this.tagNodeData, n=>n.size >= 200)
      let tagGroup3 = tagGroup2
      if (type === 'exhentai') {
        ipcRenderer['open-url'](`https://exhentai.org/?f_search=${tagGroup3.map(n=>n.name).join(' ')}${chinese?' l:chinese$':''}`)
      } else {
        this.dialogVisibleGraph = false
        this.searchString = `${tagGroup3.map(n=>n.shortName).join(' ')}`
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
      this.saveBook(book)
    },
    showFile(filepath) {
      ipcRenderer['show-file'](filepath)
    },
    openLocalBook (book) {
      this.bookDetail = book
      ipcRenderer['open-local-book'](this.bookDetail.filepath)
    },
    deleteLocalBook (book) {
      const deleteBook = ()=>{
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
          this.chunkDisplayBookList = this.customChunk(this.displayBookList, this.setting.pageSize, this.currentPage - 1)
          if (book.hidden) this.saveCollection()
          this.dialogVisibleBookDetail = false
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
          cookie: this.cookie
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
      electronFunction['copy-text-to-clipboard'](JSON.stringify(_.pick(book, ['tags', 'status', 'category'])))
    },
    pasteTagClipboard (book) {
      let text = electronFunction['read-text-from-clipboard']()
      _.assign(book, JSON.parse(text))
      this.saveBook(book)
    },

    // internal viewer
    returnImageStyle(image) {
      const returnImageStyleObject = ({width, height})=>{
        if (width) {
          return { width: width + 'px', height: (image.height * (width / image.width)) + 'px' }
        }
        if (height) {
          return { width: (image.width * (height / image.height)) + 'px', height: height + 'px' }
        }
      }
      if (image) {
        const windowRatio = window.innerWidth / window.innerHeight
        switch (this.imageStyleType) {
          case 'scroll':
            return returnImageStyleObject({width: this.viewerImageWidth})
          case 'double': {
            switch (this.imageStyleFit) {
              case 'height': {
                if (this.setting.hidePageNumber) {
                  return returnImageStyleObject({height: window.innerHeight - 1})
                } else {
                  // 28,30 is the height of .viewer-image-page
                  return returnImageStyleObject({height: window.innerHeight - 30})
                }
              }
              case 'width': {
                // 18 is the width of scrollbar
                return returnImageStyleObject({width: (window.innerWidth - 18) / 2})
              }
              case 'window': {
                if (image.width * 2 / image.height > windowRatio) {
                  return returnImageStyleObject({width: (window.innerWidth - 18) / 2 })
                } else {
                  if (this.setting.hidePageNumber) {
                    return returnImageStyleObject({height: window.innerHeight - 1})
                  } else {
                    return returnImageStyleObject({height: window.innerHeight - 30})
                  }
                }
              }
            }
          }
          case 'single': {
            switch (this.imageStyleFit) {
              case 'height': {
                if (this.setting.hidePageNumber) {
                  return returnImageStyleObject({height: window.innerHeight})
                } else {
                  return returnImageStyleObject({height: window.innerHeight - 30})
                }
              }
              case 'width': {
                return returnImageStyleObject({width: window.innerWidth - 18})
              }
              case 'window': {
                if (image.width / image.height > windowRatio) {
                  return returnImageStyleObject({width: window.innerWidth - 18})
                } else {
                  if (this.setting.hidePageNumber) {
                    return returnImageStyleObject({height: window.innerHeight})
                  } else {
                    return returnImageStyleObject({height: window.innerHeight - 30})
                  }
                }
              }
            }
          }
        }
      }
    },
    returnImageFrameStyle () {
      if (this.imageStyleType === 'scroll') {
        return {}
      } else {
        return {height: '100vh'}
      }
    },
    saveImageStyleType () {
      this.currentImageIndex = 0
      setTimeout(()=>document.querySelector('.viewer-close-button').focus(), 500)
      localStorage.setItem('imageStyleType', this.imageStyleType)
      localStorage.setItem('imageStyleFit', this.imageStyleFit)
      if (this.imageStyleType === 'double') this.printMessage('info', this.$t('c.insertEmptyPageInfo'))
    },
    switchThumbnail (val) {
      setTimeout(()=>document.querySelector('.viewer-close-button').focus(), 500)
      if (this.imageStyleType === 'scroll') {
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
      }
    },
    handleClickThumbnail(id) {
      this.showThumbnail = false
      let scrollTopValue = 0
      if (this.imageStyleType === 'scroll') {
        _.forIn(this.viewerImageList, (image)=>{
          if (image.id === id) return false
          // 28 is the height of .viewer-image-page
          if (this.setting.hidePageNumber) {
            scrollTopValue += parseFloat(this.returnImageStyle(image).height)
          } else {
            scrollTopValue += parseFloat(this.returnImageStyle(image).height) + 28
          }
        })
        this.$nextTick(()=>document.getElementsByClassName('el-drawer__body')[0].scrollTop = scrollTopValue)
      } else if (this.imageStyleType === 'single') {
        this.currentImageIndex = _.findIndex(this.viewerImageList, {id: id})
      } else if (this.imageStyleType === 'double') {
        _.forIn(this.viewerImageListDouble, (imageGroup, index)=>{
          if (_.find(imageGroup.page, {id: id})) {
            this.currentImageIndex = +index
            return false
          }
        })
      }
    },
    scrollPage (event) {
      if (this.imageStyleType === 'single' || this.imageStyleType === 'double') {
        if(event.clientX > window.innerWidth / 2) {
          this.currentImageIndex += 1
          document.getElementsByClassName('el-drawer__body')[0].scrollTop = 0
        } else {
          this.currentImageIndex -= 1
          document.getElementsByClassName('el-drawer__body')[0].scrollTop = 0
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
      this.currentImageIndex = 0
      ipcRenderer['release-sendimagelock']()
    },
    toNextMangaRandom (event) {
      event.stopPropagation()
      this.releaseSendImageLock()
      let activeBookList = this.drawerVisibleCollection ? this.openCollectionBookList : _.filter(this.displayBookList, book=>(!book.hidden && !book.folderHide))
      setTimeout(()=>this.viewManga(_.sample(activeBookList)), 500)
    },
    toNextManga (event) {
      event.stopPropagation()
      this.releaseSendImageLock()
      let activeBookList = this.drawerVisibleCollection ? this.openCollectionBookList : _.filter(this.displayBookList, book=>(!book.hidden && !book.folderHide))
      let indexNow = _.findIndex(activeBookList, {id: this.bookDetail.id})
      if (indexNow === activeBookList.length - 1) {
        this.printMessage('warning', this.$t('c.lastManga'))
      } else {
        setTimeout(()=>this.viewManga(activeBookList[indexNow + 1]), 500)
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
        this.setting.imageExplorer = `"${res}"`
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
    autoCheckUpdates (forceShowDialog) {
      axios.get('https://api.github.com/repos/SchneeHertz/exhentai-manga-manager/releases/latest')
      .then(res=>{
        let { tag_name, html_url } = res.data
        if (tag_name && tag_name !== 'v' + this.version) {
          ElMessageBox.confirm(
            this.$t('c.newVersion') + tag_name,
            '',
            {
              confirmButtonText: this.$t('c.downloadUpdate'),
              type: 'success'
            }
          )
          .then(()=>{
            ipcRenderer['open-url'](html_url)
          })
        } else if (forceShowDialog) {
          ElMessageBox.confirm(
            this.$t('c.notNewVersion'),
            '',
            {
              type: 'info',
              showCancelButton: false
            }
          )
        }
      })
    },
    testProxy () {
      axios.get('https://e-hentai.org')
      .then(()=>{
        this.printMessage('success', this.$t('c.proxyWorking'))
      })
      .catch(()=>{
        this.printMessage('error', this.$t('c.proxyNotWorking'))
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
            if (index === this.bookList.length - 1) {
              this.dialogVisibleSetting = false
              this.printMessage('success', this.$t('c.importMessage'))
            }
            await this.saveBook(book)
          })
        } else {
          this.printMessage('info', this.$t('c.canceled'))
        }
      })
    },
    importDatabasefromSqlite () {
      ipcRenderer['import-sqlite'](_.cloneDeep(this.bookList))
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
              this.openSearchDialog(book, 'e-hentai')
            }
          },
          {
            label: this.$t('m.getExMetadata'),
            onClick: () => {
              this.openSearchDialog(book, 'exhentai')
            }
          },
          {
            label: this.$t('m.getMetadataByFilename'),
            onClick: () => {
              this.openSearchDialog(book)
            }
          },
          {
            label: this.$t('m.getChaikaMetadata'),
            onClick: () => {
              this.openSearchDialog(book, 'chaika')
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
                this.saveBook(this.bookDetail)
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
.autocomplete-value
  margin-left: 2em
  float: right

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
  height: 36px
  overflow-y: hidden
  margin: 8px 2px
  font-size: 14px
  cursor: pointer
  line-height: 18px
.book-card-star, .book-detail-star, .book-card-language, .book-card-pagecount
  position: absolute
.book-card-language
  left: 19px
  top: 52px
.book-card-pagecount
  left: 19px
  top: 315px
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
  height: calc(100vh - 170px)

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

.el-dialog.is-fullscreen
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

.dialog-search
  .el-dialog__body
    padding: 5px 20px 16px
  .search-type-select
    width: 100px
  .search-result-ind
    cursor: pointer
    text-align: left
    margin: 8px 0
  .search-result-ind:hover
    background-color: var(--el-fill-color-dark)

.setting-dialog
  .el-dialog__body
    padding: 5px 20px 16px
.setting-title
  margin:0
  text-align: center
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
.about-logo
  width: 160px
  position: absolute
  right: 40px
  top: 10px

.viewer-drawer
  .el-drawer__body
    padding: 0
    display: flex
    justify-content: center
    align-items: center
    flex-wrap: wrap

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

.viewer-mode-setting
  opacity: 0.1
  position: absolute
  width: 100px
  top: 8px
  left: 8px
  z-index: 10
  transition-delay: 0.2s
.viewer-mode-setting:hover
  opacity: 1
.viewer-mode, .viewer-image-fit, .viewer-thumbnail-select
  width: 100px
  margin: 4px 8px

.image-frame
  display: flex
  flex-wrap: wrap
  .viewer-image-frame-scroll
    position: relative
  .viewer-image-frame
    margin: auto
    .viewer-image
      user-select: none
    .viewer-image-bar
      position: absolute
      height: 100%
      width: 6px
      top: 0
      right: -3px
      cursor: ew-resize
    .viewer-image-bar:hover
      background-color: var(--el-color-primary)
  .viewer-image-frame-double .viewer-image
    float: right
  .viewer-image-page
    line-height: 18px
    margin-top: 3px
    margin-bottom: 7px
    width: 98vw
  .viewer-image-preload
    display: none

.next-manga-button
  opacity: 0
  position: fixed
  bottom:1em
  z-index: 10
  transition-delay: 0.2s
.next-manga-button:hover
  opacity: 1

.drawer-thumbnail-content
  margin: 1em
  height: 100vh
  text-align: left
.viewer-thumbnail
  margin: 8px 0 0
.viewer-thunmnail-page
  text-align: center
  font-size: 11px

.el-autocomplete-suggestion__wrap, .el-select-dropdown__wrap
  max-height: 490px!important

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
