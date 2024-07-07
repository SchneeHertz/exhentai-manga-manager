<template>
  <el-config-provider :locale="locale">
    <div id="progressbar" :style="{ width: progress + '%' }"></div>
    <el-button class="fullscreen-button" circle :icon="FullScreen" size="large" @click="switchFullscreen"></el-button>
    <el-row :gutter="20" class="book-search-bar">
      <el-col :span="1" :offset="2">
        <el-button type="primary" :icon="TreeViewAlt" plain @click="openFolderTree" :title="$t('m.folderTree')"></el-button>
      </el-col>
      <el-col :span="8">
        <el-autocomplete
          :model-value="searchString"
          :fetch-suggestions="querySearch"
          @keyup.enter="searchBook"
          @change="handleSearchStringChange"
          @input="handleInput"
          clearable
          :trigger-on-focus="false"
          class="search-input"
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
        <el-button type="primary" :icon="MdCodeDownload" plain @click="getBookListMetadata()" :title="$t('m.batchGetMetadata')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button :icon="Lightbulb16Regular" plain @click="$refs.TagGraphRef.displayTagGraph()" :title="$t('m.tagAnalysis')"></el-button>
      </el-col>
      <el-col :span="1">
        <el-button :icon="SettingIcon" plain @click="$refs.SettingRef.dialogVisibleSetting = true" :title="$t('m.setting')"></el-button>
      </el-col>
      <el-col :span="3">
        <el-select :placeholder="$t('m.sort_filter')" @change="handleSortChange" clearable v-model="sortValue">
          <el-option-group :label="$t('m.filter')">
            <el-option :label="$t('m.bookmarkOnly')" value="mark"></el-option>
            <el-option :label="$t('m.collectionOnly')" value="collection"></el-option>
            <el-option :label="$t('m.hiddenOnly')" value="hidden"></el-option>
          </el-option-group>
          <el-option-group :label="$t('m.sort')">
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
          </el-option-group>
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-row :gutter="20">
          <el-col :span="6"  v-if="!editTagView && !editCollectionView">
            <el-button plain @click="enterEditCollectionView" :icon="CicsSystemGroup" :title="$t('m.manageCollection')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editCollectionView">
            <el-button type="primary" plain @click="addCollection" :icon="Collections24Regular" :title="$t('m.addCollection')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editCollectionView">
            <el-button type="primary" plain @click="editCollection" :icon="Edit" :title="$t('m.editCollection')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editCollectionView">
            <el-button type="primary" plain @click="saveCollection" :icon="Save16Regular" :title="$t('m.save')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editCollectionView">
            <el-button type="primary" plain @click="editCollectionView = false" :icon="MdExit" :title="$t('m.exit')"></el-button>
          </el-col>
          <el-col :span="6"  v-if="!editTagView && !editCollectionView">
            <el-button plain @click="enterEditTagView" :icon="TagGroup" :title="$t('m.manageCollection')"></el-button>
          </el-col>
          <el-col :span="6" v-if="editTagView">
            <el-button type="primary" plain @click="editTagView = false" :icon="MdExit" :title="$t('m.exit')"></el-button>
          </el-col>
        </el-row>
      </el-col>
    </el-row>
    <el-row :gutter="20" class="book-tag-area" v-if="!editTagView && !editCollectionView">
      <el-space size="small" id="random-tags">
        <el-button size="small" plain :icon="MdRefresh" @click="reloadRandomTags"></el-button>
        <el-button v-for="tag in randomTags" size="small" plain @click="handleClickTagInRandom(tag)">{{ tag.label }}</el-button>
      </el-space>
    </el-row>
    <el-row :gutter="20" class="book-card-area">
      <el-col :span="24" v-if="!editTagView && !editCollectionView" class="book-card-list">
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
            <el-tag class="book-card-pagecount" size="small" type="danger" v-if="book.pageDiff" @click="searchFromTag('pageDiff')">{{book.pageCount}}|{{book.filecount}}P</el-tag>
            <el-tag class="book-card-pagecount" size="small" type="info" v-else>{{ book.pageCount }}P</el-tag>
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
      <el-col :span="20" v-if="editCollectionView" class="book-collect-view"
        @mousedown="handleMouseDownForSelection" @mouseup="handleMouseUpForSelection('collect')" @mousemove="handleMouseMoveForSelection"
      >
        <el-badge
          :value="book.collected ? '✓' : '+'"
          :type="book.collected ? 'success' : 'warning'"
          v-for="book in visibleChunkDisplayBookListForCollectView" :key="book.id"
          class="book-add-badge"
        >
          <div class="book-collect-card selectable-card" :id="book.id" @click="handleClickCollectBadge(book)">
            <p class="book-collect-title" :title="getDisplayTitle(book)">{{getDisplayTitle(book)}}</p>
            <img class="book-collect-cover" :src="book.coverPath"/>
          </div>
        </el-badge>
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
        <el-popover
          v-for="book in visibleChunkDisplayBookListForEditTagView" :key="book.id"
          placement="left" :width="300" trigger="hover" :show-after="1000" :hide-after="100"
        >
          <template #reference>
            <el-badge
              :value="book.selected ? '✓' : '+'"
              :type="book.selected ? 'success' : 'warning'"
              class="book-add-badge"
            >
              <div class="book-tag-edit-card selectable-card" @contextmenu="previewManga(book)" :id="book.id" @click="handleSelectBookBadge(book)">
                <p class="book-tag-edit-title" :title="getDisplayTitle(book)">{{getDisplayTitle(book)}}</p>
                <img class="book-tag-edit-cover" :src="book.coverPath"/>
              </div>
            </el-badge>
          </template>
          <el-descriptions :column="1" size="small" class="book-tag-edit-popover">
            <el-descriptions-item :label="$t('m.pageCount')+':'">
              <el-tag class="book-tag" :type="book.pageDiff ? 'danger' : 'info'">{{book.pageCount}} | {{book.filecount}}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('m.metadataStatus')+':'">
              <el-tag class="book-tag" :type="book.status === 'non-tag' ? 'info' : book.status === 'tagged' ? 'success' : 'warning'"
              @click="searchFromTag(book.status)">{{book.status}}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('m.category')+':'">
              <el-tag type="info" class="book-tag" @click="searchFromTag(book.category)">{{book.category}}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-for="(tagArr, key) in book.tags" :label="key + ':'" :key="key">
              <el-tag type="info" class="book-tag" v-for="tag in tagArr" :key="tag" @click="searchFromTag(tag, key)"
              >{{resolvedTranslation[tag] ? resolvedTranslation[tag].name : tag }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-popover>
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
    </el-row>
    <div id="selection-box" ref="selectionBox"></div>
    <el-row class="pagination-bar">
      <el-pagination
        v-model:currentPage="currentPage"
        v-model:page-size="setting.pageSize"
        :page-sizes="[24, 42, 72, 500, 5000]"
        :small="true"
        layout="total, sizes, prev, pager, next, jumper"
        :total="displayBookCount"
        @size-change="handleSizeChange"
        @current-change="handleCurrentPageChange"
        background
      />
    </el-row>
    <el-drawer v-model="drawerVisibleCollection"
      direction="btt"
      size="calc(100vh - 60px)"
      destroy-on-close
      class="collection-drawer"
    >
      <template #header>
        <div>
          <span class="open-collection-title">{{openCollectionTitle}}</span>
          <el-button type="primary" :icon="Edit" plain link class="collection-edit-button" @click="editCurrentCollection"/>
        </div>
      </template>
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
          <el-tag class="book-card-pagecount" size="small" type="danger" v-if="book.pageDiff" @click="searchFromTag('pageDiff')">{{book.pageCount}}|{{book.filecount}}P</el-tag>
          <el-tag class="book-card-pagecount" size="small" type="info" v-else>{{ book.pageCount }}P</el-tag>
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
              <el-descriptions-item :label="$t('m.pageCount')+':'" :class-name="bookDetail.pageDiff ? 'text-red' : ''">
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
                <el-button @click="getBookInfo(bookDetail)">{{$t('m.getTagbyUrl')}}</el-button>
                <el-button @click="copyTagClipboard(bookDetail)">{{$t('m.copyTagClipboard')}}</el-button>
                <el-button @click="pasteTagClipboard(bookDetail)">{{$t('m.pasteTagClipboard')}}</el-button>
              </el-space>
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
    <InternalViewer
      ref="InternalViewerRef"
      :setting="setting"
      :key-map="keyMap"
      :book-detail="bookDetail"
      @handle-stop-read-manga="handleStopReadManga"
      @to-next-manga="toNextManga"
      @to-next-manga-random="toNextMangaRandom"
      @use-new-cover="useNewCover"
      @select-book="selectBook"
      @message="printMessage"
      @update-window-title="updateWindowTitle"
      @rescan-book="rescanBook"
    ></InternalViewer>
    <el-drawer v-model="sideVisibleFolderTree"
      :title="$t('m.folderTree')"
      direction="ltr"
      :size="setting.folderTreeWidth ? setting.folderTreeWidth : '20%'"
      modal-class="side-tree-modal"
    >
      <el-input
        class="folder-search"
        v-model="treeFilterText"
        clearable
      ></el-input>
      <el-tree
        ref="treeRef"
        :data="folderTreeData"
        node-key="folderPath"
        :default-expanded-keys="expandNodes"
        :expand-on-click-node="false"
        :filter-node-method="filterTreeNode"
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
        @current-change="selectFolderTreeNode"
      ></el-tree>
    </el-drawer>
    <Graph
      ref="TagGraphRef"
      :book-list="displayBookList"
      :cat2letter="cat2letter"
      :resolved-translation="resolvedTranslation"
      @search="handleSearchTags"
    ></Graph>
    <SearchDialog
      ref="SearchDialogRef"
      :cookie="cookie"
      :search-type-list="searchTypeList"
      :setting="setting"
      @message="printMessage"
      @resolve-search-result="resolveSearchResult"
    ></SearchDialog>
    <Setting
      ref="SettingRef"
      :search-type-list="searchTypeList"
      @update-setting="updateSetting"
      @handle-language-set="handleLanguageSet"
      @message="printMessage"
      @force-gene-book-list="forceGeneBookList"
      @patch-local-metadata="patchLocalMetadata"
      @import-metadata-from-sqlite="importMetadataFromSqlite"
      @handle-resolve-translation-update="handleResolveTranslationUpdate"
    ></Setting>
  </el-config-provider>
</template>

<script>
import { defineComponent } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting as SettingIcon, FullScreen, Edit } from '@element-plus/icons-vue'
import { Lightbulb16Regular, Collections24Regular, Search32Filled, Save16Regular, CaretRight20Regular, CaretLeft20Regular } from '@vicons/fluent'
import { MdShuffle, IosRemoveCircleOutline, MdRefresh, MdCodeDownload, MdExit } from '@vicons/ionicons4'
import { BookmarkTwotone } from '@vicons/material'
import { TreeViewAlt, CicsSystemGroup, TagGroup } from '@vicons/carbon'
import he from 'he'
import { nanoid } from 'nanoid'
import draggable from 'vuedraggable'
import * as linkify from 'linkifyjs'

import { getWidth } from './utils.js'

import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import en from 'element-plus/dist/locale/en.mjs'

import Setting from './components/Setting.vue'
import Graph from './components/Graph.vue'
import InternalViewer from './components/InternalViewer.vue'
import SearchDialog from './components/SearchDialog.vue'

export default defineComponent({
  components: {
    BookmarkTwotone, IosRemoveCircleOutline, CaretRight20Regular, CaretLeft20Regular,
    draggable,
    Setting,
    Graph,
    InternalViewer,
    SearchDialog
  },
  setup () {
    return {
      SettingIcon, FullScreen, Edit,
      Collections24Regular, Search32Filled, Lightbulb16Regular, Save16Regular,
      MdRefresh, MdCodeDownload, MdExit, MdShuffle,
      TreeViewAlt, CicsSystemGroup, TagGroup
    }
  },
  data () {
    return {
      dialogVisibleBookDetail: false,
      sideVisibleFolderTree: false,
      editCollectionView: false,
      editTagView: false,
      drawerVisibleCollection: false,
      pathSep: '\\',
      // home
      bookList: [],
      displayBookList: [],
      chunkDisplayBookList: [],
      resolvedTranslation: {},
      locale: zhCn,
      searchString: '',
      sortValue: undefined,
      _currentPage: 1,
      treeFilterText: '',
      folderTreeData: [],
      expandNodes: [],
      progress: 0,
      randomTags: [],
      // collection
      selectCollection: undefined,
      selectCollectionObject: {list:[]},
      collectionList: [],
      openCollectionTitle: undefined,
      openCollectionBookList: [],
      // group tag edit
      selectBookList: [],
      groupTagSelected: [],
      updateTagsLoading: false,
      categorySelected: undefined,
      statusSelected: 'tagged',
      startX: undefined,
      startY: undefined,
      isSelecting: false,
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
      statusOption: [
        'non-tag',
        'tagged',
        'tag-failed'
      ],
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
      searchTypeList: [
        { label: "exhentai(sha1)", value: "exhentai" },
        { label: "e-hentai(sha1)", value: "e-hentai" },
        { label: "exhentai(keyword)", value: "exsearch" },
        { label: "e-hentai(keyword)", value: "e-search" },
        { label: "hentag(keyword)", value: "hentag" },
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
        let list = this.selectCollectionObject.list.map(hash_id => _.filter(this.bookList, book => book.hash === hash_id || book.id === hash_id))
        return _.compact(_.flatten(list))
      },
      set (val) {
        let list = [...new Set(val.map(b => b.hash))]
        this.selectCollectionObject.list = list
      }
    },
    tagList () {
      let tagArray = _(this.bookList.filter(b => {
        return !b.hiddenBook && !b.folderHide
      }).map(b => {
        return _.map(b.tags, (tags, cat) => {
          return _.map(tags, tag => `${cat}##${tag}`)
        })
      }))
      .flattenDeep().value()
      let uniqedTagArray = [...new Set(tagArray)].sort()
      return uniqedTagArray.map(combinedTag => {
        let tagArray = _.split(combinedTag, '##')
        let letter = this.cat2letter[tagArray[0]] ? this.cat2letter[tagArray[0]] : tagArray[0]
        let labelHeader = tagArray[0]
        let labelTail = tagArray[1]
        if (this.setting.showTranslation) {
          labelHeader = tagArray[0] === 'group' ? '团队' : this.resolvedTranslation[tagArray[0]]?.name || tagArray[0]
          labelTail = this.resolvedTranslation[tagArray[1]]?.name || tagArray[1]
        }
        return {
          label: `${labelHeader}:${labelTail}`,
          value: `${letter}:"${tagArray[1]}"$`
        }
      })
    },
    tagListForSelect () {
      let tagArray = _(this.bookList.map(b => {
        return _.map(b.tags, (tags, cat) => {
          return _.map(tags, tag => `${cat}##${tag}`)
        })
      }))
      .flattenDeep().value()
      let uniqedTagArray = [...new Set(tagArray)].sort()
      return uniqedTagArray.map(combinedTag => {
        let tagArray = _.split(combinedTag, '##')
        let letter = this.cat2letter[tagArray[0]] ? this.cat2letter[tagArray[0]] : tagArray[0]
        let labelHeader = tagArray[0]
        let labelTail = tagArray[1]
        if (this.setting.showTranslation) {
          labelHeader = tagArray[0] === 'group' ? '团队' : this.resolvedTranslation[tagArray[0]]?.name || tagArray[0]
          labelTail = this.resolvedTranslation[tagArray[1]]?.name || tagArray[1]
        }
        return {
          label: `${labelHeader}:${labelTail} || ${letter}:"${tagArray[1]}"$`,
          value: `${letter}:"${tagArray[1]}"$`
        }
      })
    },
    tag2cat () {
      let temp = {}
      let tagArray = _(this.bookList.map(b=>{
        return _.map(b.tags, (tags, cat)=>{
          return _.map(tags, tag=>`${cat}##${tag}`)
        })
      }))
      .flattenDeep().value()
      let uniqedTagArray = [...new Set(tagArray)]
      uniqedTagArray.forEach(combinedTag=>{
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
    },
    visibleChunkDisplayBookListForCollectView () {
      return this.chunkDisplayBookList.filter(book => !book.isCollection && !book.folderHide && !book.hiddenBook)
    },
    visibleChunkDisplayBookListForEditTagView () {
      return this.chunkDisplayBookList.filter(book => !book.isCollection && !book.folderHide)
    },
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
    this.pathSep = ipcRenderer.sendSync('get-path-sep')
    this.sortValue = localStorage.getItem('sortValue')
    this.expandNodes = JSON.parse(localStorage.getItem('expandNodes')) || []
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
  watch: {
    bookList () {
      this.handleSortChange(this.sortValue, this.bookList)
    },
    tagList () {
      this.reloadRandomTags()
    },
    treeFilterText (value) {
      this.$refs.treeRef.filter(value)
    },
  },
  methods: {
    // base function
    currentUI () {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
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
      if (this.editTagView) {
        return 'edit-group-tag'
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
          if (event.key === next || event.key === 'ArrowDown' || event.key === ' ') {
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
          if (event.key === next || event.key === 'ArrowDown' || event.key === ' ') {
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
        if (event.key === '=') {
          this.$refs.InternalViewerRef.showThumbnail = !this.$refs.InternalViewerRef.showThumbnail
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
    switchFullscreen () {
      ipcRenderer.invoke('switch-fullscreen')
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
    returnFileNameWithExt (filepath) {
      return filepath.split(/[/\\]/).pop()
    },
    returnFileName (book) {
      let fileNameWithExtension = this.returnFileNameWithExt(book.filepath)
      if (book.type === 'folder') return fileNameWithExtension
      return fileNameWithExtension.split('.').slice(0, -1).join('.')
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
          this.bookList = this.prepareBookList(res)
          this.loadCollectionList()
          this.geneFolderTree()
          this.selectBookList = []
        })
    },
    saveBook (book) {
      return ipcRenderer.invoke('save-book', _.cloneDeep(book))
    },
    prepareBookList (bookList) {
      bookList.forEach(book => {
        if (Number.isInteger(book.filecount) && Number.isInteger(book.pageCount) && Math.abs(book.filecount - book.pageCount) > 5) book.pageDiff = true
      })
      return bookList
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
    updateWindowTitle (book) {
      let title = this.getDisplayTitle(book)
      ipcRenderer.invoke('update-window-title', title)
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
      if (type === 'hentag') {
        book.url = url
        this.getBookInfoFromHentag(book)
      } else {
        book.url = url
        this.getBookInfoFromEh(book)
      }
      this.$refs.SearchDialogRef.dialogVisibleEhSearch = false
    },
    async getBookInfoFromHentag (book) {
      let data = await fetch(`https://hentag.com/public/api/vault/${book.url.slice(25)}`)
      .then(res => res.json())
      let tags = {}
      data.language === 11 ? tags['language'] = ['chinese','translated'] : ''
      data.parodies.length > 0 ? tags['parody'] = data.parodies.map(parody => parody.name) : ''
      data.characters.length > 0 ? tags['character'] = data.characters.map(character => character.name) : ''
      data.circles.length > 0 ? tags['group'] = data.circles.map(circle => circle.name) : ''
      data.artists.length > 0 ? tags['artist'] = data.artists.map(artist => artist.name) : ''
      data.maleTags.length > 0 ? tags['male'] = data.maleTags.map(maleTag => maleTag.name) : ''
      data.femaleTags.length > 0 ? tags['female'] = data.femaleTags.map(femaleTag => femaleTag.name) : ''
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
    getBookInfo (book) {
      if (book.url.startsWith('https://hentag.com')) {
        this.getBookInfoFromHentag(book)
      } else {
        this.getBookInfoFromEh(book)
      }
    },
    async getBooksMetadata (bookList, gap) {
      let server = this.setting.defaultScraper || 'exhentai'
      this.serviceAvailable = true
      const timer = ms => new Promise(res => setTimeout(res, ms))
      for (let i = 0; i < bookList.length; i++) {
        ipcRenderer.invoke('set-progress-bar', (i + 1) / bookList.length)
        let book = bookList[i]
        try {
          if (this.serviceAvailable) {
            let resultList = await this.$refs.SearchDialogRef.getBookListFromWeb(
              book.hash.toUpperCase(),
              this.$refs.SearchDialogRef.returnTrimFileName(book),
              server
            )
            this.resolveSearchResult(book.id, resultList[0].url, resultList[0].type)
            await timer(gap)
          }
        } catch (error) {
          book.status = 'tag-failed'
          await this.saveBook(book)
          console.error(error)
        }
      }
      ipcRenderer.invoke('set-progress-bar', -1)
    },
    getBookListMetadata () {
      let bookList
      if (this.setting.batchTagfailedBook) {
        bookList = this.bookList.filter(book=>book.status === 'tag-failed' || book.status === 'non-tag')
      } else {
        bookList = this.bookList.filter(book=>book.status === 'non-tag')
      }
      if (this.setting.onlyGetMetadataOfSelectedFolder) {
        bookList = bookList.filter(book => !book.folderHide)
      }
      this.getBooksMetadata(bookList, this.setting.requireGap || 10000)
    },

    // home header
    shuffleBook () {
      this.sortValue = 'shuffle'
      this.displayBookList = _.shuffle(this.displayBookList)
      this.chunkList()
    },
    handleSortChange (val, bookList) {
      if (!bookList) bookList = this.displayBookList
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
          this.displayBookList = bookList.toSorted(this.sortList('date')).toReversed()
          this.chunkList()
          break
        case 'addDescend':
          this.displayBookList = bookList.toSorted(this.sortList('date'))
          this.chunkList()
          break
        case 'mtimeAscend':
          this.displayBookList = bookList.toSorted(this.sortList('mtime')).toReversed()
          this.chunkList()
          break
        case 'mtimeDescend':
          this.displayBookList = bookList.toSorted(this.sortList('mtime'))
          this.chunkList()
          break
        case 'postAscend':
          this.displayBookList = bookList.toSorted(this.sortList('posted')).toReversed()
          this.chunkList()
          break
        case 'postDescend':
          this.displayBookList = bookList.toSorted(this.sortList('posted'))
          this.chunkList()
          break
        case 'scoreAscend':
          this.displayBookList = bookList.toSorted(this.sortList('rating')).toReversed()
          this.chunkList()
          break
        case 'scoreDescend':
          this.displayBookList = bookList.toSorted(this.sortList('rating'))
          this.chunkList()
          break
        case 'artistAscend':
          this.displayBookList = bookList.toSorted(this.sortList('tags.artist')).toReversed()
          this.chunkList()
          break
        case 'artistDescend':
          this.displayBookList = bookList.toSorted(this.sortList('tags.artist'))
          this.chunkList()
          break
        case 'titleAscend':
          this.displayBookList = bookList.toSorted((a, b) => this.getDisplayTitle(b).localeCompare(this.getDisplayTitle(a), undefined, {numeric: true, sensitivity: 'base'})).toReversed()
          this.chunkList()
          break
        case 'titleDescend':
          this.displayBookList = bookList.toSorted((a, b) => this.getDisplayTitle(b).localeCompare(this.getDisplayTitle(a), undefined, {numeric: true, sensitivity: 'base'}))
          this.chunkList()
          break
        default:
          this.displayBookList = this.bookList
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
          let nextKeyword = queryString.replace(/(~|-)?[\w\d一-龟]+:"[- ._\w\d一-龟]+"\$/g, '').trim()
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
    handleSearchStringChange (val) {
      if (!val) {
        this.searchString = ''
        this.handleSortChange(this.sortValue, this.bookList)
      }
    },
    handleInput (val) {
      try {
        if (/^[\w\d一-龟]+:"[- ._\w\d一-龟]+"\$$/.test(val) && this.searchString.trim() !== val.trim()) {
          let keywords = [...this.searchString.trim().matchAll(/\s+(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)/g)]
          if (!_.isEmpty(keywords)) {
            const keyword = this.searchString.replace(/(~|-)?[\w\d一-龟]+:"[- ._\w\d一-龟]+"\$/g, '').trim()
            const matches = this.searchString.match(/(~|-)?[\w\d一-龟]+:"[- ._\w\d一-龟]+"\$/g)
            if (keyword[0] === '-') {
              this.searchString = matches.concat([`-${val}`]).join(' ')
            } else if (keyword[0] === '~') {
              this.searchString = matches.concat([`~${val}`]).join(' ')
            } else {
              this.searchString = matches.concat([val]).join(' ')
            }
          } else {
            const keyword = this.searchString.trim()
            if (keyword[0] === '-') {
              this.searchString = `-${val}`
            } else if (keyword[0] === '~') {
              this.searchString = `~${val}`
            } else {
              this.searchString = val
            }
          }
        } else {
          this.searchString = val
          this.searchString = this.searchString.replace(/\|{3}/, ' ')
        }
      } catch {
        this.searchString = val
      }
    },
    searchBook () {
      const checkCondition = (bookString) => {
        const searchStringArray = this.searchString ? this.searchString.split(/\s+(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)/) : []
        const orCondition = _.filter(searchStringArray, str=>str.startsWith('~'))
        const andCondition = _.filter(searchStringArray, str=>!str.startsWith('~'))
        return _.some([andCondition, ...orCondition], (condition)=>{
          if (_.isArray(condition)) {
            return _.every(condition, (str)=>{
              if (_.startsWith(str, '-')) {
                return !bookString.includes(str.slice(1).replace(/["']/g, '').replace(/[$]/g, '"').toLowerCase())
              } else {
                return bookString.includes(str.replace(/["']/g, '').replace(/[$]/g, '"').toLowerCase())
              }
            })
          } else {
            return bookString.includes(condition.slice(1).replace(/["']/g, '').replace(/[$]/g, '"').toLowerCase())
          }
        })
      }
      this.displayBookList = _.filter(this.bookList, (book)=>{
        const bookString = JSON.stringify(
          _.assign(
            {},
            _.pick(book, ['title', 'title_jpn', 'status', 'category', 'filepath', 'url', 'pageDiff']),
            {
              tags: _.map(book.tags, (tags, cat)=>{
                const letter = this.cat2letter[cat] ? this.cat2letter[cat] : cat
                return _.map(tags, tag=>`${letter}:${tag}`).concat(_.map(tags, tag=>`${cat}:${tag}`))
              })
            }
          )
        ).toLowerCase()
        return checkCondition(bookString)
      })
      if (!this.sortValue) this.sortValue = 'addDescend'
      this.handleSortChange(this.sortValue, this.displayBookList)
      if (this.currentUI() === 'edit-group-tag') {
        this.selectBookList = []
        this.displayBookList.forEach(book => book.selected = false)
      }
    },
    searchFromTag (tag, cat) {
      this.dialogVisibleBookDetail = false
      this.drawerVisibleCollection = false
      if (cat) {
        let letter = this.cat2letter[cat] ? this.cat2letter[cat] : cat
        this.searchString = `${letter}:"${tag}"$`
      } else {
        this.searchString = `"${tag}"$`
      }
      this.searchBook()
    },
    handleClickTagInRandom (tag) {
      this.searchString = tag.value
      this.searchBook()
    },
    reloadRandomTags () {
      this.randomTags = _.sampleSize(this.tagList, 24)
    },
    // home main
    openBookDetail (book) {
      this.bookDetail = book
      this.dialogVisibleBookDetail = true
      this.comments = []
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
    openFolderTree () {
      this.sideVisibleFolderTree = !this.sideVisibleFolderTree
      if (this.sideVisibleFolderTree && _.isEmpty(this.folderTreeData)) {
        this.geneFolderTree()
      }
    },
    geneFolderTree () {
      let bookList = _.filter(_.cloneDeep(this.bookList), book=>!book.isCollection)
      ipcRenderer.invoke('get-folder-tree', bookList)
      .then(data=>{
        this.folderTreeData = data
      })
    },
    async selectFolderTreeNode (selectNode) {
      let clickLibraryPath = this.setting.library + this.pathSep + selectNode.folderPath
      this.bookList.map(book=>book.folderHide = !book.filepath.startsWith(clickLibraryPath))
      this.chunkList()
    },
    handleNodeExpand (nodeObject) {
      this.expandNodes.push(nodeObject.folderPath)
      this.expandNodes = [...new Set(this.expandNodes)]
      localStorage.setItem('expandNodes', JSON.stringify(this.expandNodes))
    },
    handleNodeCollapse (nodeObject) {
      this.expandNodes = _.filter(this.expandNodes, path=>path !== nodeObject.folderPath)
      localStorage.setItem('expandNodes', JSON.stringify(this.expandNodes))
    },
    filterTreeNode (val, data) {
      if (!val) return true
      return data.label.includes(val)
    },

    // tag analysis and recommand search
    handleSearchTags (string) {
      this.searchString = string
      this.searchBook()
    },

    // collection view function
    loadCollectionList () {
      ipcRenderer.invoke('load-collection-list')
      .then(res => {
        this.collectionList = res
        _.forEach(this.collectionList, collection => {
          let collectBook = _.compact(collection.list.map(hash_id => {
            return _.filter(this.bookList, book => book.id === hash_id || book.hash === hash_id)
          }))
          collectBook = _.flatten(collectBook)
          collection.list = [...new Set(collectBook.map(book => book.hash))]
          collectBook.map(book => book.collectionHide = true)
          let date = _.last(_.compact(_.sortBy(collectBook.map(book => book.date))))
          let posted = _.last(_.compact(_.sortBy(collectBook.map(book => book.posted))))
          let rating = _.last(_.compact(_.sortBy(collectBook.map(book => book.rating))))
          let mtime = _.last(_.compact(_.sortBy(collectBook.map(book => book.mtime))))
          let mark = _.some(collectBook, 'mark')
          let tags = _.mergeWith({}, ...collectBook.map(book => book.tags), (obj, src) => {
            if (_.isArray(obj) && _.isArray(src)) {
              return [...new Set(obj.concat(src))]
            } else {
              return src
            }
          })
          let title_jpn = collectBook.map(book => book.title+book.title_jpn).join(',')
          let filepath = collectBook.map(book => book.filepath).join(',')
          let category = [...new Set(collectBook.map(book => book.category))].join(',')
          let status = [...new Set(collectBook.map(book => book.status))].join(',')
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
        this.handleSortChange(this.sortValue, this.bookList)
      })
    },
    enterEditCollectionView () {
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
    editCollection () {
      if (_.has(this.selectCollectionObject, 'title')) {
        ElMessageBox.prompt(this.$t('c.inputCollectionName'), this.$t('m.editCollection'), {
          inputValue: this.selectCollectionObject.title,
          cancelButtonText: this.$t('c.deleteCollection'),
          distinguishCancelAndClose: true
        })
        .then(({ value }) => {
          this.selectCollectionObject.title = value
        })
        .catch((action) => {
          if (action === 'cancel') {
            this.deleteCollection()
          } else {
            this.printMessage('info', this.$t('c.canceled'))
          }
        })
      }
    },
    deleteCollection () {
      this.collectionList = _.filter(this.collectionList, c => c.id !== this.selectCollection)
      this.selectCollection = undefined
      this.selectCollectionObject = { list: [] }
      _.forEach(this.displayBookList, book => {
        book.collected = false
      })
    },
    saveCollection () {
      this.collectionList = _.filter(this.collectionList, c=>!_.isEmpty(_.compact(c.list)))
      ipcRenderer.invoke('save-collection-list', _.cloneDeep(this.collectionList))
      .then(()=>{
        this.loadBookList(false)
        this.selectCollection = undefined,
        this.selectCollectionObject = { list: [] }
      })
      this.editCollectionView = false
    },
    handleSelectCollectionChange (val) {
      this.selectCollectionObject = _.find(this.collectionList, {id: val})
      _.forEach(this.displayBookList, book => {
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
      let findBooks = _.filter(this.displayBookList, b => b.id === book.hash || b.hash === book.hash)
      if (book.collected) {
        findBooks.forEach(book => book.collected = false)
        this.selectCollectionObject.list = _.filter(this.selectCollectionObject.list, hash => hash !== book.id && hash !== book.hash)
      } else {
        findBooks.forEach(book => book.collected = true)
        this.selectCollectionObject.list.push(book.hash)
      }
    },
    openCollection (collection) {
      this.drawerVisibleCollection = true
      this.openCollectionBookList = _.compact(_.flatten(collection.list.map(hash_id=>{
        return _.filter(this.bookList, book => book.id === hash_id || book.hash === hash_id)
      })))
      this.openCollectionTitle = collection.title
      this.selectCollection = collection.id
    },
    editCurrentCollection () {
      this.drawerVisibleCollection = false
      this.editCollectionView = true
      this.handleSelectCollectionChange(this.selectCollection)
    },

    // group edit tags viewer
    enterEditTagView () {
      this.editTagView = true
      this.selectBookList = []
      this.displayBookList.forEach(book => book.selected = false)
    },
    handleSelectBookBadge (book) {
      if (book.selected) {
        book.selected = false
        this.selectBookList = _.filter(this.selectBookList, b => b.id !== book.id)
      } else {
        book.selected = true
        this.selectBookList.push(book.id)
      }
    },
    handleMouseDownForSelection (e) {
      this.isSelecting = true;
      this.startX = e.pageX
      this.startY = e.pageY
      this.$refs.selectionBox.style.left = `${this.startX}px`
      this.$refs.selectionBox.style.top = `${this.startY}px`
      this.$refs.selectionBox.style.width = `0px`
      this.$refs.selectionBox.style.height = `0px`
      this.$refs.selectionBox.style.display = 'block'
      e.preventDefault()
    },
    handleMouseMoveForSelection (e) {
      if (this.isSelecting) {
        let endX = e.pageX
        let endY = e.pageY
        let left = Math.min(endX, this.startX)
        let top = Math.min(endY, this.startY)
        let width = Math.abs(endX - this.startX)
        let height = Math.abs(endY - this.startY)
        this.$refs.selectionBox.style.left = `${left}px`
        this.$refs.selectionBox.style.top = `${top}px`
        this.$refs.selectionBox.style.width = `${width}px`
        this.$refs.selectionBox.style.height = `${height}px`
      }
    },
    handleMouseUpForSelection (view) {
      const rect = this.$refs.selectionBox.getBoundingClientRect()
      if (rect.width > 10 || rect.height > 10) {
        document.querySelectorAll('.selectable-card').forEach(item => {
          const itemRect = item.getBoundingClientRect()
          if (
            itemRect.left < rect.right &&
            itemRect.right > rect.left &&
            itemRect.top < rect.bottom &&
            itemRect.bottom > rect.top
          ) {
            let book = this.chunkDisplayBookList.find(book => book.id === item.id)
            if (view === 'tag') {
              if (book.selected) {
                book.selected = false
                this.selectBookList = _.filter(this.selectBookList, id => id !== item.id)
              } else {
                book.selected = true
                this.selectBookList.push(item.id)
              }
            } else if (view === 'collect') {
              let findBooks = _.filter(this.displayBookList, b => b.id === book.hash || b.hash === book.hash)
              if (book.collected) {
                findBooks.forEach(book => book.collected = false)
                this.selectCollectionObject.list = _.filter(this.selectCollectionObject.list, hash => hash !== book.id && hash !== book.hash)
              } else {
                findBooks.forEach(book => book.collected = true)
                this.selectCollectionObject.list.push(book.hash)
              }
            }
          }
        })
      }
      this.isSelecting = false
      this.$refs.selectionBox.style.display = 'none'
    },
    selectAllForGroupTag () {
      this.displayBookList.forEach(book => {
        if (!book.isCollection && !book.folderHide) {
          book.selected = true
          this.selectBookList.push(book.id)
        }
      })
    },
    unselectAllForGroupTag () {
      this.displayBookList.forEach(book => {
        book.selected = false
      })
      this.selectBookList = []
    },
    previewManga (book) {
      this.$refs.InternalViewerRef.showThumbnail = true
      this.$refs.InternalViewerRef.viewManga(book, '83%')
    },
    resolveGroupTagSelected () {
      const letter2cat = _.invert(this.cat2letter)
      let tags = this.groupTagSelected.map(tag => {
        const match = /([\w\d一-龟]+):"([- ._\w\d一-龟]+)"\$/.exec(tag)
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
    },
    async addTagToGroup () {
      try {
        this.updateTagsLoading = true
        const tags = this.resolveGroupTagSelected()
        for (const id of this.selectBookList) {
          let book = _.find(this.displayBookList, {id})
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
          await this.saveBook(book)
        }
        this.printMessage('success', this.$t('c.addGroupTagSuccess'))
        this.updateTagsLoading = false
      } catch (e) {
        console.error(e)
        this.printMessage('error', this.$t('c.groupTagError'))
        this.updateTagsLoading = false
      }
    },
    async removeTagToGroup () {
      try {
        this.updateTagsLoading = true
        const tags = this.resolveGroupTagSelected()
        for (const id of this.selectBookList) {
          let book = _.find(this.displayBookList, {id})
          for (const { category, tag } of tags) {
            if (_.has(book.tags, category)) {
              book.tags[category] = _.filter(book.tags[category], t=>t !== tag)
            }
          }
          await this.saveBook(book)
        }
        this.printMessage('success', this.$t('c.removeGroupTagSuccess'))
        this.updateTagsLoading = false
      } catch (e) {
        console.error(e)
        this.printMessage('error', this.$t('c.groupTagError'))
        this.updateTagsLoading = false
      }
    },
    async applyCategory () {
      try {
        this.updateTagsLoading = true
        for (const id of this.selectBookList) {
          let book = _.find(this.displayBookList, {id})
          book.category = this.categorySelected
          await this.saveBook(book)
        }
        this.printMessage('success', this.$t('c.applied'))
        this.updateTagsLoading = false
      } catch (e) {
        console.error(e)
        this.printMessage('error', this.$t('c.applyError'))
        this.updateTagsLoading = false
      }
    },
    async applyStatus () {
      try {
        this.updateTagsLoading = true
        for (const id of this.selectBookList) {
          let book = _.find(this.displayBookList, {id})
          book.status = this.statusSelected
          await this.saveBook(book)
        }
        this.printMessage('success', this.$t('c.applied'))
        this.updateTagsLoading = false
      } catch (e) {
        console.error(e)
        this.printMessage('error', this.$t('c.applyError'))
        this.updateTagsLoading = false
      }
    },
    async groupGetMetadata () {
      try {
        this.updateTagsLoading = true
        const bookList = _.compact(this.selectBookList.map(id => _.find(this.displayBookList, {id})))
        await this.getBooksMetadata(bookList, this.setting.requireGap || 10000)
        this.updateTagsLoading = false
      } catch (error) {
        console.error(error)
        this.updateTagsLoading = false
      }
    },
    groupDeleteLocalBook () {
      ElMessageBox.confirm(
        this.$t('c.confirmDelete'),
        '',
        {}
      )
      .then(async () => {
        this.updateTagsLoading = true
        for (const id of this.selectBookList) {
          const book = _.find(this.displayBookList, {id})
          if (book) await this.deleteBook(book)
        }
      })
      .finally(() => {
        this.unselectAllForGroupTag()
        this.updateTagsLoading = false
      })
    },
    async groupRescanBook () {
      try {
        this.updateTagsLoading = true
        for (const id of this.selectBookList) {
          const book = _.find(this.displayBookList, {id})
          if (book) {
            await ipcRenderer.invoke('patch-local-metadata-by-book', _.cloneDeep(book))
            .then((bookInfo) => {
              _.assign(book, bookInfo)
              this.saveBook(book)
            })
          }
        }
        this.printMessage('success', this.$t('c.rescanSuccess'))
        this.updateTagsLoading = false
      } catch (error) {
        console.error(error)
        this.updateTagsLoading = false
      }
    },
    async groupTriggerHiddenBook (val) {
      try {
        this.updateTagsLoading = true
        for (const id of this.selectBookList) {
          const book = _.find(this.displayBookList, {id})
          if (book) {
            book.hiddenBook = val
            await this.saveBook(book)
          }
        }
        this.updateTagsLoading = false
      } catch (error) {
        console.error(error)
        this.updateTagsLoading = false
      }
    },

    // detail view function
    openUrl (url) {
      ipcRenderer.invoke('open-url', url)
    },
    async triggerHiddenBook (book) {
      book.hiddenBook = !book.hiddenBook
      await this.saveBook(book)
    },
    showFile(filepath) {
      ipcRenderer.invoke('show-file', filepath)
    },
    openLocalBook (book) {
      this.bookDetail = book
      ipcRenderer.invoke('open-local-book', this.bookDetail.filepath)
    },
    async rescanBook (book) {
      await ipcRenderer.invoke('patch-local-metadata-by-book', _.cloneDeep(book))
      .then((bookInfo) => {
        _.assign(book, bookInfo)
        this.saveBook(book)
        this.printMessage('success', this.$t('c.rescanSuccess'))
      })
    },
    async deleteBook (book) {
      await ipcRenderer.invoke('delete-local-book', book.filepath)
      .finally(()=>{
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
          let findBookInBookList = _.findIndex(this.bookList, b=>b.filepath === book.filepath)
          this.bookList.splice(findBookInBookList, 1)
          this.displayBookList = _.filter(this.displayBookList, b=>b.filepath !== book.filepath)
          this.chunkDisplayBookList = this.customChunk(this.displayBookList, this.setting.pageSize, this.currentPage - 1)
        }
      })
    },
    deleteLocalBook (book) {
      if (this.setting.skipDeleteConfirm) {
        this.deleteBook(book)
      } else {
        ElMessageBox.confirm(
          this.$t('c.confirmDelete'),
          '',
          {}
        )
        .then(this.deleteBook(book))
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
        this.comments = []
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
                tagArray.forEach(tag=>tempTagGroup[tagCat].add(tag))
              } else {
                tempTagGroup[tagCat] = new Set(tagArray)
              }
            }
          })
        })
        let showTranslation = this.setting.showTranslation
        _.forIn(tempTagGroup, (tagSet, tagCat)=>{
          tempTagGroup[tagCat] = [...tagSet].sort().map(tag=>({
            value: tag,
            label: `${showTranslation ? (this.resolvedTranslation[tag]?.name || tag ) + ' || ' : ''}${tag}`
          }))
        })
        this.tagGroup = tempTagGroup
      } else {
        this.saveBookTags(this.bookDetail)
      }
    },
    saveBookTags (book) {
      _.forIn(book.tags, (tagarr, tagCat)=>{
        if (_.isEmpty(tagarr)) {
          delete book.tags[tagCat]
        }
      })
      this.saveBook(book)
    },
    addTagCat () {
      ElMessageBox.prompt(this.$t('c.inputCategoryName'), this.$t('m.addCategory'), {
        inputPattern: /^[\w\d一-龟]+$/,
        inputErrorMessage: this.$t('c.categoryNameError')
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
    selectBook (book) {
      this.bookDetail = book
    },
    handleStopReadManga () {
      if (this.setting.keepReadingProgress) this.$refs.InternalViewerRef.saveReadingProgress()
      ipcRenderer.invoke('release-sendimagelock')
      ipcRenderer.invoke('update-window-title')
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
          this.comments = []
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
        this.comments = []
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
        this.bookList = res
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
        default:
          this.locale = en
          this.$i18n.locale = 'en-US'
          break
      }
    },

    // import/export
    importMetadataFromSqlite () {
      ipcRenderer.invoke('import-sqlite', _.cloneDeep(this.bookList))
      .then(result=>{
        let {success, bookList} = result
        if (success) {
          this.bookList = bookList
          this.printMessage('success', this.$t('c.importMessage'))
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
            label: this.$t('m.deleteFile'),
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
          {
            label: this.$t('c.copyTitleAndLinkToClipboard'),
            onClick: () => {
              ipcRenderer.invoke('copy-text-to-clipboard', `${book.title_jpn || book.title}\n${book.url}\n`)
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

.text-red
  color: red !important

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


.fullscreen-button
  position: absolute
  top: 39px
  left: calc(50vw - 22px)
  border-width: 0
  opacity: 0
  z-index: 3000!important
  .el-icon
    width: 20px
    svg
      height: 20px
      width: 20px
.fullscreen-button:hover
  opacity: 1
  background-color: #ffffff66

.search-input,
.function-button
  width: 100%
.autocomplete-value
  margin-left: 2em
  float: right

.side-tree-modal
  background-color: var(--el-mask-color-extra-light)
  .el-drawer__body
    padding-top: 0
  .folder-search
    margin-bottom: 8px

.pagination-bar
  margin: 4px 0
  justify-content: center

.book-tag-area
  width: 100%
  margin-top: 14px
  #random-tags
    margin: 0 16px
    overflow-x: hidden

.book-card-area
  overflow-x: auto
  justify-content: center
  margin-top: 8px
  .book-collect-view, .book-collection, .book-tag-edit-view, .book-tag-edit-operation
    height: calc(100vh - 96px)
    overflow-x: auto
    padding-top: 4px
  .book-card-list
    height: calc(100vh - 134px)
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
  margin: 0 4px
.collection-edit-button
  margin-bottom: 2px

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

#selection-box
  position: absolute
  border: 2px dashed #00f
  display: none
  pointer-events: none
  user-select: none

.book-tag-edit-operation
  .el-select-v2
    width: 100%
  .book-tag-edit-buttons
    width: 100%
    margin-top: 10px

.el-dialog.is-fullscreen.dialog-detail
  .el-dialog__header
    .el-dialog__headerbtn
      margin: 8px 16px 0 0
      .el-icon
        width: 32px
        svg
          height: 32px
          width: 32px


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

// search-input sort-select
.el-autocomplete-suggestion__wrap, .el-select-dropdown__wrap
  max-height: 490px!important

.mx-menu-ghost-host
  z-index: 4000!important
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