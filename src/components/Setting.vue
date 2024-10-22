<template>
  <el-dialog v-model="dialogVisibleSetting"
    width="54em"
    :modal="false"
    append-to-body
    top="60px"
    class="setting-dialog"
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
              <el-input v-model="setting.metadataPath" :placeholder="$t('m.metadataPathDefault')">
                <template #prepend><span class="setting-label">{{$t('m.metadataPath')}}</span></template>
                <template #append><el-button @click="selectMetadataPath">{{$t('m.select')}}</el-button></template>
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
          <el-col :span="24" class="setting-switch">
            <el-switch
              v-model="setting.hidePageNumber"
              :active-text="$t('m.hidePageNumber')"
              @change="saveSetting"
            />
          </el-col>
          <el-col :span="24" class="setting-switch">
            <el-switch
              v-model="setting.keepReadingProgress"
              :active-text="$t('m.keepReadingProgress')"
              @change="saveSetting"
            />
          </el-col>
          <el-col :span="24" class="setting-switch">
            <el-switch
              v-model="setting.reverseLeftRight"
              :active-text="$t('m.reverseLeftRight')"
              @change="saveSetting"
            />
          </el-col>
          <el-col :span="24" class="setting-switch">
            <el-switch
              v-model="setting.autoNextManga"
              :active-text="$t('m.autoNextManga')"
              @change="saveSetting"
            />
          </el-col>
          <el-col :span="24" class="setting-switch">
            <el-switch
              v-model="setting.defaultInsertEmptyPage"
              :active-text="$t('m.defaultInsertEmptyPage')"
              @change="saveSetting"
            />
          </el-col>
        </el-row>
      </el-tab-pane>
      <el-tab-pane :label="$t('m.collectTag')" name="collectTag">
        <el-row :gutter="8">
          <el-col :span="24" class="setting-line collect-tag">
            <draggable
              v-model="setting.collectTag"
              item-key="id"
              animation="200"
              @change="saveSetting"
            >
              <template #item="{element}">
                <el-tag :color="element.color" effect="dark" closable @close="removeTag(element.id)">
                  {{element.letter}}:{{resolvedTranslation[element.tag]?.name || element.tag}}
                </el-tag>
              </template>
            </draggable>
          </el-col>
          <el-col :span="24" class="setting-line collect-tag">
            <el-form :inline="true" :model="formTagAdd" :show-message="false">
              <el-form-item :label="$t('m.tag')">
                <el-select-v2
                  v-model="formTagAdd.tag"
                  filterable clearable :height="340"
                  style="width: 500px"
                  :options="tagListForCollect"
                ></el-select-v2>
              </el-form-item>
              <el-form-item :label="$t('m.tagColor')">
                <el-color-picker v-model="formTagAdd.color" show-alpha :predefine="moderateSoftColors"/>
              </el-form-item>
              <el-form-item>
                <el-button plain @click="addTagToCollect">{{$t('m.addTag')}}</el-button>
              </el-form-item>
            </el-form>
          </el-col>
          <el-col :span="24" class="setting-switch">
            <el-switch
              v-model="setting.showCollectTag"
              :active-text="$t('m.showCollectTag')"
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
                    <el-option label="zh-TW" value="zh-TW"></el-option>
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
              <el-input class="label-input">
                <template #prepend><span class="setting-label">{{$t('m.defaultScraper')}}</span></template>
                <template #append>
                  <el-select v-model="setting.defaultScraper" @change="saveSetting">
                    <el-option v-for="searchType in searchTypeList" :key="searchType.value" :label="searchType.label" :value="searchType.value" />
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
            <div class="setting-line regexp">
              <el-input v-model="setting.trimTitleRegExp" :placeholder="$t('m.trimTitleRegExpInfo')" @change="saveSetting">
                <template #prepend><span class="setting-label">{{$t('m.trimTitleRegExp')}}</span></template>
              </el-input>
            </div>
          </el-col>
          <el-col :span="24">
            <div class="setting-line regexp">
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
          <el-col :span="24">
            <NameFormItem class="setting-line" prependWidth="110px">
              <template #prepend>{{$t('m.customCss')}}</template>
              <template #default>
                <el-input v-model="setting.customCss" :placeholder="$t('m.customCssPlaceholder')" @change="saveSetting" :rows="2" type="textarea"></el-input>
              </template>
            </NameFormItem>
          </el-col>
          <el-col :span="4">
            <div class="setting-line">
              <el-popconfirm
                placement="top-start"
                :title="$t('m.rebuildWarning')"
                @confirm="$emit('forceGeneBookList')"
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
                @confirm="$emit('patchLocalMetadata')"
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
              <el-button class="function-button" type="primary" plain @click="$emit('importMetadataFromSqlite')">{{$t('m.importMetadataFromSqlite')}}</el-button>
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
              v-model="setting.startOnLogin"
              :active-text="$t('m.startOnLogin')"
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
          <el-col :span="6" class="setting-switch">
            <el-switch
              v-model="setting.enabledLANBrowsing"
              :active-text="$t('m.enabledLANBrowsing')"
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
          <el-col :span="12" class="setting-switch">
            <el-switch
              v-model="setting.onlyGetMetadataOfSelectedFolder"
              :active-text="$t('m.onlyGetMetadataOfSelectedFolder')"
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
              v-model="setting.skipDeleteConfirm"
              :active-text="$t('m.skipDeleteConfirm')"
              @change="saveSetting"
            />
          </el-col>
          <el-col :span="6" class="setting-switch">
            <el-switch
              v-model="setting.disableRandomTag"
              :active-text="$t('m.disableRandomTag')"
              @change="saveSetting"
            />
          </el-col>
        </el-row>
      </el-tab-pane>
      <el-tab-pane :label="$t('m.accelerator')" name="accelerator">
        <el-descriptions
          :column="2" size="small" style="margin-top: 16px;"
          v-for="group in acceleratorInfo" :key="group.group"
          :title="$t(`ac.${group.group}`)"
        >
          <el-descriptions-item v-for="(value, key) in group.accelerators" :key="value" width="22em">
            <template #label><span style="display: inline-block; min-width: 10em;">{{ $t(`ac.${group.group}_${key}`) }}</span></template>
            <el-tag>{{ value }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
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
            <a v-if="['zh-CN', 'zh-TW'].includes($i18n.locale)" href="#" @click="openLink('https://github.com/SchneeHertz/exhentai-manga-manager/wiki/中文说明')">github wiki</a>
            <a v-else href="#" @click="openLink('https://github.com/SchneeHertz/exhentai-manga-manager/wiki/English-Instruction')">github wiki</a>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('m.donation')+':'">
            <a v-if="['zh-CN', 'zh-TW'].includes($i18n.locale)" href="#" @click="openLink('https://afdian.com/a/SeldonHorizon')">爱发电</a>
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
</template>

<script setup>
import { ref, onMounted, h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'

import { version } from '../../package.json'
import { gh_token } from '../../secret_key.json'
import { acceleratorInfo } from '../utils.js'
import NameFormItem from './NameFormItem.vue'

const { t } = useI18n()

const props = defineProps(['searchTypeList', 'tagListRaw', 'resolvedTranslation'])

const emit = defineEmits([
  'updateSetting',
  'handleLanguageSet',
  'message',
  'forceGeneBookList',
  'patchLocalMetadata',
  'importMetadataFromSqlite',
  'handleResolveTranslationUpdate'
])

const setting = ref({})
onMounted(() => {
  ipcRenderer.invoke('load-setting')
    .then(async (res) => {
      setting.value = res

      // set default value
      if (res.autoCheckUpdates === undefined) setting.value.autoCheckUpdates = true
      if (res.trimTitleRegExp === undefined) setting.value.trimTitleRegExp = '^\\d+[-]?\\s*|\\s*(\\[[^\\]]*\\]|\\([^\\)]*\\)|【[^】]*】|（[^）]*）)\\s*'
      if (res.defaultScraper === undefined) setting.value.defaultScraper = 'exhentai'
      if (res.defaultInsertEmptyPage === undefined) setting.value.defaultInsertEmptyPage = true
      saveSetting()

      // default action
      if (res.theme) changeTheme(res.theme)
      handleLanguageChange(res.language)
      if (res.showTranslation) loadTranslationFromEhTagTranslation()
      if (res.autoCheckUpdates) autoCheckUpdates(false)
      if (res.enabledLANBrowsing) ipcRenderer.invoke('enable-LAN-browsing')
      if (res.customCss) electronFunction['insert-css'](res.customCss)
    })
})

const selectLibraryPath = () => {
  ipcRenderer.invoke('select-folder', t('m.library'))
  .then(res => {
    if (res) {
      setting.value.library = res
      saveSetting()
    }
  })
}

const selectMetadataPath = () => {
  ipcRenderer.invoke('select-folder', t('m.metadataPath'))
  .then(res => {
    setting.value.metadataPath = res
    saveSetting()
  })
}

const selectImageExplorerPath = () => {
  ipcRenderer.invoke('select-file', t('m.imageViewer'))
  .then(res => {
    if (res) {
      setting.value.imageExplorer = `"${res}"`
      saveSetting()
    }
  })
}

const loadTranslationFromEhTagTranslation = async () => {
  const resultObject = {}
  emit('handleResolveTranslationUpdate', JSON.parse(localStorage.getItem('translationCache') || "{}"))
  await fetch('https://github.com/EhTagTranslation/Database/releases/latest/download/db.text.json')
  .then(res => res.json())
  .then(res => {
    const sourceTranslationDatabase = res.data
    _.forIn(sourceTranslationDatabase, cat => {
      _.forIn(cat.data, (value, key) => {
        resultObject[key] = _.pick(value, ['name', 'intro'])
      })
    })
    emit('handleResolveTranslationUpdate', resultObject)
    localStorage.setItem('translationCache', JSON.stringify(resultObject))
  })
  .catch((error) => {
    console.log(error)
    emit('message', 'warning', t('c.useTranslationCache'))
  })
}

const handleTranslationSettingChange = (val) => {
  if (val) {
    loadTranslationFromEhTagTranslation()
  } else {
    emit('handleResolveTranslationUpdate', {})
  }
  saveSetting()
}

const testProxy = async () => {
  await fetch('https://e-hentai.org')
  .then((res) => {
    if (res.status === 200) {
      emit('message', 'success', t('c.proxyWorking'))
    } else {
      emit('message', 'error', `Error ${res.status}: ` + t('c.proxyNotWorking'))
    }
  })
  .catch((error) => {
    emit('message', 'error', t('c.proxyNotWorking'))
  })
}

const autoCheckUpdates = async (forceShowDialog) => {
  await fetch('https://api.github.com/repos/SchneeHertz/exhentai-manga-manager/releases/latest', {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + gh_token,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  .then(res => res.json())
  .then(res => {
    const { tag_name, html_url, body } = res
    const skipVersion = localStorage.getItem('skipVersion')
    if (tag_name && tag_name !== 'v' + version && tag_name !== skipVersion) {
      ElMessageBox.confirm(
        h('pre', { innerHTML: body, style: 'font-family: Avenir, Helvetica, Arial, sans-serif'}),
        t('c.newVersion') + tag_name,
        {
          distinguishCancelAndClose: true,
          confirmButtonText: t('c.downloadUpdate'),
          cancelButtonText: t('c.skipVersion')
        }
      )
      .then(() => {
        ipcRenderer.invoke('open-url', html_url)
      })
      .catch((action) => {
        if (action === 'cancel') {
          localStorage.setItem('skipVersion', tag_name)
        }
      })
    } else if (forceShowDialog) {
      ElMessageBox.confirm(
        t('c.notNewVersion'),
        {
          type: 'info',
          showCancelButton: false
        }
      )
    }
  })
}

const handleThemeChange = (val) => {
  changeTheme(val)
  saveSetting()
}
const changeTheme = (classValue) => {
  document.documentElement.setAttribute('class', classValue)
}
const handleLanguageChange = (val) => {
  ipcRenderer.invoke('get-locale').then(localeString => {
    let languageCode
    if (!val || (val === 'default')) {
      languageCode = localeString
    } else {
      languageCode = val
    }
    emit('handleLanguageSet', languageCode)
    saveSetting()
  })
}

const saveSetting = () => {
  emit('updateSetting', setting.value)
  ipcRenderer.invoke('save-setting', _.cloneDeep(setting.value))
}

const openLink = (link) => {
  ipcRenderer.invoke('open-url', link)
}


const exportDatabase = async () => {
  const folder = await ipcRenderer.invoke('select-folder', t('c.exportFolder'))
  await ipcRenderer.invoke('export-database', folder)
  emit('message', 'success', t('c.exportMessage'))
}

const importDatabase = async () => {
  const collectionListPath = await ipcRenderer.invoke('select-file', t('c.selectCollectionList'))
  const metadataSqlitePath = await ipcRenderer.invoke('select-file', t('c.selectMetadataSqlite'))
  await ipcRenderer.invoke('import-database', {collectionListPath, metadataSqlitePath})
  emit('message', 'success', t('c.importMessage'))
}

const formTagAdd = ref({
  tag: null,
  color: '#42A5F5'
})

const tagListForCollect = computed(() => {
  if (setting.value.showTranslation) {
    return props.tagListRaw.map(({letter, cat, tag, id}) => {
      const labelHeader = cat === 'group' ? '团队' : props.resolvedTranslation[cat]?.name || cat
      const labelTail = props.resolvedTranslation[tag]?.name || tag
      return {
        label: `${labelHeader}:${labelTail} || ${letter}:"${tag}"$`,
        value: id
      }
    })
  } else {
    return props.tagListRaw.map(({letter, cat, tag, id}) => {
      return {
        label: `${cat}:${tag} || ${letter}:"${tag}"$`,
        value: id
      }
    })
  }
})

const moderateSoftColors = [
  '#FF6F61', // 略微柔和但鲜艳的珊瑚红
  '#F48FB1', // 鲜明的粉红色
  '#42A5F5', // 鲜艳的蓝色
  '#66BB6A', // 鲜艳的绿色
  '#FFCA28', // 亮黄色
  '#AB47BC', // 鲜亮的紫色
  '#26A69A', // 热带青色
  '#FFA726', // 鲜亮的橙色
  '#8D6E63', // 保存自然的棕色
  '#78909C'  // 鲜明的灰蓝色
]

const addTagToCollect = () => {
  const tag = props.tagListRaw.find(tag => tag.id === formTagAdd.value.tag)
  if (!setting.value.collectTag) setting.value.collectTag = []
  setting.value.collectTag.push({
    id: tag.id,
    letter: tag.letter,
    cat: tag.cat,
    tag: tag.tag,
    color: formTagAdd.value.color
  })
  setting.value.collectTag = _.uniqBy(setting.value.collectTag, 'id')
  formTagAdd.value.tag = null
  saveSetting()
}

const removeTag = (id) => {
  setting.value.collectTag = setting.value.collectTag.filter(tag => tag.id !== id)
  saveSetting()
}

const dialogVisibleSetting = ref(false)
const activeSettingPanel = ref('general')

defineExpose({
  dialogVisibleSetting,
  activeSettingPanel
})

</script>

<style lang="stylus">
.setting-title
  margin:0
  text-align: center
.setting-line
  margin: 6px 0
  .el-input-group__prepend
    width: 110px
.setting-line.regexp
  .el-input__inner
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace
.setting-line.collect-tag
  .el-form-item
    margin-bottom: 0
  .el-tag
    margin-right: 8px
    margin-bottom: 8px
    border-width: 0
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
</style>