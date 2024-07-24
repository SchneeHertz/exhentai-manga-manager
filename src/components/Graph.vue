<template>
  <el-dialog v-model="dialogVisibleGraph" fullscreen destroy-on-close>
    <template #header><p>{{$t('m.tagAnalysis')}}</p></template>
    <el-row>
      <el-col :span="12" class="graph-frame"><canvas id="graph-artist"></canvas></el-col>
      <el-col :span="12" class="graph-frame"><canvas id="graph-mtime"></canvas></el-col>
      <el-col :span="24" class="graph-frame"><canvas id="graph-tag-count"></canvas></el-col>
    </el-row>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import Chart from 'chart.js/auto'

const { t } = useI18n()

const props = defineProps({
  bookList: {
    type: Array,
    default: () => []
  },
  setting: Object,
  resolvedTranslation: Object
})

const emit = defineEmits(['search'])

const dialogVisibleGraph = ref(false)

const resolveTags = (tags) => {
  if (props.setting.showTranslation) return tags.map(tag => props.resolvedTranslation[tag]?.name || tag)
  return tags
}

const displayTagGraph = async () => {
  dialogVisibleGraph.value = true
  await nextTick()
  const bookInfos = props.bookList.map(book => ({
    artists: book?.tags?.artist ? [...book.tags.artist] : [],
    male: book?.tags?.male ? [...book.tags.male] : [],
    female: book?.tags.female ? [...book.tags.female] : [],
    mtime: `${new Date(book.mtime).getFullYear()}-${(new Date(book.mtime).getMonth() + 1).toString().padStart(2, 0)}`,
  }))

  const artists = _(bookInfos.map(book => book.artists)).flatten().countBy().toPairs().sortBy(p => -p[1]).slice(0, 20).value()
  const chartArtist = new Chart(
    document.getElementById('graph-artist'),
    {
      type: 'bar',
      options: {
        layout: {
          padding: 10
        },
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
        layout: {
          padding: 10
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

  const maleTags = _(bookInfos.map(book => book.male)).flatten().countBy().toPairs().sortBy(p => -p[1]).slice(0, 10).value()
  const femaleTags = _(bookInfos.map(book => book.female)).flatten().countBy().toPairs().sortBy(p => -p[1]).slice(0, 10).value()
  let tagData = maleTags.map(p => {p[2] = 'rgba(54, 162, 235, 0.2)'; p[3] = 'rgb(54, 162, 235)'; return p})
    .concat(femaleTags.map(p => {p[2] = 'rgba(255, 99, 132, 0.2)'; p[3] = 'rgb(255, 99, 132)'; return p}))
  tagData = _.sortBy(tagData, p => -p[1])
  const chartTagCount = new Chart(
    document.getElementById('graph-tag-count'),
    {
      type: 'bar',
      options: {
        maintainAspectRatio: false,
        layout: {
          padding: 10
        },
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