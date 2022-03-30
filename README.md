# 干净阅读 核心阅读器

这里是 [干净阅读](https://www.microsoft.com/store/apps/9MV65L2XFCSK) 的阅读器。新版的干净阅读使用 [epub.js](https://github.com/futurepress/epub.js/) 作为渲染工具。

## 本地运行

这个阅读器使用 vite + vue + typescript 构建，是一个完全的前端项目。

在 Clone 仓库后，在项目目录下运行命令 ：`yarn` 或 `npm i`

在必要的依赖加载完毕后，使用 `yarn dev` 或 `npm run dev` 本地运行，项目会使用 `http://localhost:3000`。

如果你想测试 epub 的效果，在浏览器控制台执行脚本 `window.reader.exposed.setBook('test.epub')` 就可以打开位于 assets 目录下的 test.epub
