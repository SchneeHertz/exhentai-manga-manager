import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';


export default [
  { files: ['**/*.{js,mjs,cjs,vue}'] },
  { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
  { languageOptions: { globals: globals.browser } },
  ...pluginVue.configs['flat/essential'],
  {
    rules: {
      'no-const-assign': 'error',
      'vue/multi-word-component-names': ['error', {
        'ignores': ['Setting', 'Graph']
      }]
    }
  },
]