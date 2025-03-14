# 贡献指南

感谢您对 ExHentai Manga Manager 项目的关注！这份文档将指导您如何为项目做出贡献。

## 项目结构

在开始贡献之前，请先了解项目的基本结构：
- `index.js` - Electron 主进程入口
- `preload.js` - Electron 预加载脚本
- `/src` - Vue 前端代码
- `/modules` - 核心功能模块
- `/fileLoader` - 文件加载处理模块

## 开发环境设置

### 前提条件
- Node.js (推荐 v20 或更高版本)
- npm
- Git

### 设置步骤
1. Fork 这个仓库并克隆到本地：
   ```bash
   git clone https://github.com/SchneeHertz/exhentai-manga-manager.git
   cd exhentai-manga-manager
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动开发服务器：
   ```bash
   # 启动 Vite 开发服务器
   npm run dev

   # 在另一个终端中启动 Electron
   npm run start
   ```

## 开发指南

### 目录结构习惯
- 前端 Vue 组件放在 `/src/components` 下
- 全局状态管理使用 Pinia，存储在 `/src/pinia.js`
- 本地化文件放在 `/src/locales`

### 代码风格
- 使用 ESLint 进行代码检查
- 使用 2 空格缩进，不使用分号
- 使用单引号
- 组件名使用 PascalCase
- 变量使用 camelCase
- 保持代码简洁清晰，添加必要注释

## 提交流程

1. 创建新分支：
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. 进行更改并测试

3. 提交更改：
   ```bash
   git commit -m "feat: add some feature"
   ```
   请遵循以下提交格式：
   - `feat:` 新功能
   - `fix:` 修复 bug
   - `docs:` 文档更改
   - `style:` 不影响代码运行的格式修改
   - `refactor:` 代码重构
   - `perf:` 性能优化
   - `test:` 测试相关
   - `chore:` 构建过程或辅助工具的变动

4. 推送到您的 Fork：
   ```bash
   git push origin feature/your-feature-name
   ```

5. 创建 Pull Request

## 构建应用

```bash
# 构建前端和 Electron 应用
npm run dist
```

这个命令会自动生成更新日志、构建前端应用并使用 electron-builder 打包桌面应用。

## 测试

在提交 PR 前，请确保：
1. 应用能正常启动
2. 新功能正常运行
3. 没有引入新的 bug

## 报告 Bug

如发现 Bug，请创建 Issue 并提供以下信息：
- 复现步骤
- 期望行为
- 实际行为
- 系统环境和应用版本
- 截图（如适用）

## 功能请求

如需提出新功能，请创建 Issue 描述：
- 新功能的详细介绍
- 为什么这个功能对项目有帮助
- 如何实现（如果您有想法）

## 资源

- [项目 README](https://github.com/SchneeHertz/exhentai-manga-manager#readme)
- [Vue 3 文档](https://vuejs.org/)
- [Electron 文档](https://www.electronjs.org/docs)
- [Element Plus 文档](https://element-plus.org/)

感谢您的贡献！