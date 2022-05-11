# exhentai-manga-manager

![cover.png](https://raw.githubusercontent.com/SchneeHertz/exhentai-manga-manager/master/cover.png)  
管理从E-Hentai下载的短篇漫画

功能:
- 从一个文件夹建立漫画库
- 从漫画的压缩包中提取封面，然后批量从E-Hentai获取漫画的标签
- 编辑标签
- 基于标签，漫画名的搜索
- 关联外部图片浏览器


开发过程:
- 陈列漫画
  - vite vue element-plus
  - electron electron
  - adm-zip sharp
- 从eh数据库获取标签
  - EHwiki API [File Hash Search](https://e-hentai.org/?f_shash=SHA1_Hash)
  - EHwiki API [Get MetaData](https://api.e-hentai.org/api.php)
- 标签管理
  - 标签展示
  - 标签数据保存
- 搜索功能
  - 关键字搜索
  - 点击标签搜索
- 设置页面
  - 设置
  - 分页
  - 批量获取标签
  - 编辑标签

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar)
