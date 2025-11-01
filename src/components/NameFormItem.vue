<template>
  <div :style="initStyle" class="name-form-item">
    <div
      class="name-select__prepend"
      v-if="$slots.prepend"
      :style="{'min-width': prependWidth}"
    >
      <slot name="prepend"></slot>
    </div>
    <div class="name-select__body" :class="inputWrapperClass">
      <slot></slot>
    </div>
    <div
      class="name-select__append"
      v-if="$slots.append"
      :style="{'min-width': appendWidth}"
    >
      <slot name="append"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'

defineProps({
  initStyle: Object,
  prependWidth: {
    type: String,
    default: () => '4em'
  },
  appendWidth: {
    type: String,
    default: () => '4em'
  }
})

const slots = useSlots()

const inputWrapperClass = computed(() => {
  return {
    'has-prepend': !!slots.prepend,
    'has-append': !!slots.append,
  }
})
</script>

<style lang="stylus">
.name-form-item
  font-size: 14px
.name-select__prepend
  background-color: var(--el-fill-color-light)
  color: var(--el-color-info)
  vertical-align: middle
  text-align: center
  display: table-cell
  position: relative
  border-width: 1px
  box-shadow: 1px 0 0 0 grey inset,0 1px 0 0 grey inset,0 -1px 0 0 grey inset
  border-color: var(--el-border-color)
  border-radius: 4px
  border-right: 0
  border-top-right-radius: 0
  border-bottom-right-radius: 0
  padding: 0 20px
  white-space: nowrap
.name-select__body
  display: table-cell
  width: 100%
  .el-select__wrapper
    border-top-left-radius: 0
    border-bottom-left-radius: 0
.name-select__append
  background-color: var(--el-fill-color-light)
  color: var(--el-color-info)
  vertical-align: middle
  text-align: center
  display: table-cell
  position: relative
  border-width: 1px
  border-style: solid
  border-color: var(--el-border-color)
  border-radius: 4px
  border-left: 0
  border-top-left-radius: 0
  border-bottom-left-radius: 0
  padding: 0 20px
  white-space: nowrap
</style>

<style lang="stylus">
.name-select__body.has-prepend .el-input__inner,
.name-select__body.has-prepend .el-textarea__inner
  border-top-left-radius: 0
  border-bottom-left-radius: 0

.name-select__body.has-append .el-input__inner,
.name-select__body.has-append .el-textarea__inner
  border-top-right-radius: 0
  border-bottom-right-radius: 0
</style>