<template>
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
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { nanoid } from 'nanoid'
import G6 from '@antv/g6'

const props = defineProps({
  bookList: Array,
  cat2letter: Object,
  resolvedTranslation: Object
})

const emit = defineEmits(['search'])

const dialogVisibleGraph = ref(false)
let tagNodeData = []

const displayTagGraph = () => {
  let nodes = []
  _.forEach(props.bookList, book=>{
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
  let maxTagCount = _.max(_.values(nodesObject))
  const colors = ['#BDD2FD', '#BDEFDB', '#C2C8D5', '#FBE5A2', '#F6C3B7', '#B6E3F5', '#D3C6EA', '#FFD8B8', '#AAD8D8', '#FFD6E7']
  let tempNodeData = []
  _.forIn(nodesObject, (count, label)=>{
    let labelArray = _.split(label, '##')
    try {
      let letter = props.cat2letter[labelArray[0]] ? props.cat2letter[labelArray[0]] : labelArray[0]
      tempNodeData.push({
        id: nanoid(),
        count,
        size: Math.ceil(( count / maxTagCount * 14 ) ** 2 + 70),
        oriSize: Math.ceil(( count / maxTagCount * 14 ) ** 2 + 70),
        name: `${letter}:"${labelArray[1]}$"`,
        shortName: `${letter}:"${labelArray[1]}"`,
        oriLabel: label,
        label: `${props.resolvedTranslation[labelArray[0]]?.name || labelArray[0]}:${props.resolvedTranslation[labelArray[1]]?.name || labelArray[1]}`,
        style:{fill: _.sample(colors)}
      })
    } catch {}
  })
  tagNodeData = _.takeRight(_.sortBy(tempNodeData, 'count'), 32)
  tagNodeData = _.shuffle(tagNodeData)
  let edges = []
  let tempTagGroup = []
  _.forEach(props.bookList, book=>{
    let tags = _.pick(book?.tags, ['male', 'female', 'mixed', 'other'])
    let tempTags = []
    _.forIn(tags, (list, cat)=>{
      _.forEach(list, tag=>{
        let foundNode = _.find(tagNodeData, {oriLabel: `${cat}##${tag}`})
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
  let countLimit =  maxCount * 0.16
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
  dialogVisibleGraph.value = true
  nextTick(()=>{
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
    graph.data({nodes: tagNodeData, edges})
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
      _.find(tagNodeData, {id: model.id}).size = 270
      let size = 270
      states.forEach((state)=>{
        if (state === 'click') {
          clicked = true
          size = model.oriSize
          _.find(tagNodeData, {id: model.id}).size = model.oriSize
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
}

const geneRecommend = (chinese = false, type = 'exhentai') => {
  let tagGroup2 = _.filter(tagNodeData, n=>n.size >= 270)
  let tagGroup3 = tagGroup2
  if (type === 'exhentai') {
    ipcRenderer.invoke('open-url', `https://exhentai.org/?f_search=${tagGroup3.map(n=>n.name).join(' ')}${chinese?' l:chinese$':''}`)
  } else {
    dialogVisibleGraph.value = false
    emit('search', `${tagGroup3.map(n=>n.shortName).join(' ')}`)
  }
}
const destroyCanvas = () => {
  document.querySelector('#tag-graph canvas').remove()
}

defineExpose({
  dialogVisibleGraph,
  displayTagGraph
})

</script>

<style lang="stylus">
#tag-graph
  width: 100%
  height: calc(100vh - 210px)
</style>