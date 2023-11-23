<template>
  <el-drawer v-model="drawerVisibleViewer"
    direction="ttb"
    size="100%"
    :with-header="false"
    destroy-on-close
    @close="$emit('handleStopReadManga')"
    class="viewer-drawer"
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
        @focus="getCurrentImageId"
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
        @change="saveImageStyleFit"
        class="viewer-image-fit"
        ref="viewer-image-fit"
        v-show="imageStyleType !== 'scroll' && showThumbnail === false"
      >
        <el-option value="width" :label="$t('m.fitWidth')" />
        <el-option value="height" :label="$t('m.fitHeight')" />
        <el-option value="window" :label="$t('m.fitWindow')" />
      </el-select>
      <el-select
        v-model="viewerImageWidth"
        size="small"
        class="viewer-image-width"
        ref="viewer-image-width"
        v-show="imageStyleType === 'scroll' && showThumbnail === false"
      >
        <el-option :value="0.5" label="50vw" />
        <el-option :value="0.75" label="75vw" />
        <el-option :value="0.9" label="90vw" />
        <el-option :value="20" label="20%" />
        <el-option :value="50" label="50%" />
        <el-option :value="75" label="75%" />
        <el-option :value="100" label="100%" />
      </el-select>
    </div>
    <div
      class="drawer-image-content"
      @click="handleViewerAreaClick"
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
          <div class="viewer-image-frame viewer-image-frame-scroll" :id="image.id" :style="returnImageStyle(image)">
            <img
              :src="`${image.filepath}?id=${image.id}`"
              class="viewer-image"
              :style="{height: returnImageStyle(image).height}"
              @contextmenu="onMangaImageContextMenu($event, image.filepath)"
            />
            <div class="viewer-image-bar" @mousedown="initResize(image.id, image.width)"></div>
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
      <el-button size="large" type="success" plain @click="toNextManga(-1)">{{$t('m.previousManga')}}</el-button>
      <el-button size="large" type="success" plain @click="toNextMangaRandom">{{$t('m.nextMangaRandom')}}</el-button>
      <el-button size="large" type="success" plain @click="toNextManga(1)">{{$t('m.nextManga')}}</el-button>
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
            :style="{width: `calc((100vw - 50px) / ${setting.thumbnailColumn || 10} - 16px)`}"
            @click="handleClickThumbnail(image.id)"
            @contextmenu="onMangaImageContextMenu($event, image.filepath)"
          />
          <div class="viewer-thunmnail-page">{{chunkIndex * (setting.thumbnailColumn || 10) + index + 1}} of {{viewerImageList.length}}</div>
        </div>
      </el-space>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps(['setting', 'keyMap'])

const emit = defineEmits([
  'handleStopReadManga',
  'toNextManga'
])
const drawerVisibleViewer = ref(false)
const showThumbnail = ref(false)
const viewerImageWidth = ref(0.9)
const imageStyleType = ref('scroll')
const imageStyleFit = ref('window')
const viewerReadingProgress = ref([])
const insertEmptyPage = ref(false)
const insertEmptyPageIndex = ref(1)
const viewerImageList = ref([])
const viewerImageListDouble = computed(() => {
  if (imageStyleType.value === 'double') {
    let result = []
    let frame = {page: [], pageNumber: []}
    let pageNumber = 0
    for (let image of viewerImageList.value) {
      pageNumber += 1
      if (image.width > image.height) {
        if (frame.page.length > 0) {
          result.push(_.clone(frame))
          frame = {page: [], pageNumber: []}
        }
        result.push({page: [image], pageNumber: [pageNumber]})
      } else {
        frame.page.push(image)
        frame.pageNumber.push(pageNumber)
        if ((insertEmptyPage.value && result.length === this.insertEmptyPageIndex) || frame.page.length >= 2) {
          result.push(_.clone(frame))
          frame = {page: [], pageNumber: []}
        }
      }
    }
    if (frame.page.length > 0) result.push(_.clone(frame))
    return result
  } else {
    return []
  }
})

onMounted(()=>{
  viewerImageWidth.value = +localStorage.getItem('viewerImageWidth') || 0.9
  imageStyleType.value = localStorage.getItem('imageStyleType') || 'scroll'
  imageStyleFit.value = localStorage.getItem('imageStyleFit') || 'window'
  viewerReadingProgress.value = JSON.parse(localStorage.getItem('viewerReadingProgress')) || []
})

let _currentImageIndex = 0
const currentImageIndex = computed({
  get () {
    return _currentImageIndex
  },
  set (val) {
    let listLength
    if (this.imageStyleType === 'single') {
      listLength = viewerImageList.value.length
    } else {
      listLength = viewerImageListDouble.value.length
    }
    if (Number.isInteger(val)) {
      if (val < 0) {
        _currentImageIndex = 0
      } else if (val > listLength - 1 && listLength >= 1) {
        _currentImageIndex = listLength - 1
        if (props.setting.autoNextManga) emit('toNextManga', 1)
      } else {
        _currentImageIndex = val
      }
    }
  }
})

const handleClickThumbnail = (id) => {
  showThumbnail.value = false
  let scrollTopValue = 0
  if (imageStyleType.value === 'scroll') {
    _.forEach(this.viewerImageList, (image)=>{
      if (image.id === id) {
        this.$nextTick(()=>document.querySelector('.viewer-drawer .el-drawer__body').scrollTop = scrollTopValue)
        return false
      }
      // 28 is the height of .viewer-image-page
      if (this.setting.hidePageNumber) {
        scrollTopValue += parseFloat(this.returnImageStyle(image).height)
      } else {
        scrollTopValue += parseFloat(this.returnImageStyle(image).height) + 28
      }
    })
  } else if (this.imageStyleType === 'single') {
    this.currentImageIndex = _.findIndex(this.viewerImageList, {id: id})
  } else if (this.imageStyleType === 'double') {
    _.forEach(this.viewerImageListDouble, (imageGroup, index)=>{
      if (_.find(imageGroup.page, {id: id})) {
        this.currentImageIndex = index
        return false
      }
    })
  }
}

const handleViewerAreaClick = (event) => {
  if (showThumbnail.value === false) {
    if (imageStyleType.value === 'single' || imageStyleType.value === 'double') {
      let click
      if (props.setting.reverseLeftRight) {
        ;({ click } = props.keyMap.reverse)
      } else {
        ;({ click } = props.keyMap.normal)
      }
      if(event.clientX > window.innerWidth / 2) {
        currentImageIndex.value += click
        document.querySelector('.viewer-drawer .el-drawer__body').scrollTop = 0
      } else {
        currentImageIndex.value += -click
        document.querySelector('.viewer-drawer .el-drawer__body').scrollTop = 0
      }
    }
  }
}

defineExpose({
  drawerVisibleViewer,
  showThumbnail,
  imageStyleType,
  insertEmptyPage,
  insertEmptyPageIndex
})
</script>