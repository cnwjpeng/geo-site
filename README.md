# geo-site — 闻见AI 官网前端

`geo.fqlx0518.cn` 官网的完整前端静态站点源码。

## 技术栈

纯静态站点：原生 HTML + CSS + JavaScript，无构建步骤、无框架依赖，直接由 Nginx 托管即可。

## 目录结构

```
.
├── index.html                 # 首页
├── whitepaper.html            # 技术白皮书
├── faq.html                   # 常见问题
├── pricing/                   # 报价方案页（含 echarts.min.js）
├── contract.html              # 合同页
├── knowledge.html / kb.html   # 知识库
├── audit.html                 # 体检/审计
├── demo/                      # 演示视频与样例报告
├── assets/                    # 图标、Logo
├── img/                       # 图片与插图
├── metrics/                   # 指标数据
├── kb/                        # 知识库数据文件
├── private/                   # 内部材料页
├── style.css / atlas.css      # 主样式
├── theme-*.css                # 多套主题样式
├── app.js                     # 页面脚本
├── track.js                   # 埋点上报（POST /api/track）
├── theme-toggle.js            # 主题切换
├── sitemap.xml / robots.txt   # 搜索引擎配置
└── llms.txt                   # LLM 可读说明
```

## 本地预览

无需安装依赖，直接打开 `index.html` 即可浏览页面。

注意：`track.js` 的点击上报会请求 `/api/track`，本地无后端时该上报不生效，页面显示不受影响。

## 部署

把本目录全部文件同步到站点根目录，Nginx 指向该目录即可。

```bash
rsync -av --delete ./ user@host:/path/to/webroot/
```

## 版本与校验

当前内容对应线上 v3 部署状态。关键文件 sha256：

| 文件 | sha256 |
| --- | --- |
| whitepaper.html | `b50d86538af2f1cdfda26c9e506f538ed2bc12ff5bcfb4b8ec050708bfb0b91c` |
| faq.html | `165b29925d22d513bd8a6b2dc5827e1db6aee1b097770aad491152ab3d929535` |
| robots.txt | `18d7c99ca676a86ee82edb8842495c2ec7ec034bc2a8036609a8d04a4d1ad9fe` |

## 说明

仓库已排除历史备份（`*.bak*`、`_bak_*`）、macOS 元数据（`._*`、`.DS_Store`）与依赖目录，详见 `.gitignore`。
