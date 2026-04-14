# Learn Claude

`learn-claude` 是一个面向 Claude Code 源码学习的前端交互项目，目标是把底层执行原理、工具调用链路、上下文组装与权限校验过程，用可视化页面讲清楚。

当前项目已经不再是默认的 Vite 模板，而是一个基于 React + TypeScript + Vite 构建的学习型课程界面。

## 当前已实现

### 1. 核心理解页

路由：`/architecture`

对应代码：
- `src/pages/Architecture.tsx`
- `src/pages/ArchitectureFlow.tsx`

页面能力：
- 左侧执行图时间线，支持点击单步查看
- 开始播放 / 重置流程动画
- 右侧 Claude Code 总架构图
- 左右联动高亮：点击或自动播放左侧步骤时，右侧相关节点与连线同步高亮
- `Parse` 节点使用单独的菱形高亮样式，而不是矩形容器高亮
- 支持架构图全屏查看
- 支持浏览器原生语音朗读开关
- 语音开启时，自动播放会在当前标题朗读完成后再进入下一步
- 语音关闭时，自动播放仍保持原有固定节奏

当前执行图示例覆盖了一个比较完整的 Claude Code 工作闭环：
- 接收“从头写一个登录注册系统，支持第三方谷歌登录”的真实需求
- 组装上下文
- 通过 `AgentTool` 并行调研仓库
- 通过 `WebSearchTool` / `WebFetchTool` 查询 Google 登录资料
- 形成实现计划
- 调用文件工具写入代码
- 经过权限系统校验
- 通过 `BashTool` 执行编译与测试
- 将测试失败结果回注后再次调用 Claude API 分析
- 调用工具修复代码
- 再次测试并最终交付

### 2. 读懂 Claude 页

路由：`/quick-start`

对应代码：
- `src/pages/QuickStart.tsx`
- `src/components/Mermaid.tsx`
- `public/docs/quick-start.md`

页面能力：
- 从 `public/docs/quick-start.md` 动态加载 Markdown 内容
- 使用 `react-markdown` 渲染文档
- 支持 GitHub Flavored Markdown
- 支持原始 HTML
- 支持 Mermaid 图表渲染
- Mermaid 图支持缩放、拖拽与重置视图

### 3. 导航与布局

对应代码：
- `src/App.tsx`
- `src/components/Sidebar.tsx`

当前结构：
- 左侧可折叠侧边栏
- 默认首页重定向到 `/architecture`
- 当前有两个主入口：
  - `核心理解`
  - `读懂 Claude`

## 技术栈

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS v4
- `@xyflow/react` 用于架构图和节点连线
- `dagre` 用于自动布局
- `react-markdown` + `remark-gfm` + `rehype-raw` 用于 Markdown 文档渲染
- `mermaid` + `react-zoom-pan-pinch` 用于可交互图表
- `lucide-react` 用于图标

## 目录结构

```text
learn-claude/
├─ public/
│  ├─ assets/
│  └─ docs/
│     └─ quick-start.md
├─ src/
│  ├─ components/
│  │  ├─ Mermaid.tsx
│  │  └─ Sidebar.tsx
│  ├─ pages/
│  │  ├─ Architecture.tsx
│  │  ├─ ArchitectureFlow.tsx
│  │  └─ QuickStart.tsx
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ index.css
├─ package.json
└─ README.md
```

## 本地运行

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

生产构建：

```bash
npm run build
```

本地预览构建结果：

```bash
npm run preview
```

## 开发说明

- 当前 README 只描述代码里已经存在的功能，不预写未实现规划
- `ArchitectureFlow.tsx` 是当前项目最核心的交互页面，集中了执行图、架构图、联动动画与语音逻辑
- `QuickStart.tsx` 适合作为 Markdown 课程页继续扩展
- 如果继续新增课程页面，建议沿用现有的侧边栏路由结构

## 后续可扩展方向

这些方向适合后续继续开发，但当前代码未全部实现：
- 增加更多 Claude Code 原理专题页
- 为执行图加入暂停 / 继续播放
- 为语音功能增加语速控制
- 将更多源码解析文档接入 Markdown 页面
