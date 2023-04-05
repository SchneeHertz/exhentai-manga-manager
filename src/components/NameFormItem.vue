<template>
  <div :style="initStyle" class="name-form-item">
    <div
      class="name-select__prepend"
      v-if="$slots.prepend"
      :style="{'min-width': prependWidth}"
    >
      <slot name="prepend"></slot>
    </div>
    <div class="name-select__body">
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

<script>
export default {
  name: 'NameFormItem',
  props: {
    initStyle: Object,
    prependWidth: {
      type: String,
      default: ()=>'4em'
    },
    appendWidth: {
      type: String,
      default: ()=>'4em'
    }
  }
}
</script>

<style lang="stylus" scoped>
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
  border-style: solid
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
.name-select__body
  .el-input__inner, .el-textarea__inner
    border-bottom-left-radius: 0
    border-top-left-radius: 0
</style>