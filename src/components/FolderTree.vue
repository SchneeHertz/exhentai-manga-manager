<template>
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
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

import { storeToRefs } from 'pinia'
import { useAppStore } from '../pinia.js'
const appStore = useAppStore()
const { setting, bookList, pathSep, folderTreeData } = storeToRefs(appStore)

const emit = defineEmits(['chunkList'])

const sideVisibleFolderTree = ref(false)

const openFolderTree = () => {
  sideVisibleFolderTree.value = !sideVisibleFolderTree.value
  if (sideVisibleFolderTree.value && _.isEmpty(folderTreeData.value)) {
    geneFolderTree()
  }
}
const geneFolderTree = async () => {
  const bList = _.filter(_.cloneDeep(bookList.value), book => !book.isCollection)
  folderTreeData.value = await ipcRenderer.invoke('get-folder-tree', bList)
}
const selectFolderTreeNode = async (selectNode) => {
  if (selectNode.folderPath) {
    const clickLibraryPath = setting.value.library + pathSep.value + selectNode.folderPath + pathSep.value
    bookList.value.map(book => book.folderHide = !book.filepath.startsWith(clickLibraryPath))
  } else {
    bookList.value.map(book => book.folderHide = false)
  }
  emit('chunkList')
}

const expandNodes = ref([])
onMounted(() => {
  expandNodes.value = JSON.parse(localStorage.getItem('expandNodes')) || []
})
const handleNodeExpand = (nodeObject) => {
  let expandNodes = JSON.parse(localStorage.getItem('expandNodes')) || []
  expandNodes.push(nodeObject.folderPath)
  expandNodes = [...new Set(expandNodes)]
  localStorage.setItem('expandNodes', JSON.stringify(expandNodes))
}
const handleNodeCollapse = (nodeObject) => {
  let expandNodes = JSON.parse(localStorage.getItem('expandNodes')) || []
  expandNodes = expandNodes.filter(path => !path.includes(nodeObject.folderPath))
  localStorage.setItem('expandNodes', JSON.stringify(expandNodes))
}

const treeFilterText = ref('')
const treeRef = ref(null)
watch(treeFilterText, (value) => {
  treeRef.value.filter(value)
})
const filterTreeNode = (val, data) => {
  if (!val) return true
  return data.label.includes(val)
}

const resetSelect = () => {
  treeRef.value && treeRef.value.setCurrentKey('')
}

defineExpose({
  sideVisibleFolderTree,
  openFolderTree,
  geneFolderTree,
  resetSelect
})
</script>

<style lang="stylus">
.side-tree-modal
  background-color: var(--el-mask-color-extra-light)
  .el-drawer__body
    padding-top: 0
  .folder-search
    margin-bottom: 8px
</style>