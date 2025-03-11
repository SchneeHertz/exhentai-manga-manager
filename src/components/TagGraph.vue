<template>
  <el-dialog v-model="dialogVisibleGraph" fullscreen destroy-on-close>
    <template #header><p>{{$t('m.tagAnalysis')}}</p></template>
    <el-row>
      <el-col :span="12" class="graph-frame"><canvas id="graph-artist"></canvas></el-col>
      <el-col :span="12" class="graph-frame"><canvas id="graph-mtime"></canvas></el-col>
      <el-col :span="24" class="graph-frame"><canvas id="graph-tag-count"></canvas></el-col>
    </el-row>
    <TagList
      ref="tagListRef"
      :title="tagListTitle"
      @search="handleSearch"
    />
  </el-dialog>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import Chart from 'chart.js/auto'
import TagList from './TagList.vue'

import { storeToRefs } from 'pinia'
import { useAppStore } from '../pinia.js'
const appStore = useAppStore()
const { setting, resolvedTranslation } = storeToRefs(appStore)

const { t } = useI18n()

const emit = defineEmits(['search'])

const dialogVisibleGraph = ref(false)
const tagListRef = ref(null)
const tagListTitle = ref('')

// 处理搜索事件
const handleSearch = (query) => {
  emit('search', query)
  dialogVisibleGraph.value = false
}

const resolveTags = (tags) => {
  if (setting.value.showTranslation) return tags.map(tag => resolvedTranslation.value[tag]?.name || tag)
  return tags
}

const displayTagGraph = async () => {
  dialogVisibleGraph.value = true
  await nextTick()

  // 使用TagList组件获取处理后的书籍信息
  const bookInfos = tagListRef.value.getBookInfos()

  const artists = _(bookInfos.map(book => book.artists)).flatten().countBy().toPairs().sortBy(p => -p[1]).slice(0, 20).value()
  const chartArtist = new Chart(
    document.getElementById('graph-artist'),
    {
      type: 'bar',
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        },
        layout: {
          padding: 10
        },
        onClick: (e, activeEls) => {
          if (activeEls.length === 0) return
          const artist = artists[activeEls[0].index][0]
          emit('search', `a:"${artist}"$`)
          dialogVisibleGraph.value = false
        },
        plugins: {
          legend: {
            onClick: () => {
              tagListTitle.value = t('c.artist')
              tagListRef.value.showArtistTags()
            }
          }
        }
      },
      data: {
        labels: resolveTags(artists.map(p => p[0])),
        datasets: [{
          label: t('c.artist'),
          data: artists.map(p => p[1]),
          backgroundColor: 'rgba(255, 205, 86, 0.2)',
          borderColor: 'rgb(255, 205, 86)',
          borderWidth: 1
        }]
      }
    }
  )

  const mtime = _(bookInfos.map(book => book.mtime)).countBy().toPairs().sortBy(p => p[0]).value()
  const chartMtime = new Chart(
    document.getElementById('graph-mtime'),
    {
      type: 'line',
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        },
        layout: {
          padding: 10
        },
        onClick: (e, activeEls) => {
          if (activeEls.length === 0) return
          if (activeEls[0].index < mtime.length - 1) {
            emit('search', `:mtime>${mtime[activeEls[0].index][0]} :mtime<${mtime[activeEls[0].index + 1][0]}`)
          } else {
            emit('search', `:mtime>${mtime[activeEls[0].index][0]}`)
          }
          dialogVisibleGraph.value = false
        },
      },
      data: {
        labels: mtime.map(p => p[0]),
        datasets: [{
          label: t('m.mtime'),
          data: mtime.map(p => p[1]),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1,
          fill: 'origin',
        }]
      }
    }
  )

  const maleTags = _(bookInfos.map(book => book.male)).flatten().countBy().toPairs().sortBy(p => -p[1]).slice(0, 24).value()
  const femaleTags = _(bookInfos.map(book => book.female)).flatten().countBy().toPairs().sortBy(p => -p[1]).slice(0, 24).value()
  let tagData = maleTags.map(p => {p[2] = 'rgba(54, 162, 235, 0.2)'; p[3] = 'rgb(54, 162, 235)'; return p})
    .concat(femaleTags.map(p => {p[2] = 'rgba(255, 99, 132, 0.2)'; p[3] = 'rgb(255, 99, 132)'; return p}))
  tagData = _.sortBy(tagData, p => -p[1]).slice(0, 24)
  const chartTagCount = new Chart(
    document.getElementById('graph-tag-count'),
    {
      type: 'bar',
      options: {
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        layout: {
          padding: 10
        },
        onClick: (e, activeEls) => {
          if (activeEls.length === 0) return
          const tag = tagData[activeEls[0].index]
          if (tag[3] === 'rgb(54, 162, 235)') {
            emit('search', `m:"${tag[0]}"$`)
          } else {
            emit('search', `f:"${tag[0]}"$`)
          }
          dialogVisibleGraph.value = false
        },
        plugins: {
          legend: {
            onClick: () => {
              tagListTitle.value = t('m.tag')
              tagListRef.value.showMixedTags()
            }
          }
        }
      },
      data: {
        labels: resolveTags(tagData.map(p => p[0])),
        datasets: [
          {
            label: t('m.tag'),
            data: tagData.map(p => p[1]),
            backgroundColor: tagData.map(p => p[2]),
            borderColor: tagData.map(p => p[3]),
            borderWidth: 1
          },
        ]
      }
    }
  )
}

defineExpose({
  dialogVisibleGraph,
  displayTagGraph
})

</script>

<style lang="stylus">
.graph-frame, .graph-frame, .graph-frame
  height: calc(50vh - 52px)
</style>